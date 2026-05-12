import { IsEnum, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export enum AdminApplicationReviewStatus {
  APPROVED = 'approved',
  FLAGGED = 'flagged',
}

export class CreateAdminDto {
  @IsEnum(AdminApplicationReviewStatus)
  status!: AdminApplicationReviewStatus;

  @ValidateIf((dto: CreateAdminDto) => dto.status === AdminApplicationReviewStatus.FLAGGED)
  @IsString()
  @MaxLength(1000)
  reviewComments!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewerNote?: string;
}
