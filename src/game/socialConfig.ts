import type { SocialState } from './types';

export const socialKeys = ['livingStandard', 'education', 'healthcare', 'publicSafety', 'inequality'] as const;
export type SocialMetric = typeof socialKeys[number];
export const socialConfig = {
  min: 0, max: 100, neutralGrowth: 2, neutralUnemployment: 5, neutralInflation: 2, neutralSocial: 50,
  living: { growth: .5, unemployment: 2.2, inflation: 1.8, welfare: 1.5, healthcare: .4, incomeTax: -.12, consumptionTax: -.18, inequality: .15, inequalityThreshold: 60, inequalityExtra: .4 },
  education: { budget: 5, research: .3, growth: .15, unemployment: .1 },
  healthcare: { budget: 5, living: .08, growth: .1, unemployment: .1 },
  safety: { budget: 6, unemployment: 1.5, unemploymentThreshold: 10, unemploymentExtra: 1, inequality: .12, inequalityThreshold: 70, inequalityExtra: .4, living: .1 },
  inequality: { unemployment: 1.2, welfare: -4, incomeTax: -.15, growth: .05, advancedThreshold: 40, advanced: .03 },
  speed: { livingStandard: .05, education: .02, healthcare: .035, publicSafety: .05, inequality: .025 },
  limit: { livingStandard: 1, education: .4, healthcare: .6, publicSafety: 1, inequality: .5 },
} as const;

const profiles: Readonly<Record<string, readonly number[]>> = {
  sparrow: [64,61,62,65,34], 'pigeon-state': [70,68,69,67,31],
  'eagle-state': [63,57,60,70,38], 'owl-state': [68,78,68,66,29], 'duck-state': [61,55,63,64,35],
};
export function createInitialSocial(id: string): SocialState {
  const values = profiles[id] ?? [50,50,50,50,50];
  return Object.fromEntries(socialKeys.flatMap((key, index) => [[key, values[index]], [`${key}DeltaLastMonth`, 0]])) as unknown as SocialState;
}
