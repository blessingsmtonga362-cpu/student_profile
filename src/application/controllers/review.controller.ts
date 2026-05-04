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
  BadRequestException
} from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
//import { RolesGuard } from '../../auth/guards/roles.guard';
import { PersonalDetailService } from '../services/personal_details.service';
import { AcademicDetailService } from '../services/academic_details.service';
import { FamilyService } from '../services/family.service';
import { EducationService } from '../services/education.service';
import { UpdatePersonalDetailDto } from '../dto/create_personal_details.dto';
import { UpdateAcademicDetailDto } from '../dto/create_academic_details.dto';
import { UpdateFamilyDto } from '../dto/create_family.dto';
import { UpdateEducationDto } from '../dto/education/update-education.dto';

@Controller('review')
@UseGuards(AuthGuard)// i have removed  RolesGuard
export class ReviewController {
  constructor(
    private readonly personalDetailService: PersonalDetailService,
    private readonly academicDetailService: AcademicDetailService,
    private readonly familyService: FamilyService,
    private readonly educationService: EducationService,
  ) {}
  
  // ========== GET ALL USER DATA FOR REVIEW ==========
  @Get('my-application')
  async getMyCompleteApplication(@Req() req) {
    const userId = req.user?.userId || req.user?.id;
    
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
    const userId = req.user?.userId || req.user?.id;
    return await this.personalDetailService.findByUserId(userId);
  }

  @Put('personal-details')
  async updatePersonalDetails(@Req() req, @Body() updateDto: UpdatePersonalDetailDto) {
    const userId = req.user?.userId || req.user?.id;
    const updated = await this.personalDetailService.updateByUserId(userId, updateDto);
    return {
      success: true,
      message: 'Personal details updated successfully',
      data: updated,
    };
  }

  @Delete('personal-details')
  async deletePersonalDetails(@Req() req) {
    const userId = req.user?.userId || req.user?.id;
    await this.personalDetailService.removeByUserId(userId);
    return {
      success: true,
      message: 'Personal details deleted successfully',
    };
  }

  // ========== ACADEMIC DETAILS REVIEW ==========
  @Get('academic-details')
  async getAcademicDetails(@Req() req) {
    const userId = req.user?.userId || req.user?.id;
    return await this.academicDetailService.findByUserId(userId);
  }

  @Put('academic-details/:id')
  async updateAcademicDetails(
    @Param('id') id: string,
    @Body() updateDto: UpdateAcademicDetailDto,
    @Req() req
  ) {
    const userId = req.user?.userId || req.user?.id;
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
    const userId = req.user?.userId || req.user?.id;
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
    const userId = req.user?.userId || req.user?.id;
    return await this.familyService.findByUserId(userId);
  }

  @Put('family-details')
  async updateFamilyDetails(@Req() req, @Body() updateDto: UpdateFamilyDto) {
    const userId = req.user?.userId || req.user?.id;
    const updated = await this.familyService.updateByUserId(userId, updateDto);
    return {
      success: true,
      message: 'Family details updated successfully',
      data: updated,
    };
  }

  @Delete('family-details')
  async deleteFamilyDetails(@Req() req) {
    const userId = req.user?.userId || req.user?.id;
    await this.familyService.removeByUserId(userId);
    return {
      success: true,
      message: 'Family details deleted successfully',
    };
  }

  // ========== EDUCATION REVIEW ==========
  @Get('education/:level')
  async getEducationByLevel(@Req() req, @Param('level') level: string) {
    const userId = req.user?.userId || req.user?.id;
    return await this.educationService.findByLevel(userId, level as any);
  }

  @Put('education/:id')
  async updateEducation(
    @Param('id') id: string, 
    @Body() updateDto: UpdateEducationDto, 
    @Req() req
  ) {
    const userId = req.user?.userId || req.user?.id;
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
    const userId = req.user?.userId || req.user?.id;
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

  // ========== SUBMIT FOR FINAL REVIEW ==========
  @Post('submit')
  async submitApplication(@Req() req) {
    const userId = req.user?.userId || req.user?.id;
    
    // Check if all required sections are complete
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