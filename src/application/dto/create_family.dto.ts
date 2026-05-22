import { 
  IsString, 
  IsEmail, 
  IsEnum, 
  IsOptional, 
  IsDateString,
  IsUrl,
  IsInt,
  Min,
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { EducationLevel } from '../entities/family.entity';

// Custom validator for sibling numbers
@ValidatorConstraint({ async: false })
export class SiblingNumbersConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const object = args.object as any;
    const numberStillInSchool = object.numberStillInSchool;
    const siblingsInPrimary = object.siblingsInPrimary || 0;
    const siblingsInSecondary = object.siblingsInSecondary || 0;
    const siblingsInTertiary = object.siblingsInTertiary || 0;
    
    // Skip validation if any of the required fields are missing
    if (numberStillInSchool === undefined || 
        object.siblingsInPrimary === undefined || 
        object.siblingsInSecondary === undefined || 
        object.siblingsInTertiary === undefined) {
      return true;
    }
    
    const calculatedTotal = siblingsInPrimary + siblingsInSecondary + siblingsInTertiary;
    return numberStillInSchool === calculatedTotal;
  }

  defaultMessage(args: ValidationArguments) {
    const object = args.object as any;
    const calculatedTotal = (object.siblingsInPrimary || 0) + 
                           (object.siblingsInSecondary || 0) + 
                           (object.siblingsInTertiary || 0);
    return `Number of siblings still in school (${object.numberStillInSchool}) must equal the sum of siblings in primary, secondary, and tertiary (${calculatedTotal})`;
  }
}

export function ValidateSiblingNumbers(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: SiblingNumbersConstraint,
    });
  };
}

export class CreateFamilyDto {
  // Parental Status
  @IsOptional()
  @IsString()
  parentalStatus?: string;

  // Father's Information
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

  @IsOptional()
  @IsString()
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

  // Mother's Information
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

  // Single Parent Information
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

  // Guardian Information
  @IsOptional()
  @IsString()
  guardianFirstName?: string;

  @IsOptional()
  @IsString()
  guardianSurname?: string;

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

  // Siblings Information with Validation
  @IsOptional()
  @IsInt()
  @Min(0)
  numberOfSiblings?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ValidateSiblingNumbers()
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

  // Guardian Personal Details
  @IsDateString()
  @IsOptional()
  dateOfBirth?: Date;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  traditionalAuthority?: string;

  @IsString()
  @IsOptional()
  residenceAddress?: string;

  @IsString()
  @IsOptional()
  postalAddress?: string;

  @IsEnum(EducationLevel)
  @IsOptional()
  levelOfEducation?: EducationLevel;

  @IsOptional()
  @IsString()
  profession?: string;

  // Document URLs
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
  deathCertificate?: any;

  @IsOptional()
  nationalId?: any;

  @IsOptional()
  consentForm?: any;
}