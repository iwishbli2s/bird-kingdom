import type { GovernanceState } from './types';

export const governanceKeys = ['approval', 'stability', 'integration'] as const;
export type GovernanceMetric = typeof governanceKeys[number];
export const initialGovernance: Readonly<GovernanceState> = {
  approval: 64, stability: 78, integration: 81,
  approvalDeltaLastMonth: 0, stabilityDeltaLastMonth: 0, integrationDeltaLastMonth: 0,
};
export const governanceConfig = {
  min: 0, max: 100, neutralGrowth: 2, neutralUnemployment: 5, neutralInflation: 2, neutralSocial: 50,
  speed: { approval: .08, stability: .05, integration: .025 },
  limit: { approval: 2, stability: 1.2, integration: .6 },
  approval: { baseline: 50, growth: .3, unemployment: 1.2, inflation: .9, living: .35, inequality: -.08, safety: .08, satisfaction: .35, incomeTax: -.1, consumptionTax: -.12, corporateTax: -.03, balance: .1, balanceLimit: .5, debtThreshold: 2, debt: .4, debtLimit: 2 },
  stability: { baseline: 65, safety: .3, unemployment: .5, inequality: -.08, approvalThreshold: 50, approvalSevere: 30, approval: .15, approvalExtra: .3, satisfactionThreshold: 50, satisfaction: .2, autonomy: .12, independence: .35, crisis: .3 },
  integration: { baseline: 65, satisfaction: .25, autonomy: .12, independence: .3, inequality: -.08, living: .1 },
  distress: { satisfactionThreshold: 40, satisfaction: 1, autonomyThreshold: 40, autonomy: .5, independenceThreshold: 20, independence: 1, limit: 100 },
} as const;
