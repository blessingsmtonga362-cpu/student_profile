// src/application/services/review.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonalDetailService } from './personal_details.service';
import { AcademicDetailService } from './academic_details.service';
import { FamilyService } from './family.service';
import { EducationService } from './education.service';
//import { StudentNotificationService } from '../../notification/service/studentNotification.service';
import { UserService } from '../../user/user.service';
import { PersonalDetails } from '../entities/personal_details.entity';
import { AcademicDetails } from '../entities/academic_details.entity';
import { Family } from '../entities/family.entity';
import { Education } from '../entities/education.entity';

@Injectable()
export class ReviewService {
  constructor(
    private readonly personalDetailService: PersonalDetailService,
    private readonly academicDetailService: AcademicDetailService,
    private readonly familyService: FamilyService,
    private readonly educationService: EducationService,
    //private readonly notificationService: StudentNotificationService,
    private readonly userService: UserService,
  ) {}

  // ========== GET COMPLETE APPLICATION ==========
  async getCompleteApplication(userId: string) {
    const [personalDetails, academicDetails, familyDetails, education] = await Promise.all([
      this.personalDetailService.findByUserId(userId).catch(() => null),
      this.academicDetailService.findByUserId(userId).catch(() => null),
      this.familyService.findByUserId(userId).catch(() => null),
      this.educationService.findByUserId(userId).catch(() => []),
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

  async submitApplication(userId: string) {
    // Validate completeness using user ID
    const validation = await this.validateApplicationCompleteness(userId);
    
    if (!validation.isComplete) {
      throw new BadRequestException({
        message: 'Cannot submit application. Please complete all required sections.',
        missingSections: validation.missingSections,
        missingFields: validation.missingFields,
      });
    }

    // Get all data for final review
    const applicationData = await this.getCompleteApplication(userId);
    
    // Generate application reference number
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