import { 
  Controller, 
  Post, 
  UseInterceptors, 
  UploadedFile, 
  Body, 
  UseGuards, 
  Req,
  BadRequestException 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../../auth/auth.guard';
import { FileService } from '../../file/file.service';
import { DocumentVerificationService } from '../../file/document-verification.service';

@Controller('documents')
@UseGuards(AuthGuard)
export class DocumentUploadController {
  constructor(
    private readonly fileService: FileService,
    private readonly verificationService: DocumentVerificationService,
  ) {}

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

    // At least one parent/guardian info must be provided
    if (!body.fatherFirstName && !body.motherFirstName && !body.guardianFirstName) {
      throw new BadRequestException(
        'At least one parent or guardian information must be provided for verification'
      );
    }

    // Verify consent form
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
      'documents/consent-forms',
      `consent-form-${userId}`
    );

    return {
      success: true,
      message: 'Consent form uploaded and verified successfully',
      matchedWith: verification.matchedWith,
      extractedData: verification.extractedData,
      fileUrl: uploadResult.url,
    };
  }
}