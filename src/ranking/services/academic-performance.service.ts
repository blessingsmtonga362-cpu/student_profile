import { Injectable, Logger } from '@nestjs/common';
import { RankingCriteriaConfig } from '../ranking-criteria.defaults';

@Injectable()
export class AcademicPerformanceService {
  private readonly logger = new Logger(AcademicPerformanceService.name);
  private readonly gpaScoreLookup = new Map<string, number>();
  private readonly gpaFlagLookup = new Map<string, boolean>();

  constructor() {
    this.initializeGpaLookupTable();
  }

  private initializeGpaLookupTable(): void {
    for (let gpa = 2.5; gpa <= 4.0; gpa += 0.01) {
      const gpaRounded = Math.round(gpa * 100) / 100;
      const gpaKey = gpaRounded.toFixed(2);
      const score = 10 + ((gpaRounded - 2.5) / 1.5) * 20;

      this.gpaScoreLookup.set(gpaKey, Math.round(score));
      this.gpaFlagLookup.set(gpaKey, false);
    }

    this.logger.log(`GPA lookup initialized with ${this.gpaScoreLookup.size} entries`);
  }

  calculateScore(gpa: number | null | undefined, criteria?: RankingCriteriaConfig) {
    const academicCriteria = criteria?.academic;
    const maximumScore = academicCriteria?.maximumScore ?? 30;
    const minimumGpa = academicCriteria?.minimumGpa ?? 2.5;
    const maximumGpa = academicCriteria?.maximumGpa ?? 4.0;
    const minimumPassingScore = academicCriteria?.minimumPassingScore ?? 10;

    if (gpa === null || gpa === undefined) {
      return { score: 0, isFlagged: true, flagReason: 'GPA not available' };
    }

    const gpaRounded = Math.round(gpa * 100) / 100;
    const gpaKey = gpaRounded.toFixed(2);

    if (gpaRounded < minimumGpa) {
      return {
        score: 0,
        isFlagged: true,
        flagReason: `GPA ${gpaKey} is below minimum threshold of ${minimumGpa}`,
      };
    }

    if (gpaRounded > maximumGpa) {
      return { score: maximumScore, isFlagged: false, flagReason: null };
    }

    if (academicCriteria) {
      const span = maximumGpa - minimumGpa;
      const score = span > 0
        ? minimumPassingScore + ((gpaRounded - minimumGpa) / span) * (maximumScore - minimumPassingScore)
        : maximumScore;

      return {
        score: Math.round(score),
        isFlagged: false,
        flagReason: null,
      };
    }

    return {
      score: this.gpaScoreLookup.get(gpaKey) ?? 0,
      isFlagged: this.gpaFlagLookup.get(gpaKey) ?? false,
      flagReason: null,
    };
  }

  getLookupTableData() {
    const data: Array<{ gpa: number; academicScore: number; isFlagged: boolean }> = [];

    for (let i = 250; i <= 400; i++) {
      const gpa = i / 100;
      const key = gpa.toFixed(2);
      data.push({
        gpa,
        academicScore: this.gpaScoreLookup.get(key) ?? 0,
        isFlagged: this.gpaFlagLookup.get(key) ?? false,
      });
    }

    return data;
  }
}
