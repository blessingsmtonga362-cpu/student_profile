import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max, IsUrl } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateAcademicDetailDto {
  @IsString()
  @IsNotEmpty()
  programOfStudy!: string;

  @IsString()
  @IsNotEmpty()
  department!: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(6)
  yearOfStudy!: number;

  @IsUrl()
  @IsOptional()
  transcriptPdfUrl?: string;
}

export class UpdateAcademicDetailDto extends PartialType(CreateAcademicDetailDto) {}

export class UploadTranscriptDto {
  @IsUrl()
  transcriptPdfUrl!: string;
}