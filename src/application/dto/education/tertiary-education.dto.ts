import { IsString, IsNumber, IsEnum, IsOptional, IsUrl, Min, Max, IsBoolean } from 'class-validator';
import { FeePayer } from '../../entities/education.entity';

export class TertiaryEducationDto {
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

  @IsOptional()
  @IsBoolean()
  isSemesterBased?: boolean;

  @IsString()
  programOfStudy: string;

  @IsNumber()
  @Min(1)
  @Max(6)
  yearOfStudy: number;

  @IsString()
  department: string;
}