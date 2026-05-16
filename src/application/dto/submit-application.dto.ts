
import { 
  IsNotEmpty, 
  IsOptional, 
  IsString, 
  IsEmail, 
  IsPhoneNumber,
  IsDateString,
  IsNumber,
  Min,
  Max,
  ValidateNested,
  IsObject,
  IsBoolean
} from 'class-validator';
import { Type } from 'class-transformer';

export class PersonalDetailsDto {
  @IsNotEmpty({ message: 'First name is required' })
  @IsString()
  firstName: string;

  @IsNotEmpty({ message: 'Last name is required' })
  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  otherNames?: string;

  @IsNotEmpty({ message: 'Date of birth is required' })
  @IsDateString()
  dateOfBirth: string;

  @IsNotEmpty({ message: 'Gender is required' })
  @IsString()
  gender: string;

  @IsNotEmpty({ message: 'Marital status is required' })
  @IsString()
  maritalStatus: string;

  @IsNotEmpty({ message: 'National ID number is required' })
  @IsString()
  nationalIdNumber: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsNotEmpty({ message: 'Phone number is required' })
  @IsPhoneNumber()
  phoneNumber: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsNotEmpty({ message: 'Home district is required' })
  @IsString()
  homeDistrict: string;

  @IsNotEmpty({ message: 'Traditional Authority is required' })
  @IsString()
  traditionalAuthority: string;

  @IsNotEmpty({ message: 'Physical address is required' })
  @IsString()
  physicalAddress: string;

  @IsOptional()
  @IsString()
  disability?: string;
}

export class AcademicDetailsDto {
  @IsNotEmpty({ message: 'Program of study is required' })
  @IsString()
  programOfStudy: string;

  @IsNotEmpty({ message: 'Department is required' })
  @IsString()
  department: string;

  @IsNotEmpty({ message: 'Year of study is required' })
  @IsNumber()
  @Min(1)
  @Max(6)
  yearOfStudy: number;

  @IsOptional()
  @IsString()
  transcriptUrl?: string;
}

export class ParentInfoDto {
  @IsNotEmpty({ message: 'Mother\'s full name is required' })
  @IsString()
  motherFullName: string;

  @IsNotEmpty({ message: 'Mother\'s occupation is required' })
  @IsString()
  motherOccupation: string;

  @IsNotEmpty({ message: 'Mother\'s phone number is required' })
  @IsPhoneNumber()
  motherPhone: string;

  @IsNotEmpty({ message: 'Father\'s full name is required' })
  @IsString()
  fatherFullName: string;

  @IsNotEmpty({ message: 'Father\'s occupation is required' })
  @IsString()
  fatherOccupation: string;

  @IsNotEmpty({ message: 'Father\'s phone number is required' })
  @IsPhoneNumber()
  fatherPhone: string;
}

export class GuarantorInfoDto {
  @IsNotEmpty({ message: 'Guarantor full name is required' })
  @IsString()
  guarantorFullName: string;

  @IsNotEmpty({ message: 'Guarantor national ID is required' })
  @IsString()
  guarantorNationalId: string;

  @IsNotEmpty({ message: 'Guarantor phone number is required' })
  @IsPhoneNumber()
  guarantorPhone: string;

  @IsNotEmpty({ message: 'Guarantor address is required' })
  @IsString()
  guarantorAddress: string;

  @IsNotEmpty({ message: 'Relationship to applicant is required' })
  @IsString()
  relationshipToApplicant: string;
}

export class FamilyDetailsDto {
  @IsOptional()
  @IsBoolean()
  hasParents?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => ParentInfoDto)
  parents?: ParentInfoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => GuarantorInfoDto)
  guarantor?: GuarantorInfoDto;
}

export class EducationEntryDto {
  @IsNotEmpty({ message: 'School name is required' })
  @IsString()
  schoolName: string;

  @IsNotEmpty({ message: 'Tuition fee is required' })
  @IsNumber()
  @Min(0)
  tuitionFees: number;

  @IsNotEmpty({ message: 'Year completed is required' })
  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear())
  yearCompleted: number;

  @IsNotEmpty({ message: 'Who paid fees is required' })
  @IsString()
  whoPaidFees: string;

  @IsOptional()
  @IsString()
  otherPayerName?: string;
}

export class EducationDetailsDto {
  @ValidateNested()
  @Type(() => EducationEntryDto)
  primary: EducationEntryDto;

  @ValidateNested()
  @Type(() => EducationEntryDto)
  secondary: EducationEntryDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EducationEntryDto)
  tertiary?: EducationEntryDto;
}

// Main Submission DTO
export class SubmitApplicationDto {
  @ValidateNested()
  @Type(() => PersonalDetailsDto)
  @IsObject({ message: 'Personal details are required' })
  personal: PersonalDetailsDto;

  @ValidateNested()
  @Type(() => AcademicDetailsDto)
  @IsObject({ message: 'Academic details are required' })
  academic: AcademicDetailsDto;

  @ValidateNested()
  @Type(() => FamilyDetailsDto)
  @IsObject({ message: 'Family details are required' })
  family: FamilyDetailsDto;

  @ValidateNested()
  @Type(() => EducationDetailsDto)
  @IsObject({ message: 'Education details are required' })
  education: EducationDetailsDto;
}