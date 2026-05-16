import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PersonalDetailService } from './personal_details.service';
import { AcademicDetailService } from './academic_details.service';
import { FamilyService } from './family.service';
import { EducationService } from './education.service';
import { ApplicationSubmissionService } from './application_submission.service';
import { UserService } from '../../user/user.service';
import { SubmitApplicationDto } from '../dto/submit-application.dto';
import { ApplicationStatus } from '../entities/application_submission.entity';
import { EducationLevel } from '../entities/education.entity';
import { PersonalDetails } from '../entities/personal_details.entity';
import { AcademicDetails } from '../entities/academic_details.entity';
import { Family } from '../entities/family.entity';
import { Education } from '../entities/education.entity';

@Injectable()
export class ReviewService {
  constructor(
    @Inject(forwardRef(() => PersonalDetailService))
    private readonly personalDetailService: PersonalDetailService,
    @Inject(forwardRef(() => AcademicDetailService))
    private readonly academicDetailService: AcademicDetailService,
    @Inject(forwardRef(() => FamilyService))
    private readonly familyService: FamilyService,
    @Inject(forwardRef(() => EducationService))
    private readonly educationService: EducationService,
    @Inject(forwardRef(() => ApplicationSubmissionService))
    private readonly submissionService: ApplicationSubmissionService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}

  // ========== GET COMPLETE APPLICATION ==========
  async getCompleteApplication(userId: string) {
    const [personalDetails, academicDetails, familyDetails, education] = await Promise.all([
      this.personalDetailService.findByUserId(userId).catch(() => null),
      this.academicDetailService.findByUserId(userId).catch(() => null),
      this.familyService.findByUserId(userId).catch(() => null),
      this.educationService.findByUserId(userId).catch((): Education[] => []),
    ]);

    const totalSections = 4;
    let completedSections = 0;
    const missingSections: string[] = [];

    if (personalDetails) completedSections++;
    else missingSections.push('Personal Details');

    if (academicDetails) completedSections++;
    else missingSections.push('Academic Details');

    if (familyDetails) completedSections++;
    else missingSections.push('Family Details');

    if (education && education.length > 0) completedSections++;
    else missingSections.push('Education Information');

    const completionPercentage = (completedSections / totalSections) * 100;

    return {
      success: true,
      data: {
        personalDetails,
        academicDetails,
        familyDetails,
        education: {
          primary: education.filter(e => e.educationLevel === 'primary'),
          secondary: education.filter(e => e.educationLevel === 'secondary'),
          tertiary: education.filter(e => e.educationLevel === 'tertiary'),
        },
      },
      metadata: {
        completionPercentage,
        completedSections,
        totalSections,
        missingSections,
        lastUpdated: new Date(),
      },
    };
  }

  // ========== VALIDATE APPLICATION COMPLETENESS ==========
  async validateApplicationCompleteness(userId: string): Promise<{
    isComplete: boolean;
    missingSections: string[];
    missingFields: { section: string; fields: string[] }[];
  }> {
    const missingSections: string[] = [];
    const missingFields: { section: string; fields: string[] }[] = [];

    try {
      const personal = await this.personalDetailService.findByUserId(userId);
      const personalMissingFields = this.validatePersonalDetails(personal);
      if (personalMissingFields.length > 0) {
        missingFields.push({ section: 'Personal Details', fields: personalMissingFields });
      }
    } catch (error) {
      missingSections.push('Personal Details');
    }

    try {
      const academic = await this.academicDetailService.findByUserId(userId);
      const academicMissingFields = this.validateAcademicDetails(academic);
      if (academicMissingFields.length > 0) {
        missingFields.push({ section: 'Academic Details', fields: academicMissingFields });
      }
    } catch (error) {
      missingSections.push('Academic Details');
    }

    try {
      const family = await this.familyService.findByUserId(userId);
      const familyMissingFields = this.validateFamilyDetails(family);
      if (familyMissingFields.length > 0) {
        missingFields.push({ section: 'Family Details', fields: familyMissingFields });
      }
    } catch (error) {
      missingSections.push('Family Details');
    }

    const education = await this.educationService.findByUserId(userId);
    if (!education || education.length === 0) {
      missingSections.push('Education Information');
    } else {
      for (const edu of education) {
        const eduMissingFields = this.validateEducationRecord(edu);
        if (eduMissingFields.length > 0) {
          missingFields.push({ 
            section: `Education (${edu.educationLevel})`, 
            fields: eduMissingFields 
          });
        }
      }
    }

    const isComplete = missingSections.length === 0 && missingFields.length === 0;

    return {
      isComplete,
      missingSections,
      missingFields,
    };
  }

