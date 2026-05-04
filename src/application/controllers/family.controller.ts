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
  UploadedFiles,
  BadRequestException,
  ForbiddenException
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { FamilyService } from '../services/family.service';
import { FileService } from '../../file/file.service';
import { CreateFamilyDto, UpdateFamilyDto } from '../dto/create_family.dto';
import { AuthGuard } from '../../auth/auth.guard';
//import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('family')
@UseGuards(AuthGuard)
export class FamilyController {
  constructor(
    private readonly familyService: FamilyService,
    private readonly fileService: FileService, // Inject FileService
  ) {}

  @Post()
  async create(@Req() req, @Body() createDto: CreateFamilyDto & { userId?: number }) {
    // Try to get userId from token first, then from body
    const userId = req.user?.userId || req.user?.id || createDto.userId;
    
    if (!userId) {
      throw new BadRequestException('User ID not found. Please provide userId in request body.');
    }
    
    return await this.familyService.create(userId, createDto);
  }

  @Post('upload-documents')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'deathCertificate', maxCount: 1 },
    { name: 'nationalId', maxCount: 1 },
    { name: 'consentForm', maxCount: 1 },
  ]))
  async uploadDocuments(
    @Req() req,
    @UploadedFiles() files: {
      deathCertificate?: Express.Multer.File[],
      nationalId?: Express.Multer.File[],
      consentForm?: Express.Multer.File[],
    }
  ) {
    const userId = req.user?.userId || req.user?.id;
    
    let deathCertificateUrl, nationalIdUrl, consentFormUrl;

    // Upload death certificate using FileService
    if (files.deathCertificate && files.deathCertificate[0]) {
      const uploadResult = await this.fileService.uploadFile(
        files.deathCertificate[0], 
        'family-documents/death-certificates'
      );
      deathCertificateUrl = uploadResult.url;
    }

    // Upload national ID using FileService
    if (files.nationalId && files.nationalId[0]) {
      const uploadResult = await this.fileService.uploadFile(
        files.nationalId[0], 
        'family-documents/national-ids'
      );
      nationalIdUrl = uploadResult.url;
    }

    // Upload consent form using FileService
    if (files.consentForm && files.consentForm[0]) {
      const uploadResult = await this.fileService.uploadFile(
        files.consentForm[0], 
        'family-documents/consent-forms'
      );
      consentFormUrl = uploadResult.url;
    }

    return await this.familyService.updateDocuments(
      userId,
      deathCertificateUrl,
      nationalIdUrl,
      consentFormUrl
    );
  }

  @Get()
  //@Roles('admin', 'main_admin')
  async findAll() {
    return await this.familyService.findAll();
  }

  @Get('my-family')
  async getMyFamily(@Req() req) {
    const userId = req.user?.userId || req.user?.id;
    return await this.familyService.findByUserId(userId);
  }

  @Get('user/:userId')
 // @Roles('admin', 'main_admin')
  async findByUserId(@Param('userId') userId: string, @Req() req) {
    // Allow admins to view any user, regular users can only view their own
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
  //@Roles('admin', 'main_admin')
  async findOne(@Param('id') id: string) {
    return await this.familyService.findOne(id);
  }

  @Patch()
  async update(@Req() req, @Body() updateDto: UpdateFamilyDto & { userId?: number }) {
    // Try to get userId from token first, then from body
    const userId = req.user?.userId || req.user?.id || updateDto.userId;
    
    if (!userId) {
      throw new BadRequestException('User ID not found');
    }
    
    return await this.familyService.updateByUserId(userId, updateDto);
  }

  @Patch(':id')
  //@Roles('admin', 'main_admin')
  async updateById(@Param('id') id: string, @Body() updateDto: UpdateFamilyDto) {
    return await this.familyService.update(id, updateDto);
  }

  @Delete()
  async remove(@Req() req) {
    const userId = req.user?.userId || req.user?.id;
    return await this.familyService.removeByUserId(userId);
  }

  @Delete(':id')
  //@Roles('admin', 'main_admin')
  async removeById(@Param('id') id: string) {
    return await this.familyService.remove(id);
  }
}