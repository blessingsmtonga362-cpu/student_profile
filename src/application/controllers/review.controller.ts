import { 
  Controller, 
  Get, 
  Put, 
  Delete, 
  Post,
  Body, 
  Param, 
  UseGuards, 
  Req,
  BadRequestException,
  NotFoundException
} from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { PersonalDetailService } from '../services/personal_details.service';
import { FamilyService } from '../services/family.service';
import { EducationService } from '../services/education.service';
import { UpdatePersonalDetailDto } from '../dto/create_personal_details.dto';
import { UpdateFamilyDto } from '../dto/create_family.dto';
import { UpdateEducationDto } from '../dto/education/update-education.dto';
import { UserService } from '../../user/user.service'; 
import { Education, EducationLevel, FeePayer } from '../entities/education.entity';
import { Disability, Gender, MaritalStatus } from '../entities/personal_details.entity';
import { ApplicationSubmissionService } from '../services/application_submission.service';

@Controller('review')
@UseGuards(AuthGuard)
export class ReviewController {
  constructor(
    private readonly personalDetailService: PersonalDetailService,
    private readonly familyService: FamilyService,
    private readonly educationService: EducationService,
    private readonly userService: UserService,
    private readonly submissionService: ApplicationSubmissionService,
  ) {}
  
