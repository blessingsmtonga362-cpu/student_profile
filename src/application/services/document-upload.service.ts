
import { Injectable } from '@nestjs/common';
import { FileService } from '../../file/file.service';
import { DocumentVerificationService } from '../../file/document-verification.service';

@Injectable()
export class DocumentUploadService {
  constructor(
    private readonly fileService: FileService,
    private readonly verificationService: DocumentVerificationService,
  ) {}

  async uploadAndVerifyConsentForm(
    file: any,
    userId: string,
    familyData: {
      fatherFirstName?: string;
      fatherSurname?: string;
      motherFirstName?: string;
      motherSurname?: string;
      guardianFirstName?: string;
      guardianSurname?: string;
    }
  ) {
    // First verify the consent form
    const verification = await this.verificationService.verifyConsentForm(
      file,
      familyData,
      userId,
    );

    if (!verification.isVerified) {
      return {
        success: false,
        verification,
      };
    }

    // Then upload the file
    const uploadResult = await this.fileService.uploadFile(
      file,
      'documents/consent-forms',
      `consent-form-${userId}`,
    );

    return {
      success: true,
      uploadResult,
      verification,
    };
  }
}