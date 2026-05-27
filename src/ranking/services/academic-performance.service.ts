import { Injectable, Logger } from '@nestjs/common';

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

  calculateScore(gpa: number | null | undefined) {
    if (gpa === null || gpa === undefined) {
      return { score: 0, isFlagged: true, flagReason: 'GPA not available' };
    }

    const gpaRounded = Math.round(gpa * 100) / 100;
    const gpaKey = gpaRounded.toFixed(2);

    if (gpaRounded < 2.5) {
      return {
        score: 0,
        isFlagged: true,
        flagReason: `GPA ${gpaKey} is below minimum threshold of 2.5`,
      };
    }

    if (gpaRounded > 4.0) {
      return { score: 30, isFlagged: false, flagReason: null };
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
