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
  ForbiddenException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AcademicDetailService } from '../services/academic_details.service';
import { FileService } from '../../file/file.service';
import { CreateAcademicDetailDto, UpdateAcademicDetailDto } from '../dto/create_academic_details.dto';
import { AuthGuard } from '../../auth/auth.guard';
//import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('academic-details')
@UseGuards(AuthGuard)
export class AcademicDetailController {
  constructor(
    private readonly academicDetailService: AcademicDetailService,
    private readonly fileService: FileService, // Inject FileService
  ) {}

  @Post()
  async create(@Req() req, @Body() createDto: CreateAcademicDetailDto & { userId?: number }) {
    // Try to get userId from token first, then from body
    const userId = req.user?.userId || req.user?.id || createDto.userId;
    
    if (!userId) {
      throw new BadRequestException('User ID not found. Please provide userId in request body.');
    }
    
    return await this.academicDetailService.create(userId, createDto);
  }

  @Post('upload-transcript')
  @UseInterceptors(FileInterceptor('transcript'))
  async uploadTranscript(
    @Req() req,
    @UploadedFile() file: Express.Multer.File
  ) {
    const userId = req.user?.userId || req.user?.id;
    
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    
    // Upload transcript using FileService
    const uploadResult = await this.fileService.uploadFile(
      file, 
      'academic-documents/transcripts'
    );
    
    const transcriptPdfUrl = uploadResult.url;
    
    if (!transcriptPdfUrl) {
      throw new BadRequestException('Failed to upload transcript');
    }
    
    return await this.academicDetailService.updateTranscript(userId, transcriptPdfUrl);
  }

  @Get()
  //@Roles('admin', 'main_admin')
  async findAll() {
    return await this.academicDetailService.findAll();
  }

  @Get('my-details')
  async getMyDetails(@Req() req) {
    const userId = req.user?.userId || req.user?.id;
    return await this.academicDetailService.findByUserId(userId);
  }

  @Get('year-options')
  async getYearOptions() {
    return await this.academicDetailService.getYearOptions();
  }

  @Get('user/:userId')
  //@Roles('admin', 'main_admin')
  async findByUserId(@Param('userId') userId: string, @Req() req) {
    const isAdmin = req.user?.isAdmin || req.user?.is_admin;
    const currentUserId = req.user?.userId || req.user?.id;
    
    if (!isAdmin && userId !== currentUserId) {
      throw new ForbiddenException('You can only view your own academic details');
    }
    
    return await this.academicDetailService.findByUserId(userId);
  }

  @Get(':id')
  //@Roles('admin', 'main_admin')
  async findOne(@Param('id') id: string) {
    return await this.academicDetailService.findOne(id);
  }

  @Patch()
  async update(@Req() req, @Body() updateDto: UpdateAcademicDetailDto & { userId?: number }) {
    // Try to get userId from token first, then from body
    const userId = req.user?.userId || req.user?.id || updateDto.userId;
    
    if (!userId) {
      throw new BadRequestException('User ID not found');
    }
    
    return await this.academicDetailService.updateByUserId(userId, updateDto);
  }

  @Patch(':id')
  //@Roles('admin', 'main_admin')
  async updateById(@Param('id') id: string, @Body() updateDto: UpdateAcademicDetailDto) {
    return await this.academicDetailService.update(id, updateDto);
  }

  @Patch(':id/transcript')
  //@Roles('admin', 'main_admin')
  async updateTranscriptUrl(
    @Param('id') id: string,
    @Body('transcriptPdfUrl') transcriptPdfUrl: string
  ) {
    const academicDetail = await this.academicDetailService.findOne(id);
    academicDetail.transcriptPdfUrl = transcriptPdfUrl;
    return await this.academicDetailService.update(id, { transcriptPdfUrl });
  }

  @Delete()
  async remove(@Req() req) {
    const userId = req.user?.userId || req.user?.id;
    return await this.academicDetailService.removeByUserId(userId);
  }

  @Delete(':id')
  //@Roles('admin', 'main_admin')
  async removeById(@Param('id') id: string) {
    return await this.academicDetailService.remove(id);
  }
}