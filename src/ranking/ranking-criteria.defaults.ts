export type ScoreBand = {
  label?: string;
  minimum: number;
  maximum: number | null;
  score: number;
  isFlagged?: boolean;
};

export type NamedScore = {
  key: string;
  label: string;
  score: number;
};

export type RankingCriteriaConfig = {
  academic: {
    maximumScore: number;
    minimumGpa: number;
    maximumGpa: number;
    minimumPassingScore: number;
  };
  familyBackground: {
    maximumScore: number;
    parentStatusMaximum: number;
    monthlyIncomeMaximum: number;
    siblingMaximum: number;
    educationBurdenMaximum: number;
    parentStatusScores: NamedScore[];
    incomeBands: ScoreBand[];
    siblingBands: ScoreBand[];
    educationBurdenBands: ScoreBand[];
  };
  educationBackground: {
    maximumScore: number;
    primaryFeeMaximum: number;
    secondaryFeeMaximum: number;
    fundingMaximum: number;
    primaryFeeBands: ScoreBand[];
    secondaryFeeBands: ScoreBand[];
    fundingScores: NamedScore[];
  };
  integrityCheck: {
    maximumScore: number;
    registrationNumberScore: number;
    nationalIdScore: number;
    parentIdScore: number;
    deathVerificationScore: number;
    requiredDocumentsScore: number;
  };
  disability: {
    maximumScore: number;
    disabilityScore: number;
    noDisabilityScore: number;
  };
};

export const DEFAULT_RANKING_CRITERIA: RankingCriteriaConfig = {
  academic: {
    maximumScore: 30,
    minimumGpa: 2.5,
    maximumGpa: 4.0,
    minimumPassingScore: 10,
  },
  familyBackground: {
    maximumScore: 40,
    parentStatusMaximum: 15,
    monthlyIncomeMaximum: 15,
    siblingMaximum: 4,
    educationBurdenMaximum: 6,
    parentStatusScores: [
      { key: 'none', label: 'No parents / guardian', score: 15 },
      { key: 'one', label: 'One parent', score: 10 },
      { key: 'both', label: 'Both parents', score: 4 },
    ],
    incomeBands: [
      { minimum: 0, maximum: 80000, score: 15, isFlagged: false },
      { minimum: 80001, maximum: 150000, score: 13, isFlagged: false },
      { minimum: 150001, maximum: 250000, score: 10, isFlagged: false },
      { minimum: 250001, maximum: 400000, score: 6, isFlagged: false },
      { minimum: 400001, maximum: 700000, score: 2, isFlagged: false },
      { minimum: 700001, maximum: null, score: 0, isFlagged: true },
    ],
    siblingBands: [
      { minimum: 0, maximum: 3, score: 0 },
      { minimum: 4, maximum: 5, score: 1 },
      { minimum: 6, maximum: 7, score: 2 },
      { minimum: 8, maximum: 9, score: 3 },
      { minimum: 10, maximum: null, score: 4 },
    ],
    educationBurdenBands: [
      { minimum: 0, maximum: 2, score: 0 },
      { minimum: 3, maximum: 4, score: 2 },
      { minimum: 5, maximum: 6, score: 3 },
      { minimum: 7, maximum: 8, score: 4 },
      { minimum: 9, maximum: 10, score: 5 },
      { minimum: 11, maximum: null, score: 6 },
    ],
  },
  educationBackground: {
    maximumScore: 15,
    primaryFeeMaximum: 5,
    secondaryFeeMaximum: 7,
    fundingMaximum: 3,
    primaryFeeBands: [
      { minimum: 0, maximum: 5000, score: 5 },
      { minimum: 5001, maximum: 20000, score: 4 },
      { minimum: 20001, maximum: 50000, score: 3 },
      { minimum: 50001, maximum: 120000, score: 2 },
      { minimum: 120001, maximum: null, score: 0 },
    ],
    secondaryFeeBands: [
      { minimum: 0, maximum: 5000, score: 7 },
      { minimum: 5001, maximum: 30000, score: 6 },
      { minimum: 30001, maximum: 80000, score: 5 },
      { minimum: 80001, maximum: 200000, score: 3 },
      { minimum: 200001, maximum: 500000, score: 1 },
      { minimum: 500001, maximum: null, score: 0 },
    ],
    fundingScores: [
      { key: 'two_sponsors', label: 'Primary and secondary sponsor/scholarship', score: 3 },
      { key: 'one_sponsor_no_relative', label: 'One sponsor/scholarship and no relative payer', score: 2 },
      { key: 'sponsor_or_relative', label: 'Sponsor/scholarship or relative payer', score: 1 },
      { key: 'other', label: 'Other payer combination', score: 0 },
    ],
  },
  integrityCheck: {
    maximumScore: 8,
    registrationNumberScore: 1,
    nationalIdScore: 1,
    parentIdScore: 2,
    deathVerificationScore: 2,
    requiredDocumentsScore: 2,
  },
  disability: {
    maximumScore: 7,
    disabilityScore: 7,
    noDisabilityScore: 0,
  },
};

export function cloneDefaultCriteria(): RankingCriteriaConfig {
  return JSON.parse(JSON.stringify(DEFAULT_RANKING_CRITERIA)) as RankingCriteriaConfig;
}
