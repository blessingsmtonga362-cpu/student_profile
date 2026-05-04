import { Injectable } from '@nestjs/common';
import { FileService } from '../../file/file.service';
import { DocumentVerificationService } from '../../file/document-verification.service';

// Define the verification result interface
interface VerificationResult {
  isVerified: boolean;
  mismatches: string[]; 
  warnings: string[];
  extractedData: any;
}

@Injectable()
export class DocumentUploadService {
  constructor(
    private readonly fileService: FileService,
    private readonly verificationService: DocumentVerificationService,
  ) {}

  async uploadAndVerifyDocument(
    file: any,
    type: string,
    userId: string,
    userData: any,
  ) {
    let verification: VerificationResult | null = null; // Explicitly type as VerificationResult | null
    
    if (type === 'nationalId') {
      verification = await this.verificationService.verifyNationalId(
        file,
        userData,
        userId,
      ) as VerificationResult; // Add type assertion
    } else if (type === 'studentId') {
      verification = await this.verificationService.verifyStudentId(
        file,
        userData,
        userId,
      ) as VerificationResult; // Add type assertion
    }

    if (verification && !verification.isVerified) {
      return {
        success: false,
        verification,
      };
    }

    const uploadResult = await this.fileService.uploadFile(
      file,
      `documents/${type}s`,
      `${type}-${userId}`,
    );

    return {
      success: true,
      uploadResult,
      verification,
    };
  }
}