import { initialPopulationProfiles } from './populationConfig';
import type { SpeciesId, SpeciesPoliticalBaseline } from './types';

/** 순서: 만족도 / 영향력 / 자치 요구 / 독립 성향. */
export const initialSpeciesPolitics: Readonly<Record<string, Partial<Record<SpeciesId, readonly [number, number, number, number]>>>> = {
  sparrow: { sparrow: [68, 63, 5, 2], crow: [61, 17, 20, 7], swallow: [65, 12, 14, 4], magpie: [64, 10, 12, 4] },
  'pigeon-state': { pigeon: [70, 72, 6, 2], eagle: [61, 7, 16, 6], owl: [65, 10, 12, 4], duck: [64, 11, 11, 4] },
  'eagle-state': { eagle: [64, 72, 32, 14], pigeon: [60, 15, 7, 3], owl: [63, 8, 10, 4], duck: [62, 7, 10, 4] },
  'owl-state': { owl: [69, 68, 18, 6], pigeon: [63, 18, 7, 3], eagle: [60, 5, 11, 4], duck: [64, 9, 9, 3] },
  'duck-state': { duck: [67, 72, 21, 8], pigeon: [61, 15, 7, 3], eagle: [59, 5, 11, 4], owl: [64, 8, 9, 3] },
};
export const speciesPoliticsConfig = {
  min: 0, max: 100,
  satisfactionSpeed: .08, satisfactionMaxChange: 2,
  influenceSpeed: .03, influenceMaxChange: .5,
  autonomySpeed: .03, autonomyMaxChange: 1,
  independenceSpeed: .015, independenceMaxChange: .5,
  neutralGrowth: 2, neutralUnemployment: 5, neutralInflation: 2,
  growthEffect: .3, unemploymentEffect: 1.2, inflationEffect: .7,
  incomeTaxEffect: -.25, consumptionTaxEffect: -.35,
  neutralLivingStandard: 50, livingStandardEffect: .20, inequalityEffect: -.12, publicSafetyEffect: .08, healthcareEffect: .06, educationEffect: .04,
  satisfactionComfort: 60, satisfactionLow: 40, satisfactionVeryLow: 25,
  autonomyComfortEffect: -.2, autonomyLowEffect: .7, autonomyVeryLowEffect: .8,
  autonomyRepresentationEffect: .8, neutralIntegration: 60, autonomyIntegrationEffect: .3,
  autonomyThresholds: [40, 60, 75] as readonly number[],
  autonomyPressureSlopes: [.5, 25 / 15, 1.4] as readonly number[],
  independenceDistressSpan: 40, independenceRepresentationEffect: .2, independenceIntegrationEffect: .2,
  independenceRecoverySatisfaction: 65, independenceRecoveryEffect: .15, independenceIntegrationRecovery: .04,
  defaultBaseline: { satisfaction: 60, influenceBias: 0, autonomyDemand: 10, independenceSentiment: 3 },
} as const;

export function getSpeciesPoliticalBaseline(jurisdictionId: string, speciesId: SpeciesId): SpeciesPoliticalBaseline {
  const initial = initialSpeciesPolitics[jurisdictionId]?.[speciesId];
  if (!initial) return { ...speciesPoliticsConfig.defaultBaseline };
  const profile = initialPopulationProfiles[jurisdictionId];
  const total = Object.values(profile).reduce((sum, n) => sum + n, 0);
  const initialShare = total > 0 ? (profile[speciesId] ?? 0) / total * 100 : 0;
  // 초기 비율에서 유도한 고정 제도 보정값. 이후 인구가 변해도 다시 계산하지 않습니다.
  return { satisfaction: initial[0], influenceBias: initial[1] - initialShare, autonomyDemand: initial[2], independenceSentiment: initial[3] };
}
