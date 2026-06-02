import { Injectable } from '@nestjs/common';
import {
  FamilyBackgroundScoreDto,
  FamilyBackgroundScoreInputDto,
  MonthlyIncomeScoreLookupDto,
} from '../dto/ranking-score.dto';
import { RankingCriteriaConfig, ScoreBand } from '../ranking-criteria.defaults';

@Injectable()
export class FamilyBackgroundService {
  private readonly incomeBands: MonthlyIncomeScoreLookupDto[] = [
    { minimumIncome: 0, maximumIncome: 80000, score: 15, isFlagged: false },
    { minimumIncome: 80001, maximumIncome: 150000, score: 13, isFlagged: false },
    { minimumIncome: 150001, maximumIncome: 250000, score: 10, isFlagged: false },
    { minimumIncome: 250001, maximumIncome: 400000, score: 6, isFlagged: false },
    { minimumIncome: 400001, maximumIncome: 700000, score: 2, isFlagged: false },
    { minimumIncome: 700001, maximumIncome: null, score: 0, isFlagged: true },
  ];

  calculateScore(input: FamilyBackgroundScoreInputDto, criteria?: RankingCriteriaConfig): FamilyBackgroundScoreDto {
    const familyCriteria = criteria?.familyBackground;
    const parentalStatus = this.normalizeParentStatus(input.parentalStatus);
    const assessedMonthlyIncome = this.getAssessedMonthlyIncome(input, parentalStatus);
    const parentStatusScore = this.calculateParentStatusScore(parentalStatus, criteria);
    const incomeResult = this.calculateMonthlyIncomeScore(assessedMonthlyIncome, criteria);
    const siblingScore = this.calculateSiblingScore(input.numberOfSiblings, criteria);
    const educationBurdenWeightedTotal = this.calculateEducationBurdenWeightedTotal(input);
    const educationBurdenScore = this.calculateEducationBurdenScore(educationBurdenWeightedTotal, criteria);
    const flagReasons: string[] = [];

    if (incomeResult.isFlagged) flagReasons.push('Monthly income is above 700000');
    if (!parentalStatus) flagReasons.push('Parent status is not available');
    if (assessedMonthlyIncome === null) flagReasons.push('Monthly income is not available');

    return {
      parentStatusScore,
      monthlyIncomeScore: incomeResult.score,
      siblingScore,
      educationBurdenScore,
      educationBurdenWeightedTotal,
      currentScore: parentStatusScore + incomeResult.score + siblingScore + educationBurdenScore,
      maximumScore: familyCriteria?.maximumScore ?? 40,
      isFlagged: flagReasons.length > 0,
      flagReason: flagReasons.length > 0 ? flagReasons.join('; ') : null,
      parentalStatus,
      assessedMonthlyIncome,
      numberOfSiblings: this.normalizeNumber(input.numberOfSiblings),
      siblingsInPrimary: this.normalizeNumber(input.siblingsInPrimary),
      siblingsInSecondary: this.normalizeNumber(input.siblingsInSecondary),
      siblingsInTertiary: this.normalizeNumber(input.siblingsInTertiary),
    };
  }

  getMonthlyIncomeLookupTableData(): MonthlyIncomeScoreLookupDto[] {
    return this.incomeBands;
  }

  private calculateParentStatusScore(parentalStatus: string | null, criteria?: RankingCriteriaConfig): number {
    if (!parentalStatus) return 0;
    const scores = criteria?.familyBackground.parentStatusScores;
    if (['none', 'no parent', 'no parents', 'orphan', 'guardian', 'guardian next of kin'].includes(parentalStatus)) {
      return scores?.find((score) => score.key === 'none')?.score ?? 15;
    }
    if (['one', 'single parent', 'single', 'one parent'].includes(parentalStatus)) {
      return scores?.find((score) => score.key === 'one')?.score ?? 10;
    }
    if (['both', 'both parents', 'two parents'].includes(parentalStatus)) {
      return scores?.find((score) => score.key === 'both')?.score ?? 4;
    }
    return 0;
  }

  private calculateMonthlyIncomeScore(monthlyIncome: number | null, criteria?: RankingCriteriaConfig) {
    if (monthlyIncome === null) return { score: 0, isFlagged: false };

    const band = criteria?.familyBackground.incomeBands
      ? this.findBand(monthlyIncome, criteria.familyBackground.incomeBands)
      : this.incomeBands.find((incomeBand) => {
          const meetsMinimum = monthlyIncome >= incomeBand.minimumIncome;
          const meetsMaximum = incomeBand.maximumIncome === null || monthlyIncome <= incomeBand.maximumIncome;
          return meetsMinimum && meetsMaximum;
        });

    return { score: band?.score ?? 0, isFlagged: band?.isFlagged ?? true };
  }

  private calculateSiblingScore(numberOfSiblings: number | null | undefined, criteria?: RankingCriteriaConfig): number {
    const siblings = this.normalizeNumber(numberOfSiblings);
    if (siblings !== null && criteria?.familyBackground.siblingBands) {
      return this.findBand(siblings, criteria.familyBackground.siblingBands)?.score ?? 0;
    }
    if (siblings === null || siblings <= 3) return 0;
    if (siblings <= 5) return 1;
    if (siblings <= 7) return 2;
    if (siblings <= 9) return 3;
    return 4;
  }

  private calculateEducationBurdenWeightedTotal(input: FamilyBackgroundScoreInputDto): number {
    const primary = this.normalizeNumber(input.siblingsInPrimary) ?? 0;
    const secondary = this.normalizeNumber(input.siblingsInSecondary) ?? 0;
    const tertiary = this.normalizeNumber(input.siblingsInTertiary) ?? 0;
    return primary + secondary * 2 + tertiary * 3;
  }

  private calculateEducationBurdenScore(weightedTotal: number, criteria?: RankingCriteriaConfig): number {
    if (criteria?.familyBackground.educationBurdenBands) {
      return this.findBand(weightedTotal, criteria.familyBackground.educationBurdenBands)?.score ?? 0;
    }
    if (weightedTotal <= 2) return 0;
    if (weightedTotal <= 4) return 2;
    if (weightedTotal <= 6) return 3;
    if (weightedTotal <= 8) return 4;
    if (weightedTotal <= 10) return 5;
    return 6;
  }

  private getAssessedMonthlyIncome(input: FamilyBackgroundScoreInputDto, parentalStatus: string | null): number | null {
    const father = this.normalizeNumber(input.fatherMonthlyIncome);
    const mother = this.normalizeNumber(input.motherMonthlyIncome);
    const parent = this.normalizeNumber(input.parentMonthlyIncome);
    const guardian = this.normalizeNumber(input.guardianMonthlyIncome);

    if (['both', 'both parents', 'two parents'].includes(parentalStatus ?? '')) {
      const incomes = [father, mother].filter((income): income is number => income !== null);
      if (incomes.length > 0) return incomes.reduce((total, income) => total + income, 0);
    }

    return parent ?? guardian ?? father ?? mother;
  }

  private normalizeParentStatus(parentalStatus: string | null | undefined): string | null {
    if (!parentalStatus) return null;
    return parentalStatus.trim().toLowerCase().replace(/[_-]+/g, ' ');
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
