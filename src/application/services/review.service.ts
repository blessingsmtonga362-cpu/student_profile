// application/services/review.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PersonalDetailService } from './personal_details.service';
import { AcademicDetailService } from './academic_details.service';
import { FamilyService } from './family.service';
import { EducationService } from './education.service';
import { ApplicationSubmissionService } from './application_submission.service';
import { SubmitApplicationDto } from '../dto/submit-application.dto';
import { ApplicationStatus } from '../entities/application_submission.entity';
import { EducationLevel } from '../entities/education.entity';

@Injectable()
export class ReviewService {
  constructor(
    private readonly personalDetailService: PersonalDetailService,
    private readonly academicDetailService: AcademicDetailService,
    private readonly familyService: FamilyService,
    private readonly educationService: EducationService,
    private readonly submissionService: ApplicationSubmissionService,
  ) {}

  
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

  // ✅ Complete validation - checks EVERY field
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
      // Primary Education
      if (!data.education.primary) {
        errors.push('Primary education details are required');
      } else {
        const primary = data.education.primary;
        if (!primary.schoolName) errors.push('Primary school name is required');
        if (primary.tuitionFees === undefined) errors.push('Primary tuition fee is required');
        if (!primary.yearCompleted) errors.push('Primary year completed is required');
        if (!primary.whoPaidFees) errors.push('Primary fee payer is required');
      }

      // Secondary Education
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

  // Save methods
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
 }
