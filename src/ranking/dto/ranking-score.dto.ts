import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ScoreCalculationResultDto {
  score!: number;
  isFlagged!: boolean;
  flagReason!: string | null;
}

export class GpaScoreLookupDto {
  gpa!: number;
  academicScore!: number;
  isFlagged!: boolean;
}

export class SchoolStudentScoreDto {
  registrationNumber!: string;
  foundInSchoolDatabase!: boolean;
  isRegistered!: boolean;
  schoolStatus!: string | null;
  gpa!: number | null;
  academicScore!: number;
  isFlagged!: boolean;
  flagReason!: string | null;
  studentName!: string | null;
  department!: string | null;
  yearOfStudy!: number | null;
}

export class NrbVerificationDto {
  nationalId!: string;
  foundInNrbDatabase!: boolean;
  fullName!: string | null;
  status!: string | null;
  isDeceased!: boolean;
  isFlagged!: boolean;
  flagReason!: string | null;
}

export class FamilyBackgroundScoreInputDto {
  @IsOptional()
  @IsString()
  parentalStatus?: string;

  @IsOptional()
  @IsNumber()
  fatherMonthlyIncome?: number | null;

  @IsOptional()
  @IsNumber()
  motherMonthlyIncome?: number | null;

  @IsOptional()
  @IsNumber()
  parentMonthlyIncome?: number | null;

  @IsOptional()
  @IsNumber()
  guardianMonthlyIncome?: number | null;

  @IsOptional()
  @IsNumber()
  numberOfSiblings?: number | null;

  @IsOptional()
  @IsNumber()
  siblingsInPrimary?: number | null;

  @IsOptional()
  @IsNumber()
  siblingsInSecondary?: number | null;

  @IsOptional()
  @IsNumber()
  siblingsInTertiary?: number | null;
}

export class MonthlyIncomeScoreLookupDto {
  minimumIncome!: number;
  maximumIncome!: number | null;
  score!: number;
  isFlagged!: boolean;
}

export class FamilyBackgroundScoreDto {
  parentStatusScore!: number;
  monthlyIncomeScore!: number;
  siblingScore!: number;
  educationBurdenScore!: number;
  educationBurdenWeightedTotal!: number;
  currentScore!: number;
  maximumScore!: number;
  isFlagged!: boolean;
  flagReason!: string | null;
  parentalStatus!: string | null;
  assessedMonthlyIncome!: number | null;
  numberOfSiblings!: number | null;
  siblingsInPrimary!: number | null;
  siblingsInSecondary!: number | null;
  siblingsInTertiary!: number | null;
}

export class EducationBackgroundRecordDto {
  @IsOptional()
  @IsNumber()
  tuitionFees?: number | null;

  @IsOptional()
  @IsString()
  whoPaidFees?: string | null;

  @IsOptional()
  @IsString()
  certificateUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean | null;
}

export class EducationBackgroundScoreInputDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => EducationBackgroundRecordDto)
  primary?: EducationBackgroundRecordDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => EducationBackgroundRecordDto)
  secondary?: EducationBackgroundRecordDto | null;
}

export class EducationBackgroundScoreDto {
  primaryScore!: number;
  secondaryScore!: number;
  fundingScore!: number;
  totalScore!: number;
  maximumScore!: number;
  isFlagged!: boolean;
  flagReason!: string | null;
  primaryFees!: number | null;
  secondaryFees!: number | null;
  primaryFunding!: string | null;
  secondaryFunding!: string | null;
}

export class IntegrityCheckScoreInputDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  nationalId?: string;

  @IsOptional()
  @IsString()
  parentNationalId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deceasedParentNationalIds?: string[];

  @IsOptional()
  @IsBoolean()
  isDeceased?: boolean;

  @IsOptional()
  @IsBoolean()
  requiredDocumentsSubmitted?: boolean;
}

export class IntegrityCheckScoreDto {
  registrationNumberMatch!: number;
  nationalIdVerified!: number;
  parentIdVerified!: number;
  deathVerificationConsistent!: number;
  requiredDocuments!: number;
  totalScore!: number;
  maximumScore!: number;
  isFlagged!: boolean;
  flagReason!: string | null;
  details!: {
    registrationNumberMatched: boolean;
    nationalIdVerified: boolean;
    parentIdVerified: boolean;
    deathVerificationConsistent: boolean;
    allRequiredDocuments: boolean;
  };
}

export class DisabilityScoreInputDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  disability?: string;
}

export class DisabilityScoreDto {
  hasDisability!: boolean;
  disabilityType!: string | null;
  score!: number;
  maximumScore!: number;
  isFlagged!: boolean;
  flagReason!: string | null;
}

export class ComprehensiveStudentScoreInputDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsNumber()
  gpa?: number | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => FamilyBackgroundScoreInputDto)
  familyBackgroundInput?: FamilyBackgroundScoreInputDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EducationBackgroundScoreInputDto)
  educationBackgroundInput?: EducationBackgroundScoreInputDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => IntegrityCheckScoreInputDto)
  integrityCheckInput?: IntegrityCheckScoreInputDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DisabilityScoreInputDto)
  disabilityInput?: DisabilityScoreInputDto;
}

export class ComprehensiveStudentScoreDto {
  userId!: string;
  firstName!: string;
  lastName!: string;
  registrationNumber!: string;
  academicScore!: { score: number; maximumScore: number; percentage: number };
  familyBackgroundScore!: { score: number; maximumScore: number; percentage: number };
  educationBackgroundScore!: { score: number; maximumScore: number; percentage: number };
  integrityCheckScore!: { score: number; maximumScore: number; percentage: number };
  disabilityScore!: { score: number; maximumScore: number; percentage: number };
  totalScore!: number;
  maximumTotalScore!: number;
  overallPercentage!: number;
  isFlagged!: boolean;
  flagReasons!: string[];
}

export class AdminDashboardRankingDto {
  rank!: number;
  studentId!: string;
  firstName!: string;
  lastName!: string;
  registrationNumber!: string;
  email!: string;
  programOfStudy!: string;
  yearOfStudy!: number;
  totalScore!: number;
  academicScore!: number;
  familyBackgroundScore!: number;
  educationBackgroundScore!: number;
  integrityCheckScore!: number;
  disabilityScore!: number;
  overallPercentage!: number;
  isFlagged!: boolean;
  primaryFlagReason!: string | null;
  hasDisability!: boolean;
  disabilityType!: string | null;
}

export class AdminDashboardPaginatedDto {
  data!: AdminDashboardRankingDto[];
  total!: number;
  page!: number;
  pageSize!: number;
  totalPages!: number;
}
