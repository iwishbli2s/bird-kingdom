import {balanceAdjustments} from './balanceConfig';
import { fiscalConfig as config, taxFields, taxIndustryEffects, taxPolicyConfig, type InitialFiscalProfile } from './fiscalConfig';
import { industryIds } from './economyConfig';
import { budgetCategoryIds } from './budgetConfig';
import { validateBudgetPolicy } from './budget';
import type { IndustryModifiers } from './economy';
import type { EconomyState, FiscalExpenditure, FiscalRevenue, FiscalState, IndustryId, TaxPolicy, WorldState } from './types';

export function validateTaxPolicy(policy: TaxPolicy): void {
  for (const field of taxFields) {
    const { min, max } = taxPolicyConfig[field];
    if (!Number.isFinite(policy[field]) || policy[field] < min || policy[field] > max) throw new RangeError(`${taxPolicyConfig[field].label} 세율은 ${min}~${max}%여야 합니다.`);
  }
}

export function calculateTaxRevenue(gdp: number, policy: TaxPolicy): FiscalRevenue {
  validateTaxPolicy(policy);
  const incomeTax = gdp * config.incomeTaxBase * policy.incomeTaxRate / 100 / 12;
  const corporateTax = gdp * config.corporateTaxBase * policy.corporateTaxRate / 100 / 12;
  const consumptionTax = gdp * config.consumptionTaxBase * policy.consumptionTaxRate / 100 / 12;
  return { incomeTax, corporateTax, consumptionTax, total: incomeTax + corporateTax + consumptionTax };
}

export function calculateDebtInterestRate(debt: number, gdp: number): number {
  const ratio = gdp > 0 ? debt / gdp : debt > 0 ? Infinity : 0;
  if(Number.isFinite(ratio)&&ratio>balanceAdjustments.distressedDebtRatio){const anchor=config.baseAnnualInterestRate+(balanceAdjustments.distressedDebtRatio-config.safeDebtRatio)*config.interestRiskCoefficient;return anchor+(balanceAdjustments.distressedInterestCeiling-anchor)*(-Math.expm1(-(ratio-balanceAdjustments.distressedDebtRatio)/balanceAdjustments.distressedInterestScale));}
  return Math.min(config.maxAnnualInterestRate, config.baseAnnualInterestRate + Math.max(0, ratio - config.safeDebtRatio) * config.interestRiskCoefficient);
}

export function calculateFiscalExpenditure(gdp: number, fiscal: Pick<FiscalState, 'debt' | 'budgetPolicy'>, annualInterestRate: number): FiscalExpenditure {
  validateBudgetPolicy(fiscal.budgetPolicy);
  const categories = Object.fromEntries(budgetCategoryIds.map(id => [id, gdp * fiscal.budgetPolicy[id] / 100 / 12])) as FiscalExpenditure['categories'];
  const programTotal = budgetCategoryIds.reduce((sum, id) => sum + categories[id], 0);
  const interest = fiscal.debt * annualInterestRate / 100 / 12;
  return { categories, programTotal, interest, total: programTotal + interest };
}

export function createInitialFiscal(profile: InitialFiscalProfile, economy: EconomyState): FiscalState {
  const revenue = calculateTaxRevenue(economy.gdp, profile.taxPolicy);
  const annualInterestRate = calculateDebtInterestRate(profile.debt, economy.gdp);
  const expenditure = calculateFiscalExpenditure(economy.gdp, profile, annualInterestRate);
  // 시작 월은 추정값만 준비하고 현금을 이동하지 않습니다. 첫 월 진행부터 결산합니다.
  return { ...profile, taxPolicy: { ...profile.taxPolicy }, baselineTaxPolicy: { ...profile.taxPolicy },
    budgetPolicy: { ...profile.budgetPolicy }, baselineBudgetPolicy: { ...profile.budgetPolicy }, revenue, expenditure,
    monthlyBalance: revenue.total - expenditure.total, annualInterestRate, hasIssuedDebt: false };
}

export function updateFiscalState(fiscal: FiscalState, economy: EconomyState): FiscalState {
  const revenue = calculateTaxRevenue(economy.gdp, fiscal.taxPolicy);
  const annualInterestRate = calculateDebtInterestRate(fiscal.debt, economy.gdp);
  const expenditure = calculateFiscalExpenditure(economy.gdp, fiscal, annualInterestRate);
  const monthlyBalance = revenue.total - expenditure.total;
  const cash = fiscal.treasury + monthlyBalance;
  return { ...fiscal, revenue, expenditure, annualInterestRate, monthlyBalance,
    treasury: Math.max(0, cash), debt: fiscal.debt + Math.max(0, -cash), hasIssuedDebt: fiscal.hasIssuedDebt || cash < 0 };
}

export function updateWorldFiscal(world: WorldState): WorldState {
  const regions=Object.fromEntries(Object.entries(world.regions).map(([id,r])=>[id,{...r,fiscal:r.simulationRole==='administrative'?r.fiscal:updateFiscalState(r.fiscal,r.economy)}]));
  const countries=Object.fromEntries(Object.entries(world.countries).map(([id,c])=>{
    const member=Object.values(regions).find(r=>r.ownerCountryId===id);
    return [id,{...c,fiscal:c.identity?.isDynamic&&c.simulationMode==='aggregate_regions'&&member?member.fiscal:updateFiscalState(c.fiscal,c.economy)}];
  }));return {...world,countries,regions};
}

export function getTaxIndustryModifiers(fiscal: FiscalState): Record<IndustryId, IndustryModifiers> {
  return Object.fromEntries(industryIds.map(id => [id, {
    annualGrowthAdjustment: taxFields.reduce((sum, field) => sum + (fiscal.taxPolicy[field] - fiscal.baselineTaxPolicy[field]) * taxIndustryEffects[id][field], 0),
  }])) as Record<IndustryId, IndustryModifiers>;
}



