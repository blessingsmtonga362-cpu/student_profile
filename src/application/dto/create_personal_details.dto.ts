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
  Matches,
  ValidateIf,
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { MaritalStatus, Gender, Disability } from '../entities/personal_details.entity';

// validating number
@ValidatorConstraint({ async: false })
export class PaymentPhoneConstraint implements ValidatorConstraintInterface {
  validate(phoneNumber: string, args: ValidationArguments) {
    const object = args.object as any;
    const paymentMethod = object.paymentMethod;
    
    if (!phoneNumber) return true; // Allow empty if not required
    
    // Remove any non-digit characters
    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    
    // Take last 10 digits (in case user includes country code)
    const last10Digits = cleanedNumber.slice(-10);
    
    // tnm mpamba izitheke nd 08 kmaso akhala 10 numbers
    if (paymentMethod === 'tnm' || paymentMethod === 'tnm_mpamba') {
      return /^08\d{8}$/.test(last10Digits);
    }
    
    // Airtel Money izitheke ndi 09 kmaso akhala 10 numbers
    if (paymentMethod === 'airtel' || paymentMethod === 'airtel_money') {
      return /^09\d{8}$/.test(last10Digits);
    }
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const object = args.object as any;
    const paymentMethod = object.paymentMethod;
    
    if (paymentMethod === 'tnm' || paymentMethod === 'tnm_mpamba') {
      return 'TNM Mpamba number must start with 08 and be exactly 10 digits long (e.g., 0886663959)';
    }
    if (paymentMethod === 'airtel' || paymentMethod === 'airtel_money') {
      return 'Airtel Money number must start with 09 and be exactly 10 digits long (e.g., 0996663959)';
    }
    return 'Invalid phone number format for selected payment method';
  }
}

export function IsPaymentPhone(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: PaymentPhoneConstraint,
    });
  };
}

export enum PaymentMethod {
  AIRTEL_MONEY = 'airtel',
  TNM_MPAMBA = 'tnm',
  NATIONAL_BANK = 'national',
  STANDARD_BANK = 'standard',
}

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
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ValidateIf(o => o.paymentMethod === PaymentMethod.AIRTEL_MONEY || o.paymentMethod === PaymentMethod.TNM_MPAMBA)
  @IsPaymentPhone()
  @IsString()
  paymentPhoneNumber?: string;

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
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ValidateIf(o => o.paymentMethod === PaymentMethod.AIRTEL_MONEY || o.paymentMethod === PaymentMethod.TNM_MPAMBA)
  @IsPaymentPhone()
  @IsString()
  paymentPhoneNumber?: string;

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