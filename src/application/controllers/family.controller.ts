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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ForbiddenException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FamilyService } from '../services/family.service';
import { FileService } from '../../file/file.service';
import { DocumentVerificationService } from '../../file/document-verification.service';
import { CreateFamilyDto, UpdateFamilyDto } from '../dto/create_family.dto';
import { AuthGuard } from '../../auth/auth.guard';

@Controller('family')
@UseGuards(AuthGuard)
export class FamilyController {
  constructor(
    private readonly familyService: FamilyService,
    private readonly fileService: FileService,
    private readonly verificationService: DocumentVerificationService,
  ) {}

  @Post()
  async create(@Req() req, @Body() createDto: CreateFamilyDto & { userId?: number }) {
    const userId = req.user?.userId || req.user?.id || createDto.userId;
    
    if (!userId) {
      throw new BadRequestException('User ID not found. Please provide userId in request body.');
    }
    
    return await this.familyService.create(userId, createDto);
  }

  @Post('upload-consent')
  @UseInterceptors(FileInterceptor('consentForm'))
  async uploadConsentForm(
    @Req() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: {
      fatherFirstName?: string;
      fatherSurname?: string;
      motherFirstName?: string;
      motherSurname?: string;
      guardianFirstName?: string;
      guardianSurname?: string;
    }
  ) {
    const userId = req.user?.userId || req.user?.id;

    if (!file) {
      throw new BadRequestException('Consent form file is required');
    }

    // Validate that at least one parent/guardian info is provided
    if (!body.fatherFirstName && !body.motherFirstName && !body.guardianFirstName) {
      throw new BadRequestException(
        'At least one parent or guardian information must be provided for verification'
      );
    }

    // Verify consent form against provided parent/guardian names
    const verification = await this.verificationService.verifyConsentForm(
      file,
      {
        fatherFirstName: body.fatherFirstName,
        fatherSurname: body.fatherSurname,
        motherFirstName: body.motherFirstName,
        motherSurname: body.motherSurname,
        guardianFirstName: body.guardianFirstName,
        guardianSurname: body.guardianSurname,
      },
      userId
    );

    if (!verification.isVerified) {
      throw new BadRequestException({
        message: 'Consent form verification failed',
        mismatches: verification.mismatches,
        extractedData: verification.extractedData,
      });
    }

    // Upload the verified consent form
    const uploadResult = await this.fileService.uploadFile(
      file,
      'family-documents/consent-forms',
      `consent-form-${userId}`
    );

    // Save the consent form URL to the family record
    await this.familyService.updateConsentForm(userId, uploadResult.url);

    return {
      success: true,
      message: 'Consent form uploaded and verified successfully',
      matchedWith: verification.matchedWith,
      extractedData: verification.extractedData,
      fileUrl: uploadResult.url,
    };
  }

  @Get()
  async findAll() {
    return await this.familyService.findAll();
  }

  @Get('my-family')
  async getMyFamily(@Req() req) {
    const userId = req.user?.userId || req.user?.id;
    return await this.familyService.findByUserId(userId);
  }

  @Get('user/:userId')
  async findByUserId(@Param('userId') userId: string, @Req() req) {
    const isAdmin = req.user?.isAdmin || req.user?.is_admin;
    const currentUserId = req.user?.userId || req.user?.id;
    
    if (!isAdmin && userId !== currentUserId) {
      throw new ForbiddenException('You can only view your own family details');
    }
    
    return await this.familyService.findByUserId(userId);
  }

  @Get('education-levels')
  async getEducationLevels() {
    return await this.familyService.getEducationLevels();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.familyService.findOne(id);
  }

  @Patch()
  async update(@Req() req, @Body() updateDto: UpdateFamilyDto & { userId?: number }) {
    const userId = req.user?.userId || req.user?.id || updateDto.userId;
    
    if (!userId) {
      throw new BadRequestException('User ID not found');
    }
    
    return await this.familyService.updateByUserId(userId, updateDto);
  }

  @Patch(':id')
  async updateById(@Param('id') id: string, @Body() updateDto: UpdateFamilyDto) {
    return await this.familyService.update(id, updateDto);
  }

  @Delete()
  async remove(@Req() req) {
    const userId = req.user?.userId || req.user?.id;
    return await this.familyService.removeByUserId(userId);
  }

  @Delete(':id')
  async removeById(@Param('id') id: string) {
    return await this.familyService.remove(id);
  }
}