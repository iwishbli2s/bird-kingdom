import type { IndustryId } from './types';

export const industryIds: readonly IndustryId[] = ['agriculture', 'manufacturing', 'services', 'advanced', 'defense'];
// 성장 계수는 소수 비율, 실업·물가 계수는 %p 단위입니다.
export const industryConfig: Record<IndustryId, { name: string; annualGrowth: number; annualProductivityGrowth: number; cycleSensitivity: number }> = {
  agriculture: { name: '농업', annualGrowth: 0.01, annualProductivityGrowth: 0.001, cycleSensitivity: 0.018 },
  manufacturing: { name: '제조업', annualGrowth: 0.02, annualProductivityGrowth: 0.002, cycleSensitivity: 0.045 },
  services: { name: '서비스업', annualGrowth: 0.022, annualProductivityGrowth: 0.0015, cycleSensitivity: 0.025 },
  advanced: { name: '첨단산업', annualGrowth: 0.04, annualProductivityGrowth: 0.003, cycleSensitivity: 0.04 },
  defense: { name: '군수산업', annualGrowth: 0.015, annualProductivityGrowth: 0.001, cycleSensitivity: 0.02 },
};
export const economyConfig = {
  cyclePersistence: 0.85, cycleShockWeight: 0.15, annualIndustryNoise: 0.004,
  annualGrowthMin: -0.08, annualGrowthMax: 0.12,
  neutralGrowth: 2, unemploymentResponse: 0.025, unemploymentMaxChange: 0.12,
  unemploymentMin: 1, unemploymentMax: 30,
  inflationAnchor: 2, inflationPersistence: 0.92, inflationGrowthPressure: 0.18,
  inflationCyclePressure: 0.5, inflationLaborPressure: 0.08, neutralUnemployment: 5,
  inflationMaxChange: 0.15, inflationMin: -5, inflationMax: 30,
} as const;

export interface InitialEconomyProfile {
  gdp: number; growth: number; unemployment: number; inflation: number;
  shares: Record<IndustryId, number>;
}
export const initialEconomyProfiles: Readonly<Record<string, InitialEconomyProfile>> = {
  sparrow: { gdp: 1600, growth: 2.6, unemployment: 5.2, inflation: 2.4,
    shares: { agriculture: .14, manufacturing: .34, services: .30, advanced: .15, defense: .07 } },
  'pigeon-state': { gdp: 620, growth: 2.3, unemployment: 4.1, inflation: 2,
    shares: { agriculture: .05, manufacturing: .12, services: .50, advanced: .25, defense: .08 } },
  'eagle-state': { gdp: 520, growth: 2, unemployment: 5, inflation: 2.3,
    shares: { agriculture: .07, manufacturing: .31, services: .19, advanced: .13, defense: .30 } },
  'owl-state': { gdp: 430, growth: 3.2, unemployment: 3.8, inflation: 1.8,
    shares: { agriculture: .05, manufacturing: .12, services: .29, advanced: .46, defense: .08 } },
  'duck-state': { gdp: 330, growth: 1.7, unemployment: 4.6, inflation: 2.5,
    shares: { agriculture: .42, manufacturing: .18, services: .28, advanced: .07, defense: .05 } },
};
