import { IsString, IsNumber, IsEnum, IsOptional, IsUrl, Min, Max } from 'class-validator';
import { FeePayer } from '../../entities/education.entity';

export class PrimaryEducationDto {
  @IsString()
  schoolName: string;

  @IsNumber()
  @Min(0)
  tuitionFees: number;

  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear())
  yearCompleted: number;

  @IsEnum(FeePayer)
  whoPaidFees: FeePayer;

  @IsOptional()
  @IsString()
  otherPayerName?: string;

  @IsOptional()
  @IsUrl()
  certificateUrl?: string;

  @IsOptional()
  @IsString()
  certificateFilename?: string;

  @IsOptional()
  @IsString()
  description?: string;
}