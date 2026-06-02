import { Injectable } from '@nestjs/common';
import {
  EducationBackgroundRecordDto,
  EducationBackgroundScoreDto,
  EducationBackgroundScoreInputDto,
} from '../dto/ranking-score.dto';
import { RankingCriteriaConfig, ScoreBand } from '../ranking-criteria.defaults';

@Injectable()
export class EducationBackgroundService {
  calculateScore(input: EducationBackgroundScoreInputDto, criteria?: RankingCriteriaConfig): EducationBackgroundScoreDto {
    const educationCriteria = criteria?.educationBackground;
    const primary = input.primary ?? null;
    const secondary = input.secondary ?? null;
    const primaryFees = this.normalizeNumber(primary?.tuitionFees);
    const secondaryFees = this.normalizeNumber(secondary?.tuitionFees);
    const primaryFunding = this.normalizeFunding(primary?.whoPaidFees);
    const secondaryFunding = this.normalizeFunding(secondary?.whoPaidFees);
    const primaryScore = this.calculatePrimaryFeeScore(primaryFees, criteria);
    const secondaryScore = this.calculateSecondaryFeeScore(secondaryFees, criteria);
    const fundingScore = this.calculateFundingScore(primaryFunding, secondaryFunding, criteria);
    const flagReasons = this.getFlagReasons(primary, secondary, primaryFees, secondaryFees);

    return {
      primaryScore,
      secondaryScore,
      fundingScore,
      totalScore: primaryScore + secondaryScore + fundingScore,
      maximumScore: educationCriteria?.maximumScore ?? 15,
      isFlagged: flagReasons.length > 0,
      flagReason: flagReasons.length > 0 ? flagReasons.join('; ') : null,
      primaryFees,
      secondaryFees,
      primaryFunding,
      secondaryFunding,
    };
  }

  private calculatePrimaryFeeScore(fees: number | null, criteria?: RankingCriteriaConfig): number {
    if (fees === null) return 0;
    if (criteria?.educationBackground.primaryFeeBands) {
      return this.findBand(fees, criteria.educationBackground.primaryFeeBands)?.score ?? 0;
    }
    if (fees <= 5000) return 5;
    if (fees <= 20000) return 4;
    if (fees <= 50000) return 3;
    if (fees <= 120000) return 2;
    return 0;
  }

  private calculateSecondaryFeeScore(fees: number | null, criteria?: RankingCriteriaConfig): number {
    if (fees === null) return 0;
    if (criteria?.educationBackground.secondaryFeeBands) {
      return this.findBand(fees, criteria.educationBackground.secondaryFeeBands)?.score ?? 0;
    }
    if (fees <= 5000) return 7;
    if (fees <= 30000) return 6;
    if (fees <= 80000) return 5;
    if (fees <= 200000) return 3;
    if (fees <= 500000) return 1;
    return 0;
  }

  private calculateFundingScore(primaryFunding: string | null, secondaryFunding: string | null, criteria?: RankingCriteriaConfig): number {
    const fundingValues = [primaryFunding, secondaryFunding].filter(
      (funding): funding is string => funding !== null,
    );

    if (fundingValues.length === 0) return 0;

    const sponsorCount = fundingValues.filter((funding) => this.isSponsorFunding(funding)).length;
    const relativeCount = fundingValues.filter((funding) => this.isRelativeFunding(funding)).length;
    const scores = criteria?.educationBackground.fundingScores;

    if (sponsorCount === 2) return scores?.find((score) => score.key === 'two_sponsors')?.score ?? 3;
    if (sponsorCount === 1 && relativeCount === 0) return scores?.find((score) => score.key === 'one_sponsor_no_relative')?.score ?? 2;
    if (sponsorCount > 0 || relativeCount > 0) return scores?.find((score) => score.key === 'sponsor_or_relative')?.score ?? 1;
    return scores?.find((score) => score.key === 'other')?.score ?? 0;
  }

  private getFlagReasons(
    primary: EducationBackgroundRecordDto | null,
    secondary: EducationBackgroundRecordDto | null,
    primaryFees: number | null,
    secondaryFees: number | null,
  ): string[] {
    const flagReasons: string[] = [];
    if (this.isUnverifiedHighValueSponsorClaim(primary, primaryFees)) flagReasons.push('Primary education claim unverified');
    if (this.isUnverifiedHighValueSponsorClaim(secondary, secondaryFees)) flagReasons.push('Secondary education claim unverified');
    return flagReasons;
  }

  private isUnverifiedHighValueSponsorClaim(record: EducationBackgroundRecordDto | null, fees: number | null): boolean {
    if (!record || fees === null || fees <= 200000) return false;
    const funding = this.normalizeFunding(record.whoPaidFees);
    const hasProof = Boolean(record.certificateUrl?.trim());
    return this.isSponsorFunding(funding) && (!hasProof || record.isVerified !== true);
  }

  private isSponsorFunding(funding: string | null): boolean {
    return funding === 'sponsor' || funding === 'scholarship';
  }

  private isRelativeFunding(funding: string | null): boolean {
    return funding === 'guardian' || funding === 'other';
  }

  private normalizeFunding(funding: string | null | undefined): string | null {
    if (!funding) return null;
    return funding.trim().toLowerCase().replace(/[_-]+/g, ' ');
  }

  private normalizeNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private findBand(value: number, bands: ScoreBand[]) {
    return bands.find((band) => value >= band.minimum && (band.maximum === null || value <= band.maximum));
  }
}
