// src/application/controllers/review.controller.ts
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
import { AcademicDetailService } from '../services/academic_details.service';
import { FamilyService } from '../services/family.service';
import { EducationService } from '../services/education.service';
import { UpdatePersonalDetailDto } from '../dto/create_personal_details.dto';
import { UpdateAcademicDetailDto } from '../dto/create_academic_details.dto';
import { UpdateFamilyDto } from '../dto/create_family.dto';
import { UpdateEducationDto } from '../dto/education/update-education.dto';
import { UserService } from '../../user/user.service'; 
import { FeePayer } from '../entities/education.entity';
import { ApplicationSubmissionService } from '../services/application_submission.service';
import { ApplicationStatus } from '../entities/application_submission.entity';

@Controller('review')
@UseGuards(AuthGuard)
export class ReviewController {
  constructor(
    private readonly personalDetailService: PersonalDetailService,
    private readonly academicDetailService: AcademicDetailService,
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

  // ========== GET ALL USER DATA FOR REVIEW ==========
  @Get('my-application')
  async getMyCompleteApplication(@Req() req) {
    const userId = await this.getUserIdFromRequest(req);
    
    const [personalDetails, academicDetails, familyDetails, education] = await Promise.all([
      this.personalDetailService.findByUserId(userId).catch(() => null),
      this.academicDetailService.findByUserId(userId).catch(() => null),
      this.familyService.findByUserId(userId).catch(() => null),
      this.educationService.findByUserId(userId).catch(() => []),
    ]);

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
      lastUpdated: new Date(),
    };
  }

  // ========== PERSONAL DETAILS REVIEW ==========
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

  // ========== ACADEMIC DETAILS REVIEW ==========
  @Get('academic-details')
  async getAcademicDetails(@Req() req) {
    const userId = await this.getUserIdFromRequest(req);
    return await this.academicDetailService.findByUserId(userId);
  }

  @Put('academic-details/:id')
  async updateAcademicDetails(
    @Param('id') id: string,
    @Body() updateDto: UpdateAcademicDetailDto,
    @Req() req
  ) {
    const userId = await this.getUserIdFromRequest(req);
    const academicDetail = await this.academicDetailService.findOne(id);
    
    if (academicDetail.userId !== userId) {
      throw new BadRequestException('You can only update your own academic details');
    }
    
    const updated = await this.academicDetailService.update(id, updateDto);
    return {
      success: true,
      message: 'Academic details updated successfully',
      data: updated,
    };
  }

  @Delete('academic-details/:id')
  async deleteAcademicDetails(@Param('id') id: string, @Req() req) {
    const userId = await this.getUserIdFromRequest(req);
    const academicDetail = await this.academicDetailService.findOne(id);
    
    if (academicDetail.userId !== userId) {
      throw new BadRequestException('You can only delete your own academic details');
    }
    
    await this.academicDetailService.remove(id);
    return {
      success: true,
      message: 'Academic details deleted successfully',
    };
  }

  // ========== FAMILY DETAILS REVIEW ==========
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

  // ========== EDUCATION REVIEW ==========
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

  // ========== CHECK SUBMISSION STATUS ==========
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

