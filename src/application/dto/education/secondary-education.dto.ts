import { IsString, IsNumber, IsEnum, IsOptional, IsUrl, Min, Max, IsNotEmpty } from 'class-validator';
import { FeePayer } from '../../entities/education.entity';

export class SecondaryEducationDto {
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

  @IsOptional()
  @IsUrl()
  certificateUrl?: string;
}