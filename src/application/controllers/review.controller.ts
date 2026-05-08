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

@Controller('review')
@UseGuards(AuthGuard)
export class ReviewController {
  constructor(
    private readonly personalDetailService: PersonalDetailService,
    private readonly academicDetailService: AcademicDetailService,
    private readonly familyService: FamilyService,
    private readonly educationService: EducationService,
    private readonly userService: UserService,
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

  // ========== SUBMIT FULL APPLICATION ==========
  @Post('submit-application')
  async submitFullApplication(@Req() req, @Body() applicationData: any) {
    const userId = await this.getUserIdFromRequest(req);
    
    console.log('=== SUBMIT APPLICATION ===');
    console.log('User ID:', userId);
    
    try {
      // Save personal details
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
      
      // Save family details - Mapped correctly for Family entity
      if (applicationData.family) {
        console.log('Saving family details...');
        console.log('Raw family data:', JSON.stringify(applicationData.family, null, 2));
        
        const familyData: any = {
          guardianFirstName: applicationData.family.fatherFirstName || applicationData.family.motherFirstName || 'Not Provided',
          guardianLastName: applicationData.family.fatherLastName || applicationData.family.motherLastName || 'Not Provided',
          profession: applicationData.family.fatherProfession || applicationData.family.motherProfession || 'Not Provided',
          traditionalAuthority: applicationData.family.fatherTa || applicationData.family.motherTa || 'Not Provided',
          residenceAddress: applicationData.family.fatherResidentialAddress || applicationData.family.motherResidentialAddress || 'Not Provided',
          postalAddress: applicationData.family.fatherPostalAddress || applicationData.family.motherPostalAddress || 'Not Provided',
          dateOfBirth: new Date(),
          userId: userId,
        };
        
        // Add optional fields if they exist
        if (applicationData.family.fatherPhone) {
          familyData.phoneNumber = applicationData.family.fatherPhone;
        }
        
        try {
          await this.familyService.create(userId, familyData);
          console.log('Family details created successfully');
        } catch (error: any) {
          if (error.message.includes('already exists')) {
            const existing = await this.familyService.findByUserId(userId);
            await this.familyService.update(existing.id, familyData);
            console.log('Family details updated successfully');
          } else {
            console.error('Family service error:', error.message);
            // Continue without family details - they are optional
            console.log('Continuing without family details...');
          }
        }
      }
      
      console.log('=== SUBMIT SUCCESS ===');
      return {
        success: true,
        message: 'Application submitted successfully!',
        submittedAt: new Date(),
        applicationStatus: 'pending_review',
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

  // ========== SUBMIT FOR FINAL REVIEW ==========
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