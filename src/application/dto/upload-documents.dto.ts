import { IsOptional, IsBoolean, IsString } from 'class-validator';

export class UploadDocumentsDto {
  @IsOptional()
  nationalId?: any;

  @IsOptional()
  studentId?: any;

  @IsOptional()
  guarantorNationalId?: any;

  @IsOptional()
  transcript?: any;

  @IsOptional()
  guarantorConsentForm?: any;

  @IsOptional()
  deathCertificate?: any;

  @IsOptional()
  @IsBoolean()
  hasParent?: boolean;

  @IsOptional()
  @IsString()
  reasonNoParent?: string;
}

export class DocumentUploadResponseDto {
  nationalId?: { url: string; filename: string; originalName: string };
  studentId?: { url: string; filename: string; originalName: string };
  guarantorNationalId?: { url: string; filename: string; originalName: string };
  transcript?: { url: string; filename: string; originalName: string };
  guarantorConsentForm?: { url: string; filename: string; originalName: string };
  deathCertificate?: { url: string; filename: string; originalName: string };
  uploadDate: Date;
  allVerified: boolean;
  verificationResults: any;
}