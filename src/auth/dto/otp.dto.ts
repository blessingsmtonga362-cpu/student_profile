import { IsString, IsEmail, Length, IsOptional } from 'class-validator';

export class SendOtpDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  purpose?: string;
}

export class VerifyOtpDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  code!: string;

  @IsOptional()
  @IsString()
  purpose?: string;
}

export class OtpResponseDto {
  success!: boolean;
  message!: string;
  expiresIn?: number; // seconds until OTP expires
  verified?: boolean;
}