  // ========== SUBMIT APPLICATION (WITH VALIDATION) ==========
  async validateAndSubmit(userId: string, applicationData: SubmitApplicationDto) {
    // 1. Validate all sections are present
    const validationErrors = this.validateCompleteApplication(applicationData);
    if (validationErrors.length > 0) {
      throw new BadRequestException({
        message: 'Application validation failed. Please fill all required fields.',
        errors: validationErrors,
      });
    }

    // 2. Check if user can submit
    const canSubmit = await this.submissionService.canUserSubmit(userId);
    if (!canSubmit.canSubmit) {
      throw new BadRequestException({
        message: canSubmit.message || 'You cannot submit an application at this time.',
      });
    }

    // 3. Save all data
    await this.savePersonalDetails(userId, applicationData.personal);
    await this.saveAcademicDetails(userId, applicationData.academic);
    await this.saveFamilyDetails(userId, applicationData.family);
    await this.saveEducationDetails(userId, applicationData.education);

    // 4. Mark as submitted
    const applicationReference = `APP-${Date.now()}-${userId.slice(0, 8)}`;
    const submission = await this.submissionService.markAsSubmitted(userId, applicationReference);

    return {
      success: true,
      message: 'Application submitted successfully!',
      applicationReference: submission.applicationReference,
      submittedAt: new Date(),
      applicationStatus: 'pending_review',
    };
  }

  // ========== SUBMIT APPLICATION (LEGACY - using DB data) ==========
  async submitApplication(userId: string) {
    const validation = await this.validateApplicationCompleteness(userId);
    
    if (!validation.isComplete) {
      throw new BadRequestException({
        message: 'Cannot submit application. Please complete all required sections.',
        missingSections: validation.missingSections,
        missingFields: validation.missingFields,
      });
    }

    const applicationData = await this.getCompleteApplication(userId);
    const applicationReference = `APP-${Date.now()}-${userId.slice(0, 8)}`;
    
    return {
      success: true,
      message: 'Application submitted successfully',
      applicationReference,
      submittedAt: new Date(),
      status: 'pending_review',
      data: applicationData.data,
    };
  }

  // ========== CHECK IF APPLICATION IS READY FOR SUBMISSION ==========
  async canSubmitApplication(userId: string): Promise<{
    canSubmit: boolean;
    completionPercentage: number;
    missingSections: string[];
    missingFields: { section: string; fields: string[] }[];
  }> {
    const validation = await this.validateApplicationCompleteness(userId);
    const application = await this.getCompleteApplication(userId);
    
    return {
      canSubmit: validation.isComplete,
      completionPercentage: application.metadata.completionPercentage,
      missingSections: validation.missingSections,
      missingFields: validation.missingFields,
    };
  }

