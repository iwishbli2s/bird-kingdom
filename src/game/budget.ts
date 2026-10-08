import { budgetCategoryConfig, budgetCategoryIds, budgetConfig, budgetIndustryEffects } from './budgetConfig';
import { industryIds } from './economyConfig';
import type { IndustryModifiers } from './economy';
import type { BudgetPolicy, FiscalState, IndustryId } from './types';

export const sumBudgetRates = (policy: BudgetPolicy): number => budgetCategoryIds.reduce((sum, id) => sum + policy[id], 0);

export function validateBudgetPolicy(policy: BudgetPolicy): void {
  for (const id of budgetCategoryIds) {
    const { label, min, max } = budgetCategoryConfig[id];
    if (!Number.isFinite(policy[id]) || policy[id] < min || policy[id] > max) throw new RangeError(`${label} 예산은 GDP의 ${min}~${max}%여야 합니다.`);
  }
  // 0.1 단위 합산의 부동소수점 오차만 허용하며 정책값을 보정하지 않습니다.
  if (sumBudgetRates(policy) > budgetConfig.maxTotalRate + budgetConfig.sumTolerance) throw new RangeError(`총 정책 예산은 GDP의 ${budgetConfig.maxTotalRate}%를 초과할 수 없습니다.`);
}

const boundedProductivity = (value: number) => Math.min(budgetConfig.productivityMultiplierMax, Math.max(budgetConfig.productivityMultiplierMin, value));

export function getBudgetIndustryModifiers(fiscal: Pick<FiscalState, 'budgetPolicy' | 'baselineBudgetPolicy'>): Record<IndustryId, IndustryModifiers> {
  return Object.fromEntries(industryIds.map(id => {
    let annualGrowthAdjustment = 0;
    let productivityMultiplier = 1;
    for (const category of budgetCategoryIds) {
      const delta = fiscal.budgetPolicy[category] - fiscal.baselineBudgetPolicy[category];
      const effect = budgetIndustryEffects[category][id];
      annualGrowthAdjustment += delta * (effect?.annualGrowthAdjustment ?? 0);
      productivityMultiplier += delta * (effect?.productivityAdjustment ?? 0);
    }
    return [id, { annualGrowthAdjustment, productivityMultiplier: boundedProductivity(productivityMultiplier) }];
  })) as Record<IndustryId, IndustryModifiers>;
}

export function combineIndustryModifiers(...sources: Partial<Record<IndustryId, IndustryModifiers>>[]): Record<IndustryId, IndustryModifiers> {
  return Object.fromEntries(industryIds.map(id => {
    let annualGrowthAdjustment = 0;
    let productivityMultiplier = 1;
    for (const source of sources) {
      const growth = source[id]?.annualGrowthAdjustment ?? 0;
      const productivity = source[id]?.productivityMultiplier ?? 1;
      if (!Number.isFinite(growth) || !Number.isFinite(productivity) || productivity < 0) throw new RangeError('산업 modifier가 유효하지 않습니다.');
      annualGrowthAdjustment += growth;
      // 1에서의 변화량을 합산합니다. 배율을 연속 곱하지 않아 폭증을 피합니다.
      productivityMultiplier += productivity - 1;
    }
    return [id, { annualGrowthAdjustment, productivityMultiplier: boundedProductivity(productivityMultiplier) }];
  })) as Record<IndustryId, IndustryModifiers>;
}