  // ========== SUBMIT FULL APPLICATION ==========
  @Post('submit-application')
  async submitFullApplication(@Req() req, @Body() applicationData: any) {
    const userId = await this.getUserIdFromRequest(req);
    
    console.log('=== SUBMIT APPLICATION ===');
    console.log('User ID:', userId);
    
    // ✅ Check if user can submit
    const canSubmit = await this.submissionService.canUserSubmit(userId);
    if (!canSubmit.canSubmit) {
      throw new BadRequestException({
        message: canSubmit.message || 'You cannot submit an application at this time.',
        existingSubmission: canSubmit.existingSubmission,
      });
    }
    
    try {
      // ✅ Create or update draft submission
      let existingSubmission = await this.submissionService.getUserSubmission(userId);
      if (!existingSubmission) {
        existingSubmission = await this.submissionService.createOrUpdateSubmission(userId, ApplicationStatus.DRAFT);
      }
      
      // 1. Save personal details
      if (applicationData.personal) {
        console.log('Saving personal details...');
        
        const personalData: any = {
          firstName: applicationData.personal.firstName,
          lastName: applicationData.personal.lastName || applicationData.personal.surname,
          phoneNumber: applicationData.personal.phoneNumber,
          nationalIdNumber: applicationData.personal.nationalIdNumber || applicationData.personal.nationalId,
          registrationNumber: applicationData.personal.registrationNumber,
          dateOfBirth: applicationData.personal.dateOfBirth,
          gender: applicationData.personal.gender,
          maritalStatus: applicationData.personal.maritalStatus,
          homeDistrict: applicationData.personal.homeDistrict,
          traditionalAuthority: applicationData.personal.traditionalAuthority || applicationData.personal.ta,
          physicalAddress: applicationData.personal.physicalAddress,
          userId: userId,
        };
        
        if (applicationData.personal.disability && 
            applicationData.personal.disability !== "None" && 
            applicationData.personal.disability !== "") {
          personalData.disability = applicationData.personal.disability;
        }
        
        try {
          await this.personalDetailService.create(userId, personalData);
          console.log('Personal details created successfully');
        } catch (error: any) {
          if (error.message.includes('already exist')) {
            const existing = await this.personalDetailService.findByUserId(userId);
            await this.personalDetailService.update(existing.id, personalData);
            console.log('Personal details updated successfully');
          } else {
            throw error;
          }
        }
      }
      
      // 2. Save family details
      if (applicationData.family) {
        console.log('Saving family details...');
        
        try {
          await this.familyService.createFromParents(userId, applicationData.family);
          console.log('Family details created successfully');
        } catch (error: any) {
          if (error.message.includes('already exists')) {
            console.log('Family details already exist, skipping...');
          } else {
            console.error('Family service error:', error.message);
          }
        }
      }
      
      // 3. Save academic details
      if (applicationData.academics) {
        console.log('Saving academic details...');
        
        const academicData: any = {
          programOfStudy: applicationData.academics.programOfStudy || 'Not Provided',
          department: applicationData.academics.department || 'Not Provided',
          yearOfStudy: applicationData.academics.yearOfStudy || 1,
          userId: userId,
        };
        
        try {
          await this.academicDetailService.create(userId, academicData);
          console.log('Academic details created successfully');
        } catch (error: any) {
          if (error.message.includes('already exist')) {
            const existing = await this.academicDetailService.findByUserId(userId);
            await this.academicDetailService.update(existing.id, academicData);
            console.log('Academic details updated successfully');
          } else {
            console.error('Academic service error:', error.message);
          }
        }
      }
      
      // 4. Save education details
      if (applicationData.education) {
        console.log('Saving education details...');
        
        const mapFeePayer = (feePayer: string): FeePayer => {
          const map: Record<string, FeePayer> = {
            'Mother': FeePayer.PARENT,
            'Father': FeePayer.PARENT,
            'Parent': FeePayer.PARENT,
            'Parents': FeePayer.PARENT,
            'Self': FeePayer.SELF,
            'self': FeePayer.SELF,
            'Ngo': FeePayer.SPONSOR,
            'NGO': FeePayer.SPONSOR,
            'Sponsor': FeePayer.SPONSOR,
            'Scholarship': FeePayer.SCHOLARSHIP,
            'Guardian': FeePayer.GUARDIAN,
            'guardian': FeePayer.GUARDIAN,
            'Other': FeePayer.OTHER,
            'other': FeePayer.OTHER,
          };
          return map[feePayer] || FeePayer.OTHER;
        };
        
        // Save Primary Education
        if (applicationData.education.primary && applicationData.education.primary.schoolName) {
          try {
            const existingPrimary = await this.educationService.findByLevel(userId, 'primary' as any);
            const primaryData = {
              schoolName: applicationData.education.primary.schoolName,
              tuitionFees: parseFloat(applicationData.education.primary.tuitionFee) || 0,
              yearCompleted: parseInt(applicationData.education.primary.yearCompleted) || 0,
              whoPaidFees: mapFeePayer(applicationData.education.primary.whoPaidFees),
            };
            
            if (existingPrimary && existingPrimary.length > 0) {
              await this.educationService.update(existingPrimary[0].id, primaryData);
              console.log('Primary education updated');
            } else {
              await this.educationService.createPrimary(userId, primaryData);
              console.log('Primary education created');
            }
          } catch (error: any) {
            console.error('Primary education error:', error.message);
          }
        }
        
        // Save Secondary Education
        if (applicationData.education.secondary && applicationData.education.secondary.schoolName) {
          try {
            const existingSecondary = await this.educationService.findByLevel(userId, 'secondary' as any);
            const secondaryData = {
              schoolName: applicationData.education.secondary.schoolName,
              tuitionFees: parseFloat(applicationData.education.secondary.tuitionFee) || 0,
              yearCompleted: parseInt(applicationData.education.secondary.yearCompleted) || 0,
              whoPaidFees: mapFeePayer(applicationData.education.secondary.whoPaidFees),
            };
            
            if (existingSecondary && existingSecondary.length > 0) {
              await this.educationService.update(existingSecondary[0].id, secondaryData);
              console.log('Secondary education updated');
            } else {
              await this.educationService.createSecondary(userId, secondaryData);
              console.log('Secondary education created');
            }
          } catch (error: any) {
            console.error('Secondary education error:', error.message);
          }
        }
        
        // Save Tertiary Education (optional)
        if (applicationData.education.tertiary && applicationData.education.tertiary.schoolName) {
          try {
            const existingTertiary = await this.educationService.findByLevel(userId, 'tertiary' as any);
            const tertiaryData = {
              schoolName: applicationData.education.tertiary.schoolName,
              tuitionFees: parseFloat(applicationData.education.tertiary.tuitionFee) || 0,
              yearCompleted: parseInt(applicationData.education.tertiary.yearCompleted) || 0,
              whoPaidFees: mapFeePayer(applicationData.education.tertiary.whoPaidFees),
            };
            
            if (existingTertiary && existingTertiary.length > 0) {
              await this.educationService.update(existingTertiary[0].id, tertiaryData);
              console.log('Tertiary education updated');
            } else {
              await this.educationService.createTertiary(userId, tertiaryData);
              console.log('Tertiary education created');
            }
          } catch (error: any) {
            console.error('Tertiary education error:', error.message);
          }
        }
      }
      
      // ✅ Mark as submitted after successful save
      const applicationReference = `APP-${Date.now()}-${userId.slice(0, 8)}`;
      const submission = await this.submissionService.markAsSubmitted(userId, applicationReference);
      
      console.log('=== SUBMIT SUCCESS ===');
      return {
        success: true,
        message: 'Application submitted successfully!',
        submittedAt: new Date(),
        applicationStatus: 'pending_review',
        applicationReference: submission.applicationReference,
      };
    } catch (error: any) {
      console.error('=== SUBMIT ERROR ===');
      console.error('Error message:', error.message);
      throw new BadRequestException({
        message: 'Failed to submit application',
        error: error.message,
      });
    }
  }

  // ========== SUBMIT FOR FINAL REVIEW (Legacy - kept for compatibility) ==========
  @Post('submit')
  async submitApplication(@Req() req) {
    const userId = await this.getUserIdFromRequest(req);
    
    const [personalDetails, academicDetails, familyDetails, education] = await Promise.all([
      this.personalDetailService.findByUserId(userId).catch(() => null),
      this.academicDetailService.findByUserId(userId).catch(() => null),
      this.familyService.findByUserId(userId).catch(() => null),
      this.educationService.findByUserId(userId).catch(() => []),
    ]);

    const missingSections: string[] = [];
    if (!personalDetails) missingSections.push('Personal Details');
    if (!academicDetails) missingSections.push('Academic Details');
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