  // ========== COMPLETE VALIDATION - CHECKS EVERY FIELD ==========
  private validateCompleteApplication(data: SubmitApplicationDto): string[] {
    const errors: string[] = [];

    // Personal Details Validation
    if (!data.personal) {
      errors.push('Personal details are required');
    } else {
      const p = data.personal;
      if (!p.firstName) errors.push('First name is required');
      if (!p.lastName) errors.push('Last name is required');
      if (!p.dateOfBirth) errors.push('Date of birth is required');
      if (!p.gender) errors.push('Gender is required');
      if (!p.maritalStatus) errors.push('Marital status is required');
      if (!p.nationalIdNumber) errors.push('National ID number is required');
      if (!p.phoneNumber) errors.push('Phone number is required');
      if (!p.homeDistrict) errors.push('Home district is required');
      if (!p.traditionalAuthority) errors.push('Traditional authority is required');
      if (!p.physicalAddress) errors.push('Physical address is required');
    }

    // Academic Details Validation
    if (!data.academic) {
      errors.push('Academic details are required');
    } else {
      const a = data.academic;
      if (!a.programOfStudy) errors.push('Program of study is required');
      if (!a.department) errors.push('Department is required');
      if (!a.yearOfStudy) errors.push('Year of study is required');
    }

    // Family Details Validation
    if (!data.family) {
      errors.push('Family details are required');
    } else if (data.family.hasParents !== false) {
      if (!data.family.parents) {
        errors.push('Parent information is required');
      } else {
        const parents = data.family.parents;
        if (!parents.motherFullName) errors.push('Mother\'s full name is required');
        if (!parents.motherOccupation) errors.push('Mother\'s occupation is required');
        if (!parents.motherPhone) errors.push('Mother\'s phone number is required');
        if (!parents.fatherFullName) errors.push('Father\'s full name is required');
        if (!parents.fatherOccupation) errors.push('Father\'s occupation is required');
        if (!parents.fatherPhone) errors.push('Father\'s phone number is required');
      }
    } else if (data.family.guarantor) {
      const guarantor = data.family.guarantor;
      if (!guarantor.guarantorFullName) errors.push('Guarantor full name is required');
      if (!guarantor.guarantorNationalId) errors.push('Guarantor national ID is required');
      if (!guarantor.guarantorPhone) errors.push('Guarantor phone number is required');
      if (!guarantor.guarantorAddress) errors.push('Guarantor address is required');
      if (!guarantor.relationshipToApplicant) errors.push('Relationship to applicant is required');
    } else {
      errors.push('Either parent or guarantor information is required');
    }

    // Education Validation
    if (!data.education) {
      errors.push('Education details are required');
    } else {
      if (!data.education.primary) {
        errors.push('Primary education details are required');
      } else {
        const primary = data.education.primary;
        if (!primary.schoolName) errors.push('Primary school name is required');
        if (primary.tuitionFees === undefined) errors.push('Primary tuition fee is required');
        if (!primary.yearCompleted) errors.push('Primary year completed is required');
        if (!primary.whoPaidFees) errors.push('Primary fee payer is required');
      }

      if (!data.education.secondary) {
        errors.push('Secondary education details are required');
      } else {
        const secondary = data.education.secondary;
        if (!secondary.schoolName) errors.push('Secondary school name is required');
        if (secondary.tuitionFees === undefined) errors.push('Secondary tuition fee is required');
        if (!secondary.yearCompleted) errors.push('Secondary year completed is required');
        if (!secondary.whoPaidFees) errors.push('Secondary fee payer is required');
      }
    }

    return errors;
  }

  // ========== VALIDATION METHODS ==========
  private validatePersonalDetails(personal: PersonalDetails): string[] {
    const missingFields: string[] = [];
    if (!personal.firstName) missingFields.push('First Name');
    if (!personal.lastName) missingFields.push('Last Name');
    if (!personal.phoneNumber) missingFields.push('Phone Number');
    if (!personal.nationalIdNumber) missingFields.push('National ID Number');
    if (!personal.homeDistrict) missingFields.push('Home District');
    if (!personal.traditionalAuthority) missingFields.push('Traditional Authority');
    if (!personal.physicalAddress) missingFields.push('Physical Address');
    if (!personal.dateOfBirth) missingFields.push('Date of Birth');
    if (!personal.registrationNumber) missingFields.push('Registration Number');
    return missingFields;
  }

  private validateAcademicDetails(academic: AcademicDetails): string[] {
    const missingFields: string[] = [];
    if (!academic.programOfStudy) missingFields.push('Program of Study');
    if (!academic.department) missingFields.push('Department');
    if (!academic.yearOfStudy) missingFields.push('Year of Study');
    return missingFields;
  }

