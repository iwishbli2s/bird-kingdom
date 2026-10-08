import type { BudgetPolicy, IndustryId, TaxPolicy } from './types';
import { initialCountryBudgets } from './budgetConfig';

export const taxFields: readonly (keyof TaxPolicy)[] = ['incomeTaxRate', 'corporateTaxRate', 'consumptionTaxRate'];
export const taxPolicyConfig: Record<keyof TaxPolicy, { label: string; min: number; max: number }> = {
  incomeTaxRate: { label: '소득세', min: 0, max: 40 },
  corporateTaxRate: { label: '법인세', min: 0, max: 35 },
  consumptionTaxRate: { label: '소비세', min: 0, max: 25 },
};
// 모든 세율과 지출·금리는 퍼센트 값. GDP 기반 비율은 소수입니다.
export const fiscalConfig = {
  incomeTaxBase: .55, corporateTaxBase: .18, consumptionTaxBase: .65,
  baseAnnualInterestRate: 3, safeDebtRatio: .60, interestRiskCoefficient: 8, maxAnnualInterestRate: 20,
} as const;
export interface InitialFiscalProfile { treasury: number; debt: number; taxPolicy: TaxPolicy; budgetPolicy: BudgetPolicy }
export const countryFiscalProfiles: Readonly<Record<'centralized-presidential-republic' | 'federation', InitialFiscalProfile>> = {
  'centralized-presidential-republic': { treasury: 220, debt: 560, taxPolicy: { incomeTaxRate: 15, corporateTaxRate: 20, consumptionTaxRate: 8 }, budgetPolicy: initialCountryBudgets['centralized-presidential-republic'] },
  federation: { treasury: 270, debt: 720, taxPolicy: { incomeTaxRate: 8, corporateTaxRate: 10, consumptionTaxRate: 4 }, budgetPolicy: initialCountryBudgets.federation },
};
export const regionalFiscalProfile = { taxPolicy: { incomeTaxRate: 7, corporateTaxRate: 8, consumptionTaxRate: 4 } } as const;
export const initialRegionalFinance: Readonly<Record<string, { treasury: number; debt: number }>> = {
  'pigeon-state': { treasury: 88, debt: 170 }, 'eagle-state': { treasury: 70, debt: 150 },
  'owl-state': { treasury: 66, debt: 120 }, 'duck-state': { treasury: 52, debt: 90 },
};
// 1%p 세율 차이에 따른 연간 성장 소수 비율의 변화. 실제 정책 모듈은 조세만 있습니다.
export const taxIndustryEffects: Record<IndustryId, Record<keyof TaxPolicy, number>> = {
  agriculture: { incomeTaxRate: 0, corporateTaxRate: 0, consumptionTaxRate: 0 },
  manufacturing: { incomeTaxRate: 0, corporateTaxRate: -.0004, consumptionTaxRate: -.0002 },
  services: { incomeTaxRate: -.0001, corporateTaxRate: 0, consumptionTaxRate: -.0002 },
  advanced: { incomeTaxRate: -.0001, corporateTaxRate: -.0004, consumptionTaxRate: 0 },
  defense: { incomeTaxRate: 0, corporateTaxRate: -.0004, consumptionTaxRate: 0 },
};
