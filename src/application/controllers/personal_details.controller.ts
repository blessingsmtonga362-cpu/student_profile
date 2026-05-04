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
  UploadedFiles,
  ForbiddenException
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { PersonalDetailService } from '../services/personal_details.service';
import { FileService } from '../../file/file.service';
import { 
  CreatePersonalDetailDto, 
  UpdatePersonalDetailDto,
  UpdatePaymentDetailsDto
} from '../dto/create_personal_details.dto';
import { AuthGuard } from '../../auth/auth.guard';
//import { RolesGuard } from '../../auth/guards/roles.guard';
//import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('personal-details')
@UseGuards(AuthGuard) //i hv removed roles.guard
export class PersonalDetailController {
  constructor(
    private readonly personalDetailService: PersonalDetailService,
    private readonly fileService: FileService,
  ) {}

  @Post()
  async create(@Req() req, @Body() createDto: CreatePersonalDetailDto & { userId?: number }) {
    // Try to get userId from token first, then from body
    const userId = req.user?.userId || req.user?.id || createDto.userId;
    
    if (!userId) {
      throw new BadRequestException('User ID not found. Please provide userId in request body or ensure token is valid.');
    }
    
    return await this.personalDetailService.create(userId, createDto);
  }

  @Post('upload-documents')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'studentId', maxCount: 1 },
    { name: 'nationalId', maxCount: 1 },
  ]))
  async uploadDocuments(
    @Req() req,
    @UploadedFiles() files: {
      studentId?: Express.Multer.File[],
      nationalId?: Express.Multer.File[],
    }
  ) {
    const userId = req.user?.userId || req.user?.id;
    
    let studentIdUrl: string | undefined;
    let studentIdFilename: string | undefined;
    let nationalIdUrl: string | undefined;
    let nationalIdFilename: string | undefined;

    if (files.studentId && files.studentId[0]) {
      const uploadResult = await this.fileService.uploadFile(
        files.studentId[0], 
        'personal-documents/student-ids'
      );
      studentIdUrl = uploadResult.url;
      studentIdFilename = uploadResult.filename;
    }

    if (files.nationalId && files.nationalId[0]) {
      const uploadResult = await this.fileService.uploadFile(
        files.nationalId[0], 
        'personal-documents/national-ids'
      );
      nationalIdUrl = uploadResult.url;
      nationalIdFilename = uploadResult.filename;
    }

    return await this.personalDetailService.updateDocuments(
      userId,
      studentIdUrl,
      studentIdFilename,
      nationalIdUrl,
      nationalIdFilename
    );
  }

  @Get()
  //@Roles('admin', 'main_admin')
  async findAll() {
    return await this.personalDetailService.findAll();
  }

  @Get('my-details')
  async getMyDetails(@Req() req) {
    const userId = req.user?.userId || req.user?.id;
    return await this.personalDetailService.findByUserId(userId);
  }

  @Get('enums')
  async getEnums() {
    return {
      maritalStatuses: await this.personalDetailService.getMaritalStatuses(),
      genders: await this.personalDetailService.getGenders(),
      disabilities: await this.personalDetailService.getDisabilities(),
    };
  }

  @Get('user/:userId')
  //@Roles('admin', 'main_admin')
  async findByUserId(@Param('userId') userId: string) {
    return await this.personalDetailService.findByUserId(userId);
  }

  @Get(':id')
 // @Roles('admin', 'main_admin')
  async findOne(@Param('id') id: string) {
    return await this.personalDetailService.findOne(id);
  }

  @Patch()
  async update(@Req() req, @Body() updateDto: UpdatePersonalDetailDto) {
    const userId = req.user?.userId || req.user?.id;
    return await this.personalDetailService.updateByUserId(userId, updateDto);
  }

  @Patch('payment-details')
  async updatePaymentDetails(@Req() req, @Body() paymentDto: UpdatePaymentDetailsDto) {
    const userId = req.user?.userId || req.user?.id;
    return await this.personalDetailService.updatePaymentDetails(userId, paymentDto);
  }

  @Patch(':id')
  //@Roles('admin', 'main_admin')
  async updateById(@Param('id') id: string, @Body() updateDto: UpdatePersonalDetailDto) {
    return await this.personalDetailService.update(id, updateDto);
  }

  @Delete()
  async remove(@Req() req) {
    const userId = req.user?.userId || req.user?.id;
    return await this.personalDetailService.removeByUserId(userId);
  }

  @Delete(':id')
  //@Roles('admin', 'main_admin')
  async removeById(@Param('id') id: string) {
    return await this.personalDetailService.remove(id);
  }
}