  private validateFamilyDetails(family: Family): string[] {
    const missingFields: string[] = [];
    if (!family.guardianFirstName) missingFields.push('Guardian First Name');
    if (!family.guardianLastName) missingFields.push('Guardian Last Name');
    if (!family.profession) missingFields.push('Profession');
    if (!family.dateOfBirth) missingFields.push('Date of Birth');
    if (!family.residenceAddress) missingFields.push('Residence Address');
    return missingFields;
  }

  private validateEducationRecord(education: Education): string[] {
    const missingFields: string[] = [];
    if (!education.schoolName) missingFields.push('School Name');
    if (!education.tuitionFees) missingFields.push('Tuition Fees');
    if (!education.yearCompleted) missingFields.push('Year Completed');
    if (!education.whoPaidFees) missingFields.push('Who Paid Fees');
    return missingFields;
  }

  // ========== SAVE METHODS ==========
  private async savePersonalDetails(userId: string, data: any) {
    const personalData = {
      firstName: data.firstName,
      lastName: data.lastName,
      otherNames: data.otherNames,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      maritalStatus: data.maritalStatus,
      nationalIdNumber: data.nationalIdNumber,
      registrationNumber: data.registrationNumber,
      phoneNumber: data.phoneNumber,
      email: data.email,
      homeDistrict: data.homeDistrict,
      traditionalAuthority: data.traditionalAuthority,
      physicalAddress: data.physicalAddress,
      disability: data.disability,
      userId: userId,
    };
    
    const existing = await this.personalDetailService.findByUserId(userId).catch(() => null);
    if (existing) {
      await this.personalDetailService.update(existing.id, personalData);
    } else {
      await this.personalDetailService.create(userId, personalData);
    }
  }

  private async saveAcademicDetails(userId: string, data: any) {
    const academicData = {
      programOfStudy: data.programOfStudy,
      department: data.department,
      yearOfStudy: data.yearOfStudy,
      transcriptUrl: data.transcriptUrl,
      userId: userId,
    };
    
    const existing = await this.academicDetailService.findByUserId(userId).catch(() => null);
    if (existing) {
      await this.academicDetailService.update(existing.id, academicData);
    } else {
      await this.academicDetailService.create(userId, academicData);
    }
  }

  private async saveFamilyDetails(userId: string, data: any) {
    if (data.hasParents !== false && data.parents) {
      await this.familyService.createFromParents(userId, data.parents);
    } else if (data.guarantor) {
      await this.familyService.createFromGuarantor(userId, data.guarantor);
    }
  }

  private async saveEducationDetails(userId: string, data: any) {
    // Save Primary - use enum
    if (data.primary) {
      const existing = await this.educationService.findByLevel(userId, EducationLevel.PRIMARY);
      if (existing && existing.length > 0) {
        await this.educationService.update(existing[0].id, data.primary);
      } else {
        await this.educationService.createPrimary(userId, data.primary);
      }
    }

    // Save Secondary - use enum
    if (data.secondary) {
      const existing = await this.educationService.findByLevel(userId, EducationLevel.SECONDARY);
      if (existing && existing.length > 0) {
        await this.educationService.update(existing[0].id, data.secondary);
      } else {
        await this.educationService.createSecondary(userId, data.secondary);
      }
    }

    // Save Tertiary (optional) - use enum
    if (data.tertiary) {
      const existing = await this.educationService.findByLevel(userId, EducationLevel.TERTIARY);
      if (existing && existing.length > 0) {
        await this.educationService.update(existing[0].id, data.tertiary);
      } else {
        await this.educationService.createTertiary(userId, data.tertiary);
      }
    }
  }

  // ========== UPDATE METHODS ==========
  async updatePersonalDetails(userId: string, updateDto: any) {
    let personalDetails;
    try {
      personalDetails = await this.personalDetailService.findByUserId(userId);
    } catch (error) {
      return await this.personalDetailService.create(userId, updateDto);
    }
    return await this.personalDetailService.update(personalDetails.id, updateDto);
  }

  async updateAcademicDetails(userId: string, updateDto: any) {
    let academicDetails;
    try {
      academicDetails = await this.academicDetailService.findByUserId(userId);
    } catch (error) {
      return await this.academicDetailService.create(userId, updateDto);
    }
    return await this.academicDetailService.update(academicDetails.id, updateDto);
  }

