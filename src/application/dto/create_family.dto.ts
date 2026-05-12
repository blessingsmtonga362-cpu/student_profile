import { 
  IsString, 
  IsEmail, 
  IsEnum, 
  IsOptional, 
  IsDateString,
  IsUrl,
  IsInt,
  Min
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { EducationLevel } from '../entities/family.entity';

export class CreateFamilyDto {
  @IsOptional()
  @IsString()
  parentalStatus?: string;

  @IsOptional()
  @IsString()
  fatherFirstName?: string;

  @IsOptional()
  @IsString()
  fatherSurname?: string;

  @IsOptional()
  @IsString()
  fatherNationalId?: string;

  @IsOptional()
  @IsString()
  fatherPhone?: string;

  @IsString()
  @IsOptional()
  fatherProfession?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  fatherMonthlyIncome?: number;

  @IsOptional()
  @IsString()
  fatherTa?: string;

  @IsOptional()
  @IsString()
  fatherResidentialAddress?: string;

  @IsOptional()
  @IsString()
  fatherPostalAddress?: string;

  @IsOptional()
  @IsString()
  motherFirstName?: string;

  @IsOptional()
  @IsString()
  motherSurname?: string;

  @IsOptional()
  @IsString()
  motherNationalId?: string;

  @IsOptional()
  @IsString()
  motherPhone?: string;

  @IsOptional()
  @IsString()
  motherProfession?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  motherMonthlyIncome?: number;

  @IsOptional()
  @IsString()
  motherTa?: string;

  @IsOptional()
  @IsString()
  motherResidentialAddress?: string;

  @IsOptional()
  @IsString()
  motherPostalAddress?: string;

  @IsOptional()
  @IsString()
  parentFirstName?: string;

  @IsOptional()
  @IsString()
  parentSurname?: string;

  @IsOptional()
  @IsString()
  parentNationalId?: string;

  @IsOptional()
  @IsString()
  parentPhone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  parentMonthlyIncome?: number;

  @IsOptional()
  @IsString()
  studentRelationship?: string;

  @IsOptional()
  @IsString()
  parentTa?: string;

  @IsOptional()
  @IsString()
  parentResidentialAddress?: string;

  @IsOptional()
  @IsString()
  parentPostalAddress?: string;

  @IsOptional()
  @IsString()
  deceasedParentId?: string;

  @IsOptional()
  @IsString()
  guardianFirstName?: string;

  @IsOptional()
  @IsString()
  guardianLastName?: string;

  @IsOptional()
  @IsString()
  guardianNationalId?: string;

  @IsOptional()
  @IsString()
  guardianPhone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  guardianMonthlyIncome?: number;

  @IsOptional()
  @IsString()
  relationshipToGuardian?: string;

  @IsOptional()
  @IsString()
  guardianTa?: string;

  @IsOptional()
  @IsString()
  guardianResidentialAddress?: string;

  @IsOptional()
  @IsString()
  guardianPostalAddress?: string;

  @IsOptional()
  @IsString()
  deceasedFatherId?: string;

  @IsOptional()
  @IsString()
  deceasedMotherId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  numberOfSiblings?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  numberStillInSchool?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  siblingsInPrimary?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  siblingsInSecondary?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  siblingsInTertiary?: number;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: Date;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  traditionalAuthority!: string;

  @IsString()
  @IsOptional()
  residenceAddress?: string;

  @IsString()
  @IsOptional()
  postalAddress?: string;

  @IsEnum(EducationLevel)
  @IsOptional()
  levelOfEducation?: EducationLevel;

  @IsUrl()
  @IsOptional()
  deathCertificateUrl?: string;

  @IsUrl()
  @IsOptional()
  nationalIdUrl?: string;

  @IsUrl()
  @IsOptional()
  consentFormUrl?: string;

  @IsOptional()
  @IsString()
  profession?: string;
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