  private async getUserIdFromRequest(req: any): Promise<string> {
    const user = await this.userService.findOne(req.user?.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return String(user.id);
  }

  private toOptionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  private toOptionalNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private mapDisability(value: unknown): Disability | undefined {
    const normalized = this.toOptionalString(value);
    if (!normalized) return Disability.NONE;

    const disabilityMap: Record<string, Disability> = {
      none: Disability.NONE,
      physical: Disability.PHYSICAL,
      visual: Disability.VISUAL,
      hearing: Disability.HEARING,
      speech: Disability.SPEECH,
      intellectual: Disability.INTELLECTUAL,
      other: Disability.OTHER,
    };

    return disabilityMap[normalized.toLowerCase()] ?? Disability.OTHER;
  }

  private mapFeePayer(value: unknown): FeePayer {
    const normalized = this.toOptionalString(value)?.toLowerCase();
    if (!normalized) return undefined as unknown as FeePayer;

    const map: Record<string, FeePayer> = {
      mother: FeePayer.PARENT,
      father: FeePayer.PARENT,
      parent: FeePayer.PARENT,
      parents: FeePayer.PARENT,
      sponsor: FeePayer.SPONSOR,
      ngo: FeePayer.SPONSOR,
      scholarship: FeePayer.SCHOLARSHIP,
      guardian: FeePayer.GUARDIAN,
      self: FeePayer.SELF,
      other: FeePayer.OTHER,
    };

    return map[normalized] ?? FeePayer.OTHER;
  }

  private hasAnyEducationValue(levelData: any): boolean {
    if (!levelData || typeof levelData !== 'object') return false;

    return [
      levelData.schoolName,
      levelData.tuitionFee,
      levelData.yearCompleted,
      levelData.whoPaidFees,
    ].some((value) => this.toOptionalString(value) !== undefined || this.toOptionalNumber(value) !== undefined);
  }

  private validateEducationSection(levelLabel: string, levelData: any) {
    if (!this.hasAnyEducationValue(levelData)) return;

    const missingFields: string[] = [];

    if (!this.toOptionalString(levelData?.schoolName)) {
      missingFields.push('school name');
    }

    if (this.toOptionalNumber(levelData?.tuitionFee) === undefined) {
      missingFields.push('tuition fee');
    }

    if (this.toOptionalNumber(levelData?.yearCompleted) === undefined) {
      missingFields.push('year completed');
    }

    if (!this.toOptionalString(levelData?.whoPaidFees)) {
      missingFields.push('who paid fees');
    }

    if (missingFields.length > 0) {
      throw new BadRequestException(
        `${levelLabel} education is incomplete. Please provide ${missingFields.join(', ')}.`,
      );
    }
  }

  private normalizePersonalPayload(applicationData: any) {
    const personal = applicationData.personal ?? {};
    const payment = applicationData.payment ?? {};

    return {
      firstName: this.toOptionalString(personal.firstName) ?? '',
      lastName: this.toOptionalString(personal.lastName) ?? this.toOptionalString(personal.surname) ?? '',
      phoneNumber: this.toOptionalString(personal.phoneNumber) ?? '',
      nationalIdNumber: this.toOptionalString(personal.nationalIdNumber) ?? this.toOptionalString(personal.nationalId) ?? '',
      registrationNumber: this.toOptionalString(personal.registrationNumber) ?? '',
      dateOfBirth: personal.dateOfBirth,
      gender: (this.toOptionalString(personal.gender) as Gender | undefined) ?? Gender.MALE,
      maritalStatus: (this.toOptionalString(personal.maritalStatus) as MaritalStatus | undefined) ?? MaritalStatus.SINGLE,
      homeDistrict: this.toOptionalString(personal.homeDistrict) ?? '',
      traditionalAuthority: this.toOptionalString(personal.traditionalAuthority) ?? this.toOptionalString(personal.ta) ?? '',
      physicalAddress: this.toOptionalString(personal.physicalAddress) ?? '',
      disability: this.mapDisability(personal.disability),
      paymentMethod: this.toOptionalString(payment.paymentMethod),
      paymentPhoneNumber: this.toOptionalString(payment.phoneNumber),
      bankAccount: this.toOptionalString(payment.accountNumber),
      accountName: this.toOptionalString(payment.accountName),
      bankName: this.toOptionalString(payment.paymentMethod),
    };
  }

  private normalizeFamilyPayload(family: any) {
    return {
      parentalStatus: this.toOptionalString(family?.parentalStatus),
      fatherFirstName: this.toOptionalString(family?.fatherFirstName),
      fatherSurname: this.toOptionalString(family?.fatherSurname),
      fatherNationalId: this.toOptionalString(family?.fatherNationalId),
      fatherPhone: this.toOptionalString(family?.fatherPhone),
      fatherProfession: this.toOptionalString(family?.fatherProfession),
      fatherMonthlyIncome: this.toOptionalNumber(family?.fatherMonthlyIncome),
      fatherTa: this.toOptionalString(family?.fatherTa),
      fatherResidentialAddress: this.toOptionalString(family?.fatherResidentialAddress),
      fatherPostalAddress: this.toOptionalString(family?.fatherPostalAddress),
      motherFirstName: this.toOptionalString(family?.motherFirstName),
      motherSurname: this.toOptionalString(family?.motherSurname),
      motherNationalId: this.toOptionalString(family?.motherNationalId),
      motherPhone: this.toOptionalString(family?.motherPhone),
      motherProfession: this.toOptionalString(family?.motherProfession),
      motherMonthlyIncome: this.toOptionalNumber(family?.motherMonthlyIncome),
      motherTa: this.toOptionalString(family?.motherTa),
      motherResidentialAddress: this.toOptionalString(family?.motherResidentialAddress),
      motherPostalAddress: this.toOptionalString(family?.motherPostalAddress),
      parentFirstName: this.toOptionalString(family?.parentFirstName),
      parentSurname: this.toOptionalString(family?.parentSurname),
      parentNationalId: this.toOptionalString(family?.parentNationalId),
      parentPhone: this.toOptionalString(family?.parentPhone),
      parentMonthlyIncome: this.toOptionalNumber(family?.parentMonthlyIncome),
      studentRelationship: this.toOptionalString(family?.studentRelationship),
      parentTa: this.toOptionalString(family?.parentTa),
      parentResidentialAddress: this.toOptionalString(family?.parentResidentialAddress),
      parentPostalAddress: this.toOptionalString(family?.parentPostalAddress),
      deceasedParentId: this.toOptionalString(family?.deceasedParentId),
      guardianFirstName: this.toOptionalString(family?.guardianFirstName),
      guardianLastName: this.toOptionalString(family?.guardianSurname),
      guardianNationalId: this.toOptionalString(family?.guardianNationalId),
      guardianPhone: this.toOptionalString(family?.guardianPhone),
      guardianMonthlyIncome: this.toOptionalNumber(family?.guardianMonthlyIncome),
      relationshipToGuardian: this.toOptionalString(family?.relationshipToGuardian),
      guardianTa: this.toOptionalString(family?.guardianTa),
      guardianResidentialAddress: this.toOptionalString(family?.guardianResidentialAddress),
      guardianPostalAddress: this.toOptionalString(family?.guardianPostalAddress),
      deceasedFatherId: this.toOptionalString(family?.deceasedFatherId),
      deceasedMotherId: this.toOptionalString(family?.deceasedMotherId),
      numberOfSiblings: this.toOptionalNumber(family?.numberOfSiblings),
      numberStillInSchool: this.toOptionalNumber(family?.numberStillInSchool),
      siblingsInPrimary: this.toOptionalNumber(family?.siblingsInPrimary),
      siblingsInSecondary: this.toOptionalNumber(family?.siblingsInSecondary),
      siblingsInTertiary: this.toOptionalNumber(family?.siblingsInTertiary),
    };
  }

  private normalizeEducationPayload(levelData: any) {
    return {
      schoolName: this.toOptionalString(levelData?.schoolName) ?? '',
      tuitionFees: this.toOptionalNumber(levelData?.tuitionFee) ?? 0,
      yearCompleted: this.toOptionalNumber(levelData?.yearCompleted) ?? 0,
      whoPaidFees: this.mapFeePayer(levelData?.whoPaidFees),
    };
  }

  // ========== GET ALL USER DATA FOR REVIEW ==========
  @Get('my-application')
  async getMyCompleteApplication(@Req() req) {
    const userId = await this.getUserIdFromRequest(req);
    const [personalDetails, familyDetails, education] = await Promise.all([
      this.personalDetailService.findByUserId(userId).catch(() => null),
      this.familyService.findByUserId(userId).catch(() => null),
      this.educationService.findByUserId(userId).catch((): Education[] => []),
    ]);

    return {
      success: true,
      data: {
        personalDetails,
        familyDetails,
        education: {
          primary: education.filter(e => e.educationLevel === 'primary'),
          secondary: education.filter(e => e.educationLevel === 'secondary'),
          tertiary: education.filter(e => e.educationLevel === 'tertiary'),
        },
      },
      lastUpdated: new Date(),
    };
  }

  // ========== PERSONAL DETAILS ==========
  @Get('personal-details')
  async getPersonalDetails(@Req() req) {
    const userId = await this.getUserIdFromRequest(req);
    return await this.personalDetailService.findByUserId(userId);
  }

  @Put('personal-details')
  async updatePersonalDetails(@Req() req, @Body() updateDto: UpdatePersonalDetailDto) {
    const userId = await this.getUserIdFromRequest(req);
    const updated = await this.personalDetailService.updateByUserId(userId, updateDto);
    return {
      success: true,
      message: 'Personal details updated successfully',
      data: updated,
    };
  }

  @Delete('personal-details')
  async deletePersonalDetails(@Req() req) {
    const userId = await this.getUserIdFromRequest(req);
    await this.personalDetailService.removeByUserId(userId);
    return {
      success: true,
      message: 'Personal details deleted successfully',
    };
  }

  @Get('family-details')
  async getFamilyDetails(@Req() req) {
    const userId = await this.getUserIdFromRequest(req);
    return await this.familyService.findByUserId(userId);
  }

  @Put('family-details')
  async updateFamilyDetails(@Req() req, @Body() updateDto: UpdateFamilyDto) {
    const userId = await this.getUserIdFromRequest(req);
    const updated = await this.familyService.updateByUserId(userId, updateDto);
    return {
      success: true,
      message: 'Family details updated successfully',
      data: updated,
    };
  }

  @Delete('family-details')
  async deleteFamilyDetails(@Req() req) {
    const userId = await this.getUserIdFromRequest(req);
    await this.familyService.removeByUserId(userId);
    return {
      success: true,
      message: 'Family details deleted successfully',
    };
  }

  // ========== EDUCATION ==========
  @Get('education/:level')
  async getEducationByLevel(@Req() req, @Param('level') level: string) {
    const userId = await this.getUserIdFromRequest(req);
    return await this.educationService.findByLevel(userId, level as any);
  }

  @Put('education/:id')
  async updateEducation(
    @Param('id') id: string, 
    @Body() updateDto: UpdateEducationDto, 
    @Req() req
  ) {
    const userId = await this.getUserIdFromRequest(req);
    const education = await this.educationService.findOne(id);
    
    if (education.userId !== userId) {
      throw new BadRequestException('You can only update your own education records');
    }
    
    const updated = await this.educationService.update(id, updateDto);
    return {
      success: true,
      message: 'Education record updated successfully',
      data: updated,
    };
  }

  @Delete('education/:id')
  async deleteEducation(@Param('id') id: string, @Req() req) {
    const userId = await this.getUserIdFromRequest(req);
    const education = await this.educationService.findOne(id);
    
    if (education.userId !== userId) {
      throw new BadRequestException('You can only delete your own education records');
    }
    
    await this.educationService.remove(id);
    return {
      success: true,
      message: 'Education record deleted successfully',
    };
  }

  // ========== SUBMISSION STATUS ==========
  @Get('submission-status')
  async getSubmissionStatus(@Req() req) {
    const userId = await this.getUserIdFromRequest(req);
    const canSubmit = await this.submissionService.canUserSubmit(userId);
    const submission = await this.submissionService.getUserSubmission(userId);
    
    return {
      success: true,
      canSubmit: canSubmit.canSubmit,
      message: canSubmit.message,
      submission: submission ? {
        status: submission.status,
        submittedAt: submission.submittedAt,
        applicationReference: submission.applicationReference,
        canResubmit: submission.canResubmit,
        resubmitDeadline: submission.resubmitDeadline,
      } : null,
    };
  }

  // ========== MAIN SUBMISSION ENDPOINT ==========
  @Post('submit-application')
  async submitFullApplication(@Req() req, @Body() applicationData: any) {
    const userId = await this.getUserIdFromRequest(req);

    try {
      // VALIDATES all sections are complete before allowing final submission

      this.validateEducationSection('Primary', applicationData.education?.primary);
      this.validateEducationSection('Secondary', applicationData.education?.secondary);
      this.validateEducationSection('Tertiary', applicationData.education?.tertiary);

      // SAVE personal details
      if (applicationData.personal) {
        const personalData = this.normalizePersonalPayload(applicationData);
        await this.personalDetailService.upsertByUserId(userId, personalData as any);
      }
      
      // SAVE family details
      if (applicationData.family) {
        const familyData = this.normalizeFamilyPayload(applicationData.family);
        await this.familyService.upsertByUserId(userId, familyData as any);
      }

      if (applicationData.education?.primary?.schoolName) {
        await this.educationService.upsertByLevel(
          userId,
          EducationLevel.PRIMARY,
          this.normalizeEducationPayload(applicationData.education.primary),
        );
      }

      // SAVE secondary education
      if (applicationData.education?.secondary?.schoolName) {
        await this.educationService.upsertByLevel(
          userId,
          EducationLevel.SECONDARY,
          this.normalizeEducationPayload(applicationData.education.secondary),
        );
      }

      // SAVE tertiary education (optional)
      if (applicationData.education?.tertiary?.schoolName) {
        await this.educationService.upsertByLevel(
          userId,
          EducationLevel.TERTIARY,
          {
            ...this.normalizeEducationPayload(applicationData.education.tertiary),
            isSemesterBased: true,
          },
        );
      }

      // MARK SUBMISSION AS COMPLETE
      const applicationReference = `APP-${Date.now()}-${userId.slice(0, 8)}`;
      const submission = await this.submissionService.markAsSubmitted(userId, applicationReference);

      return {
        success: true,
        message: 'Application submitted successfully!',
        applicationReference,
        submittedAt: new Date(),
        applicationStatus: 'pending_review',
      };
    } catch (error: any) {
      throw new BadRequestException({
        message: error?.message ?? 'Failed to submit application',
        error: error.message,
      });
    }
  }

  // SUBMIT FOR FINAL REVIEW (Legacy - kept for compatibility) 
  @Post('submit')
  async submitApplication(@Req() req) {
    const userId = await this.getUserIdFromRequest(req);
    
    
    const [personalDetails, familyDetails, education] = await Promise.all([
      this.personalDetailService.findByUserId(userId).catch(() => null),
      this.familyService.findByUserId(userId).catch(() => null),
      this.educationService.findByUserId(userId).catch(() => []),
    ]);

    const missingSections: string[] = [];
    if (!personalDetails) missingSections.push('Personal Details');
    if (!familyDetails) missingSections.push('Family Details');
    if (education.length === 0) missingSections.push('Education Information');

    if (missingSections.length > 0) {
      throw new BadRequestException({
        message: 'Cannot submit application. Missing required sections.',
        missingSections,
      });
    }

    return {
      success: true,
      message: 'Application submitted successfully for final review',
      submittedAt: new Date(),
      applicationStatus: 'pending_review',
    };
  }
  
}