  async updateFamilyDetails(userId: string, updateDto: any) {
    let familyDetails;
    try {
      familyDetails = await this.familyService.findByUserId(userId);
    } catch (error) {
      return await this.familyService.create(userId, updateDto);
    }
    return await this.familyService.update(familyDetails.id, updateDto);
  }

  async updateEducationRecord(educationId: string, userId: string, updateDto: any) {
    const education = await this.educationService.findOne(educationId);
    if (education.userId !== userId) {
      throw new BadRequestException('You can only update your own education records');
    }
    return await this.educationService.update(educationId, updateDto);
  }

  // ========== DELETE METHODS ==========
  async deletePersonalDetails(userId: string) {
    const personalDetails = await this.personalDetailService.findByUserId(userId);
    await this.personalDetailService.remove(personalDetails.id);
    return { success: true, message: 'Personal details deleted successfully' };
  }

  async deleteAcademicDetails(academicId: string, userId: string) {
    const academicDetails = await this.academicDetailService.findOne(academicId);
    if (academicDetails.userId !== userId) {
      throw new BadRequestException('You can only delete your own academic details');
    }
    await this.academicDetailService.remove(academicId);
    return { success: true, message: 'Academic details deleted successfully' };
  }

  async deleteFamilyDetails(userId: string) {
    const familyDetails = await this.familyService.findByUserId(userId);
    await this.familyService.remove(familyDetails.id);
    return { success: true, message: 'Family details deleted successfully' };
  }

  async deleteEducationRecord(educationId: string, userId: string) {
    const education = await this.educationService.findOne(educationId);
    if (education.userId !== userId) {
      throw new BadRequestException('You can only delete your own education records');
    }
    await this.educationService.remove(educationId);
    return { success: true, message: 'Education record deleted successfully' };
  }

  // ========== SUMMARY & SECTION DATA ==========
  async getApplicationSummary(userId: string) {
    const application = await this.getCompleteApplication(userId);
    const validation = await this.validateApplicationCompleteness(userId);
    
    return {
      summary: {
        hasPersonalDetails: !!application.data.personalDetails,
        hasAcademicDetails: !!application.data.academicDetails,
        hasFamilyDetails: !!application.data.familyDetails,
        hasEducation: application.data.education.primary.length > 0 || 
                      application.data.education.secondary.length > 0 || 
                      application.data.education.tertiary.length > 0,
        totalEducationRecords: 
          application.data.education.primary.length +
          application.data.education.secondary.length +
          application.data.education.tertiary.length,
      },
      completionStatus: {
        percentage: application.metadata.completionPercentage,
        isReadyForSubmission: validation.isComplete,
        missingSections: validation.missingSections,
      },
      lastUpdated: application.metadata.lastUpdated,
    };
  }

  async getSectionData(userId: string, section: string) {
    switch (section) {
      case 'personal':
        return await this.personalDetailService.findByUserId(userId);
      case 'academic':
        return await this.academicDetailService.findByUserId(userId);
      case 'family':
        return await this.familyService.findByUserId(userId);
      case 'education':
        return await this.educationService.findByUserId(userId);
      default:
        throw new BadRequestException(`Unknown section: ${section}`);
    }
  }

  // ========== BULK UPDATE ==========
  async bulkUpdate(userId: string, updateData: {
    personal?: any;
    academic?: any;
    family?: any;
    education?: any[];
  }) {
    const results: any = {};
    
    if (updateData.personal) {
      results.personal = await this.updatePersonalDetails(userId, updateData.personal);
    }
    
    if (updateData.academic) {
      results.academic = await this.updateAcademicDetails(userId, updateData.academic);
    }
    
    if (updateData.family) {
      results.family = await this.updateFamilyDetails(userId, updateData.family);
    }
    
    if (updateData.education && updateData.education.length > 0) {
      results.education = [];
      for (const edu of updateData.education) {
        if (edu.id) {
          results.education.push(await this.updateEducationRecord(edu.id, userId, edu));
        }
      }
    }
    
    return {
      success: true,
      message: 'Bulk update completed successfully',
      results,
    };
  }
}