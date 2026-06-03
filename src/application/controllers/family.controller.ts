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
  ForbiddenException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { FamilyService } from '../services/family.service';
import { FileService } from '../../file/file.service';
import { CreateFamilyDto, UpdateFamilyDto } from '../dto/create_family.dto';
import { AuthGuard } from '../../auth/auth.guard';
//import { Roles } from '../../auth/decorators/roles.decorator';

interface FamilyRequestUser {
  id?: string;
  userId?: string;
  isAdmin?: boolean;
  is_admin?: boolean;
  role?: string;
}

interface FamilyRequest extends Request {
  user?: FamilyRequestUser;
}

@Controller('family')
@UseGuards(AuthGuard)
export class FamilyController {
  constructor(
    private readonly familyService: FamilyService,
    private readonly fileService: FileService, // Inject FileService
  ) {}

  @Post()
  async create(
    @Req() req: FamilyRequest,
    @Body() createDto: CreateFamilyDto & { userId?: string },
  ) {
    // Try to get userId from token first, then from body
    const userId = this.getUserId(req, createDto.userId);

    if (!userId) {
      throw new BadRequestException(
        'User ID not found. Please provide userId in request body.',
      );
    }

    return await this.familyService.create(userId, createDto);
  }

  @Post('upload-documents')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'deathCertificate', maxCount: 1 },
        { name: 'nationalId', maxCount: 1 },
        { name: 'consentForm', maxCount: 1 },
      ],
      {
        limits: { fileSize: 10 * 1024 * 1024 },
      },
    ),
  )
  async uploadDocuments(
    @Req() req: FamilyRequest,
    @UploadedFiles()
    files: {
      deathCertificate?: Express.Multer.File[];
      nationalId?: Express.Multer.File[];
      consentForm?: Express.Multer.File[];
    },
  ) {
    const userId = this.requireUserId(req);

    let deathCertificateUrl: string | undefined;
    let nationalIdUrl: string | undefined;
    let consentFormUrl: string | undefined;

    if (files.deathCertificate && files.deathCertificate[0]) {
      const uploadResult = await this.fileService.uploadFile(
        files.deathCertificate[0],
        'family-documents/death-certificates',
      );
      deathCertificateUrl = uploadResult.url;
    }

    if (files.nationalId && files.nationalId[0]) {
      const uploadResult = await this.fileService.uploadFile(
        files.nationalId[0],
        'family-documents/national-ids',
      );
      nationalIdUrl = uploadResult.url;
    }

    if (files.consentForm && files.consentForm[0]) {
      const uploadResult = await this.fileService.uploadFile(
        files.consentForm[0],
        'family-documents/consent-forms',
      );
      consentFormUrl = uploadResult.url;
    }

    return await this.familyService.updateDocuments(
      userId,
      deathCertificateUrl,
      nationalIdUrl,
      consentFormUrl,
    );
  }

  /**
   * Upload consent form only — does NOT require an existing family record.
   * Returns the URL so the frontend can include it in the submit payload.
   * The URL is then persisted to the family record via the submit endpoint.
   */
  @Post('upload-consent-form')
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'consentForm', maxCount: 1 }], {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadConsentForm(
    @UploadedFiles() files: { consentForm?: Express.Multer.File[] },
  ) {
    const file = files.consentForm?.[0];
    if (!file) {
      throw new BadRequestException('No consent form file provided');
    }
    const result = await this.fileService.uploadFile(
      file,
      'family-documents/consent-forms',
    );
    return { consentFormUrl: result.url };
  }

  @Get()
  //@Roles('admin', 'main_admin')
  async findAll(@Req() req: FamilyRequest) {
    this.assertAdmin(req);
    return await this.familyService.findAll();
  }

  @Get('my-family')
  async getMyFamily(@Req() req: FamilyRequest) {
    const userId = this.requireUserId(req);
    return await this.familyService.findByUserId(userId);
  }

  @Get('user/:userId')
  // @Roles('admin', 'main_admin')
  async findByUserId(
    @Param('userId') userId: string,
    @Req() req: FamilyRequest,
  ) {
    // Allow admins to view any user, regular users can only view their own
    const isAdmin = this.isAdmin(req);
    const currentUserId = this.getUserId(req);

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
  async findOne(@Param('id') id: string, @Req() req: FamilyRequest) {
    this.assertAdmin(req);
    return await this.familyService.findOne(id);
  }

  @Patch()
  async update(
    @Req() req: FamilyRequest,
    @Body() updateDto: UpdateFamilyDto & { userId?: string },
  ) {
    // Try to get userId from token first, then from body
    const userId = this.getUserId(req, updateDto.userId);

    if (!userId) {
      throw new BadRequestException('User ID not found');
    }

    return await this.familyService.updateByUserId(userId, updateDto);
  }

  @Patch(':id')
  //@Roles('admin', 'main_admin')
  async updateById(
    @Param('id') id: string,
    @Body() updateDto: UpdateFamilyDto,
    @Req() req: FamilyRequest,
  ) {
    this.assertAdmin(req);
    return await this.familyService.update(id, updateDto);
  }

  @Delete()
  async remove(@Req() req: FamilyRequest) {
    const userId = this.requireUserId(req);
    return await this.familyService.removeByUserId(userId);
  }

  @Delete(':id')
  //@Roles('admin', 'main_admin')
  async removeById(@Param('id') id: string, @Req() req: FamilyRequest) {
    this.assertAdmin(req);
    return await this.familyService.remove(id);
  }

  private assertAdmin(req: FamilyRequest): void {
    if (!this.isAdmin(req)) {
      throw new ForbiddenException('Admin access required');
    }
  }

  private isAdmin(req: FamilyRequest): boolean {
    return Boolean(
      req.user?.isAdmin || req.user?.is_admin || req.user?.role === 'admin',
    );
  }

  private getUserId(req: FamilyRequest, fallback?: string): string | undefined {
    return req.user?.userId || req.user?.id || fallback;
  }

  private requireUserId(req: FamilyRequest, fallback?: string): string {
    const userId = this.getUserId(req, fallback);

    if (!userId) {
      throw new BadRequestException('User ID not found');
    }

    return userId;
  }
}
