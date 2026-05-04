import { 
  IsString, 
  IsEmail, 
  IsEnum, 
  IsOptional, 
  IsDateString,
  IsUrl,
  MinLength,
  MaxLength,
  IsNotEmpty
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { EducationLevel } from '../entities/family.entity';

export class CreateFamilyDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  guardianFirstName!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  guardianLastName!: string;

  @IsString()
  @IsOptional()
  profession?: string;

  @IsDateString()
  @IsNotEmpty()
  dateOfBirth!: Date;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  traditionalAuthority!: string;

  @IsString()
  @IsNotEmpty()
  residenceAddress!: string;

  @IsString()
  @IsOptional()
  postalAddress?: string;

  @IsEnum(EducationLevel)
  @IsNotEmpty()
  levelOfEducation!: EducationLevel;

  @IsUrl()
  @IsOptional()
  deathCertificateUrl?: string;

  @IsUrl()
  @IsOptional()
  nationalIdUrl?: string;

  @IsUrl()
  @IsOptional()
  consentFormUrl?: string;
}

export class UpdateFamilyDto extends PartialType(CreateFamilyDto) {}

export class UploadFamilyDocumentsDto {
  @IsOptional()
  deathCertificate?: any; // For file upload

  @IsOptional()
  nationalId?: any; // For file upload

  @IsOptional()
  consentForm?: any; // For file upload
}