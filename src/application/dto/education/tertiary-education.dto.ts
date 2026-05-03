import { IsString, IsNumber, IsEnum, IsOptional, IsUrl, Min, Max, IsNotEmpty, IsBoolean } from 'class-validator';
import { FeePayer } from '../../entities/education.entity';

export class TertiaryEducationDto {
  @IsString()
  @IsNotEmpty()
  schoolName: string;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  tuitionFees: number;

  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear())
  @IsNotEmpty()
  yearCompleted: number;

  @IsEnum(FeePayer)
  @IsNotEmpty()
  whoPaidFees: FeePayer;

  @IsOptional()
  @IsString()
  otherPayerName?: string;

  @IsBoolean()
  @IsOptional()
  isSemesterBased?: boolean; // Default will be true for tertiary

  @IsOptional()
  @IsUrl()
  certificateUrl?: string;
}