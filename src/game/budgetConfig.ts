import type { BudgetCategoryId, BudgetPolicy, IndustryId } from './types';

export const budgetCategoryIds: readonly BudgetCategoryId[] = ['defense', 'education', 'healthcare', 'welfare', 'security', 'industrySupport', 'infrastructure', 'research'];
export const budgetCategoryConfig: Record<BudgetCategoryId, { label: string; min: number; max: number }> = {
  defense: { label: '국방', min: 0, max: 10 }, education: { label: '교육', min: 0, max: 8 },
  healthcare: { label: '보건', min: 0, max: 8 }, welfare: { label: '복지', min: 0, max: 12 },
  security: { label: '치안', min: 0, max: 6 }, industrySupport: { label: '산업지원', min: 0, max: 6 },
  infrastructure: { label: '인프라', min: 0, max: 8 }, research: { label: '연구개발', min: 0, max: 8 },
};
export const budgetConfig = {
  maxTotalRate: 45, inputStep: .1, sumTolerance: 1e-9,
  productivityMultiplierMin: .25, productivityMultiplierMax: 2.5,
  largeDeficitExpenditureRatio: 1.25,
} as const;
export const initialCountryBudgets: Readonly<Record<'centralized-presidential-republic' | 'federation', BudgetPolicy>> = {
  'centralized-presidential-republic': { defense: 3, education: 2.5, healthcare: 2.2, welfare: 3, security: 1.5, industrySupport: 1.4, infrastructure: 1.9, research: 1.5 },
  federation: { defense: 3, education: .3, healthcare: .3, welfare: .5, security: .7, industrySupport: .8, infrastructure: 1.4, research: 1 },
};
export const initialRegionalBudgets: Readonly<Record<string, BudgetPolicy>> = {
  'pigeon-state': { defense: .2, education: 1.2, healthcare: 1, welfare: 1.2, security: 1, industrySupport: .6, infrastructure: 1.3, research: 1 },
  'eagle-state': { defense: 1, education: .8, healthcare: .8, welfare: .8, security: .9, industrySupport: 1.4, infrastructure: 1.2, research: .6 },
  'owl-state': { defense: .1, education: 1.8, healthcare: 1, welfare: .8, security: .6, industrySupport: .5, infrastructure: .8, research: 1.9 },
  'duck-state': { defense: .1, education: .9, healthcare: 1.1, welfare: 1.2, security: .8, industrySupport: 1.1, infrastructure: 1.8, research: .5 },
};
type BudgetIndustryEffect = { annualGrowthAdjustment?: number; productivityAdjustment?: number };
// 초기 예산과의 차이 1%p당 계수. 성장률은 연간 소수 비율, 생산성은 배율에 가산합니다.
export const budgetIndustryEffects: Record<BudgetCategoryId, Partial<Record<IndustryId, BudgetIndustryEffect>>> = {
  defense: { defense: { annualGrowthAdjustment: .002 } },
  education: { manufacturing: { productivityAdjustment: .10 }, services: { productivityAdjustment: .10 }, advanced: { productivityAdjustment: .10 }, defense: { productivityAdjustment: .10 } },
  healthcare: { agriculture: { productivityAdjustment: .03 }, manufacturing: { productivityAdjustment: .03 }, services: { productivityAdjustment: .03 }, advanced: { productivityAdjustment: .03 }, defense: { productivityAdjustment: .03 } },
  welfare: { services: { annualGrowthAdjustment: .0003 }, manufacturing: { annualGrowthAdjustment: .0001 } },
  security: { manufacturing: { productivityAdjustment: .02 }, services: { productivityAdjustment: .02 } },
  industrySupport: { agriculture: { annualGrowthAdjustment: .0008 }, manufacturing: { annualGrowthAdjustment: .0015 }, defense: { annualGrowthAdjustment: .0012 }, advanced: { annualGrowthAdjustment: .0005 } },
  infrastructure: { agriculture: { annualGrowthAdjustment: .0008 }, manufacturing: { annualGrowthAdjustment: .0012 }, services: { annualGrowthAdjustment: .0010 }, advanced: { annualGrowthAdjustment: .0005 } },
  research: { advanced: { annualGrowthAdjustment: .0018, productivityAdjustment: .10 }, manufacturing: { annualGrowthAdjustment: .0003 } },
};

