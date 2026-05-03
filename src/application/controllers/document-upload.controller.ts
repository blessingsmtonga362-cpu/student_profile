import { 
  Controller, 
  Post, 
  UseInterceptors, 
  UploadedFiles, 
  Body, 
  UseGuards, 
  Req,
  BadRequestException,
  Get,
  Param
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../../auth/auth.guard';
//import { RolesGuard } from '../../auth/guards/roles.guard';
//import { Roles } from '../../auth/decorators/roles.decorator';
import { FileService } from '../../file/file.service';
import { DocumentVerificationService } from '../../file/document-verification.service';
import { UploadDocumentsDto, DocumentUploadResponseDto } from '../dto/upload-documents.dto';

@Controller('documents')
@UseGuards(AuthGuard)
export class DocumentUploadController {
  constructor(
    private readonly fileService: FileService,
    private readonly verificationService: DocumentVerificationService,
  ) {}

  @Post('upload-all')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'nationalId', maxCount: 1 },
    { name: 'studentId', maxCount: 1 },
    { name: 'guarantorNationalId', maxCount: 1 },
    { name: 'transcript', maxCount: 1 },
    { name: 'guarantorConsentForm', maxCount: 1 },
    { name: 'deathCertificate', maxCount: 1 },
  ]))
  async uploadAllDocuments(
    @Req() req,
    @UploadedFiles() files: {
      nationalId?: Express.Multer.File[];
      studentId?: Express.Multer.File[];
      guarantorNationalId?: Express.Multer.File[];
      transcript?: Express.Multer.File[];
      guarantorConsentForm?: Express.Multer.File[];
      deathCertificate?: Express.Multer.File[];
    },
    @Body() uploadDto: UploadDocumentsDto,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const response: DocumentUploadResponseDto = {
      uploadDate: new Date(),
      allVerified: true,
      verificationResults: {},
    };

    const verificationErrors: string[] = [];

    // 1. Upload and Verify National ID
    if (files.nationalId && files.nationalId[0]) {
      try {
        const verification = await this.verificationService.verifyNationalId(
          files.nationalId[0],
          {
            firstName: req.user?.firstName || '',
            lastName: req.user?.lastName || '',
            nationalIdNumber: req.user?.nationalIdNumber || '',
          },
          userId
        );

        response.verificationResults.nationalId = verification;

        if (verification.isVerified) {
          const uploadResult = await this.fileService.uploadFile(
            files.nationalId[0],
            'documents/national-ids',
            `national-id-${userId}`
          );
          response.nationalId = uploadResult;
        } else {
          response.allVerified = false;
          verificationErrors.push(...verification.mismatches);
        }
      } catch (error) {
        verificationErrors.push(`National ID verification failed: ${error.message}`);
        response.allVerified = false;
      }
    }

    // 2. Upload and Verify Student ID
    if (files.studentId && files.studentId[0]) {
      try {
        const verification = await this.verificationService.verifyStudentId(
          files.studentId[0],
          {
            firstName: req.user?.firstName || '',
            lastName: req.user?.lastName || '',
            registrationNumber: req.user?.registrationNumber || '',
          },
          userId
        );

        response.verificationResults.studentId = verification;

        if (verification.isVerified) {
          const uploadResult = await this.fileService.uploadFile(
            files.studentId[0],
            'documents/student-ids',
            `student-id-${userId}`
          );
          response.studentId = uploadResult;
        } else {
          response.allVerified = false;
          verificationErrors.push(...verification.mismatches);
        }
      } catch (error) {
        verificationErrors.push(`Student ID verification failed: ${error.message}`);
        response.allVerified = false;
      }
    }

    // 3. Upload Transcript (no verification needed)
    if (files.transcript && files.transcript[0]) {
      const uploadResult = await this.fileService.uploadFile(
        files.transcript[0],
        'documents/transcripts',
        `transcript-${userId}`
      );
      response.transcript = uploadResult;
    }

    // 4. Upload Guarantor Documents (if no parent)
    if (!uploadDto.hasParent) {
      if (files.guarantorNationalId && files.guarantorNationalId[0]) {
        const uploadResult = await this.fileService.uploadFile(
          files.guarantorNationalId[0],
          'documents/guarantor',
          `guarantor-national-id-${userId}`
        );
        response.guarantorNationalId = uploadResult;
      }

      if (files.guarantorConsentForm && files.guarantorConsentForm[0]) {
        const uploadResult = await this.fileService.uploadFile(
          files.guarantorConsentForm[0],
          'documents/guarantor',
          `guarantor-consent-${userId}`
        );
        response.guarantorConsentForm = uploadResult;
      }

      if (files.deathCertificate && files.deathCertificate[0]) {
        const uploadResult = await this.fileService.uploadFile(
          files.deathCertificate[0],
          'documents/death-certificates',
          `death-certificate-${userId}`
        );
        response.deathCertificate = uploadResult;
      }
    }

    // If any verification failed, throw error with details
    if (!response.allVerified) {
      throw new BadRequestException({
        message: 'Document verification failed. Please check your documents.',
        verificationErrors,
        verificationResults: response.verificationResults,
        requiredAction: 'Please ensure all documents match the information you provided.',
      });
    }

    return {
      message: 'All documents uploaded and verified successfully',
      data: response,
    };
  }

  // Get user documents (for admin)
  @Get('user/:userId')
  //@Roles('admin', 'main_admin')
  async getUserDocuments(@Param('userId') userId: string) {
    // This would fetch all documents for a user from the database
    // You'll need to store document references in your user/application tables
    return {
      message: `Documents for user ${userId}`,
      // Return document URLs from database
    };
  }

  // Get verification logs (for admin)
  @Get('verification-logs/:userId')
  //@Roles('admin', 'main_admin')
  async getVerificationLogs(@Param('userId') userId: string) {
    // This would fetch verification logs from the database
    return {
      message: `Verification logs for user ${userId}`,
    };
  }
}