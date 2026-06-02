import { IsString, IsPhoneNumber, Length, IsOptional } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @IsPhoneNumber('MW') // Malawi phone number
  phoneNumber: string;

  @IsOptional()
  @IsString()
  purpose?: string; // 'phone_verification', 'application_submission'
}

export class VerifyOtpDto {
  @IsString()
  @IsPhoneNumber('MW')
  phoneNumber: string;

  @IsString()
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  code: string;

  @IsOptional()
  @IsString()
  purpose?: string;
}

export class OtpResponseDto {
  success: boolean;
  message: string;
  expiresIn?: number; // seconds until OTP expires
  verified?: boolean;
}
