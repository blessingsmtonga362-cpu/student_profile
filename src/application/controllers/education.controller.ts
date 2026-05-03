import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Req,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EducationService } from '../services/education.service';
import { PrimaryEducationDto } from '../dto/education/primary-education.dto';
import { SecondaryEducationDto } from '../dto/education/secondary-education.dto';
import { TertiaryEducationDto } from '../dto/education/tertiary-education.dto';
import { AuthGuard } from '../../auth/auth.guard';
//import { RolesGuard } from '../../auth/guards/roles.guard';
//import { Roles } from '../../auth/decorators/roles.decorator';
import { FileService } from '../../file/file.service';
import { EducationLevel } from '../entities/education.entity';

@Controller('education')
@UseGuards(AuthGuard) //i hv removed roles
export class EducationController {
  constructor(
    private readonly educationService: EducationService,
    private readonly fileService: FileService,
  ) {}

  // ========== PRIMARY SCHOOL ENDPOINTS ==========
  @Post('primary')
  @HttpCode(HttpStatus.CREATED)
  async createPrimary(@Req() req, @Body() createDto: PrimaryEducationDto & { userId?: number }) {
    // Try to get userId from token first, then from body
    const userId = req.user?.userId || req.user?.id || createDto.userId;
    
    if (!userId) {
      throw new BadRequestException('User ID not found. Please provide userId in request body.');
    }
    
    return await this.educationService.createPrimary(userId, createDto);
  }

  @Get('primary')
  async getPrimaryEducation(@Req() req) {
    const userId = req.user?.userId || req.user?.id;
    return await this.educationService.findByLevel(userId, EducationLevel.PRIMARY);
  }

  // ========== SECONDARY SCHOOL ENDPOINTS ==========
  @Post('secondary')
  @HttpCode(HttpStatus.CREATED)
  async createSecondary(@Req() req, @Body() createDto: SecondaryEducationDto & { userId?: number }) {
    // Try to get userId from token first, then from body
    const userId = req.user?.userId || req.user?.id || createDto.userId;
    
    if (!userId) {
      throw new BadRequestException('User ID not found. Please provide userId in request body.');
    }
    
    return await this.educationService.createSecondary(userId, createDto);
  }

  @Get('secondary')
  async getSecondaryEducation(@Req() req) {
    const userId = req.user?.userId || req.user?.id;
    return await this.educationService.findByLevel(userId, EducationLevel.SECONDARY);
  }

  // ========== TERTIARY ENDPOINTS ==========
  @Post('tertiary')
  @HttpCode(HttpStatus.CREATED)
  async createTertiary(@Req() req, @Body() createDto: TertiaryEducationDto & { userId?: number }) {
    // Try to get userId from token first, then from body
    const userId = req.user?.userId || req.user?.id || createDto.userId;
    
    if (!userId) {
      throw new BadRequestException('User ID not found. Please provide userId in request body.');
    }
    
    return await this.educationService.createTertiary(userId, createDto);
  }

  @Get('tertiary')
  async getTertiaryEducation(@Req() req) {
    const userId = req.user?.userId || req.user?.id;
    return await this.educationService.findByLevel(userId, EducationLevel.TERTIARY);
  }

  // ========== FILE UPLOADS ==========
  @Post('upload-certificate')
  @UseInterceptors(FileInterceptor('certificate'))
  async uploadCertificate(
    @Req() req,
    @UploadedFile() file: Express.Multer.File,
    @Body('educationId') educationId: string
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const uploadResult = await this.fileService.uploadFile(
      file,
      'education/certificates'
    );

    if (educationId) {
      await this.educationService.update(educationId, {
        certificateUrl: uploadResult.url,
        certificateFilename: uploadResult.filename,
      });
    }

    return uploadResult;
  }

  // ========== DASHBOARD & STATISTICS ==========
  @Get('my-education')
  async getMyEducation(@Req() req) {
    const userId = req.user?.userId || req.user?.id;
    return await this.educationService.getGroupedEducation(userId);
  }

  @Get('my-stats')
  async getMyStats(@Req() req) {
    const userId = req.user?.userId || req.user?.id;
    return await this.educationService.getEducationStats(userId);
  }

  // ========== OPTIONS FOR FORMS ==========
  @Get('options/fee-payers')
  async getFeePayerOptions() {
    return await this.educationService.getFeePayerOptions();
  }

  @Get('options/levels')
  async getEducationLevels() {
    return await this.educationService.getEducationLevels();
  }

  // ========== UPDATE & DELETE ==========
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return await this.educationService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return await this.educationService.remove(id);
  }

  // ========== ADMIN ENDPOINTS ==========
  @Get('admin/all')
  //@Roles('admin', 'main_admin')
  async adminFindAll() {
    return await this.educationService.findAll();
  }

  @Get('admin/user/:userId')
  //@Roles('admin', 'main_admin')
  async adminFindByUserId(@Param('userId') userId: string) {
    return await this.educationService.findByUserId(userId);
  }

  @Get('admin/stats/:userId')
  //@Roles('admin', 'main_admin')
  async adminGetStats(@Param('userId') userId: string) {
    return await this.educationService.getEducationStats(userId);
  }
}