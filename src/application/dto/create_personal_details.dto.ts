import { 
  IsString, 
  IsEmail, 
  IsEnum, 
  IsOptional, 
  IsPhoneNumber,
  IsDateString,
  MinLength,
  MaxLength,
  IsUrl,
  IsNotEmpty,
  Matches
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { MaritalStatus, Gender, Disability } from '../entities/personal_details.entity';

export class CreatePersonalDetailDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @IsPhoneNumber()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(50)
  nationalIdNumber: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  homeDistrict: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  traditionalAuthority: string;

  @IsString()
  @IsNotEmpty()
  physicalAddress: string;

  @IsDateString()
  @IsNotEmpty()
  dateOfBirth: Date;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9]{6,20}$/i, {
    message: 'Registration number must be alphanumeric and 6-20 characters long'
  })
  registrationNumber: string;

  // ✅ FIX: Only ONE disability declaration - make it optional
  @IsOptional()
  @IsEnum(Disability)
  disability?: Disability;

  @IsOptional()
  @IsUrl()
  studentIdPdfUrl?: string;

  @IsOptional()
  @IsString()
  studentIdFilename?: string;

  @IsOptional()
  @IsUrl()
  nationalIdPdfUrl?: string;

  @IsOptional()
  @IsString()
  nationalIdFilename?: string;

  @IsEnum(MaritalStatus)
  @IsNotEmpty()
  maritalStatus: MaritalStatus;

  @IsEnum(Gender)
  @IsNotEmpty()
  gender: Gender;

  @IsOptional()
  @IsString()
  paymentBranch?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankAccount?: string;

  @IsOptional()
  @IsString()
  accountName?: string;
}

export class UpdatePersonalDetailDto extends PartialType(CreatePersonalDetailDto) {}

export class UploadPersonalDocumentsDto {
  @IsOptional()
  studentId?: any;

  @IsOptional()
  nationalId?: any;
}

export class UpdatePaymentDetailsDto {
  @IsOptional()
  @IsString()
  paymentBranch?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankAccount?: string;

  @IsOptional()
  @IsString()
  accountName?: string;
}