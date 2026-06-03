import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  Matches,
  MaxLength,
  IsIn,
  ValidateIf,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { MaritalStatus, Gender, Disability } from '../entities/personal_details.entity';

export enum PaymentMethod {
  AIRTEL_MONEY = 'airtel',
  TNM_MPAMBA = 'tnm',
  NATIONAL_BANK = 'national',
  STANDARD_BANK = 'standard',
}

/**
 * Malawi phone numbers in international format: +265 followed by 9 digits starting with 8 or 9.
 * Matches frontend rule: /^\+265[89]\d{8}$/
 */
const MALAWI_PHONE_REGEX = /^\+265[89]\d{8}$/;
const MALAWI_PHONE_MESSAGE = 'Enter a valid Malawi number (e.g. +265991234567).';

/**
 * National ID: exactly 8 uppercase alphanumeric characters.
 * Matches frontend rule: /^[A-Z0-9]{8}$/
 */
const NATIONAL_ID_REGEX = /^[A-Z0-9]{8}$/;
const NATIONAL_ID_MESSAGE = 'Enter exactly 8 uppercase letters or numbers.';

export class CreatePersonalDetailDto {
  @IsNotEmpty({ message: 'First name is required.' })
  @IsString()
  @MaxLength(15)
  firstName: string;

  @IsNotEmpty({ message: 'Surname is required.' })
  @IsString()
  @MaxLength(15)
  lastName: string;

  @IsNotEmpty({ message: 'Phone number is required.' })
  @Matches(MALAWI_PHONE_REGEX, { message: MALAWI_PHONE_MESSAGE })
  phoneNumber: string;

  @IsNotEmpty({ message: 'National ID number is required.' })
  @Matches(NATIONAL_ID_REGEX, { message: NATIONAL_ID_MESSAGE })
  nationalIdNumber: string;

  @IsNotEmpty({ message: 'Home district is required.' })
  @IsString()
  @MaxLength(20)
  homeDistrict: string;

  @IsNotEmpty({ message: 'Traditional Authority is required.' })
  @IsString()
  @MaxLength(20)
  traditionalAuthority: string;

  @IsNotEmpty({ message: 'Physical address is required.' })
  @IsString()
  physicalAddress: string;

  /**
   * Date of birth — must be a valid ISO date string and the applicant must be
   * at least 12 years old (mirrors the frontend getDateInputMaxForAge(12) rule).
   */
  @IsNotEmpty({ message: 'Date of birth is required.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date of birth must be in YYYY-MM-DD format.' })
  dateOfBirth: Date;

  @IsNotEmpty({ message: 'Registration number is required.' })
  @IsString()
  @MaxLength(15)
  registrationNumber: string;

  @IsNotEmpty({ message: 'Marital status is required.' })
  @IsIn(['Single', 'Married', 'Divorced'], {
    message: 'Marital status must be Single, Married, or Divorced.',
  })
  maritalStatus: MaritalStatus;

  @IsNotEmpty({ message: 'Gender is required.' })
  @IsIn(['Male', 'Female'], { message: 'Gender must be Male or Female.' })
  gender: Gender;

  @IsOptional()
  @IsEnum(Disability)
  disability?: Disability;

  // Document URLs are set internally after upload — not validated from the client
  @IsOptional()
  @IsString()
  studentIdPdfUrl?: string;

  @IsOptional()
  @IsString()
  studentIdFilename?: string;

  @IsOptional()
  @IsString()
  nationalIdPdfUrl?: string;

  @IsOptional()
  @IsString()
  nationalIdFilename?: string;

  // ── Payment details ────────────────────────────────────────────────────────

  @IsOptional()
  @IsEnum(PaymentMethod, {
    message: 'Payment method must be airtel, tnm, national, or standard.',
  })
  paymentMethod?: PaymentMethod;

  /**
   * Mobile money phone — required when payment method is Airtel or TNM.
   * Must be a valid Malawi number.
   */
  @ValidateIf((o) => o.paymentMethod === PaymentMethod.AIRTEL_MONEY || o.paymentMethod === PaymentMethod.TNM_MPAMBA)
  @IsNotEmpty({ message: 'Payment phone number is required for mobile money.' })
  @Matches(MALAWI_PHONE_REGEX, { message: MALAWI_PHONE_MESSAGE })
  paymentPhoneNumber?: string;

  /**
   * Account name — required when a payment method is provided.
   */
  @ValidateIf((o) => !!o.paymentMethod)
  @IsNotEmpty({ message: 'Account name is required.' })
  @IsString()
  @MaxLength(20)
  accountName?: string;

  /**
   * Bank account number — required when payment method is National Bank or Standard Bank.
   */
  @ValidateIf((o) => o.paymentMethod === PaymentMethod.NATIONAL_BANK || o.paymentMethod === PaymentMethod.STANDARD_BANK)
  @IsNotEmpty({ message: 'Bank account number is required for bank transfers.' })
  @IsString()
  @MaxLength(15)
  bankAccount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  paymentBranch?: string;
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

  @IsOptional()
  @Matches(MALAWI_PHONE_REGEX, { message: MALAWI_PHONE_MESSAGE })
  paymentPhoneNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  bankAccount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  accountName?: string;
}
