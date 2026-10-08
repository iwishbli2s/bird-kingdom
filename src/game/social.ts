import { getCrisisImpact } from './crisis';
import { getTechnologyBonuses } from './technologyEffects';
import type { TechnologyState } from './technologyTypes';
import { createInitialSocial, socialConfig as c, socialKeys } from './socialConfig';
import type { EconomyState, FiscalState, PopulationState, SocialState, WorldState } from './types';

export interface SocialContext { crisisPressure?:Partial<Record<"livingStandard"|"publicSafety"|"healthcare"|"inequality",number>>; technology?:TechnologyState; economy: EconomyState; fiscal: FiscalState; social: SocialState }
const clamp = (n: number, min: number = c.min, max: number = c.max) => Math.min(max, Math.max(min, n));
const budget = (f: FiscalState, key: keyof FiscalState['budgetPolicy']) => f.budgetPolicy[key] - f.baselineBudgetPolicy[key];
// 지역별 초기값을 고정 기준으로 사용하여 기본 예산에서 지역의 고유 특성을 유지합니다.
export function calculateLivingStandardTarget(id: string, { economy: e, fiscal: f, social: s }: SocialContext): number {
  const k = c.living;
  return clamp(createInitialSocial(id).livingStandard + (e.growth-c.neutralGrowth)*k.growth - (e.unemployment-c.neutralUnemployment)*k.unemployment - (e.inflation-c.neutralInflation)*k.inflation
    + budget(f,'welfare')*k.welfare + budget(f,'healthcare')*k.healthcare
    + (f.taxPolicy.incomeTaxRate-f.baselineTaxPolicy.incomeTaxRate)*k.incomeTax + (f.taxPolicy.consumptionTaxRate-f.baselineTaxPolicy.consumptionTaxRate)*k.consumptionTax
    - (s.inequality-createInitialSocial(id).inequality)*k.inequality - Math.max(0,s.inequality-k.inequalityThreshold)*k.inequalityExtra);
}
export function calculateEducationTarget(id: string, { economy: e, fiscal: f }: SocialContext): number {
  const k = c.education;
  return clamp(createInitialSocial(id).education + budget(f,'education')*k.budget + budget(f,'research')*k.research + (e.growth-c.neutralGrowth)*k.growth - (e.unemployment-c.neutralUnemployment)*k.unemployment);
}
export function calculateHealthcareTarget(id: string, { economy: e, fiscal: f, social: s }: SocialContext): number {
  const k = c.healthcare;
  return clamp(createInitialSocial(id).healthcare + budget(f,'healthcare')*k.budget + (s.livingStandard-createInitialSocial(id).livingStandard)*k.living + (e.growth-c.neutralGrowth)*k.growth - (e.unemployment-c.neutralUnemployment)*k.unemployment);
}
export function calculatePublicSafetyTarget(id: string, { economy: e, fiscal: f, social: s }: SocialContext): number {
  const k = c.safety;
  return clamp(createInitialSocial(id).publicSafety + budget(f,'security')*k.budget - (e.unemployment-c.neutralUnemployment)*k.unemployment - Math.max(0,e.unemployment-k.unemploymentThreshold)*k.unemploymentExtra
    - (s.inequality-createInitialSocial(id).inequality)*k.inequality - Math.max(0,s.inequality-k.inequalityThreshold)*k.inequalityExtra + (s.livingStandard-createInitialSocial(id).livingStandard)*k.living);
}
export function calculateInequalityTarget(id: string, { economy: e, fiscal: f }: SocialContext): number {
  const k = c.inequality;
  const advancedShare = e.gdp > 0 ? e.industries.advanced.output/e.gdp*100 : 0;
  return clamp(createInitialSocial(id).inequality + (e.unemployment-c.neutralUnemployment)*k.unemployment + budget(f,'welfare')*k.welfare
    + (f.taxPolicy.incomeTaxRate-f.baselineTaxPolicy.incomeTaxRate)*k.incomeTax + (e.growth-c.neutralGrowth)*k.growth + Math.max(0,advancedShare-k.advancedThreshold)*k.advanced);
}
export function updateSocialState(id: string, context: SocialContext): SocialState {
  const targets = { livingStandard: calculateLivingStandardTarget(id,context), education: calculateEducationTarget(id,context), healthcare: calculateHealthcareTarget(id,context), publicSafety: calculatePublicSafetyTarget(id,context), inequality: calculateInequalityTarget(id,context) };
  const bonuses=getTechnologyBonuses(context.technology);for(const key of Object.keys(bonuses.social) as (keyof typeof bonuses.social)[])targets[key]=clamp(targets[key]+(bonuses.social[key]??0));
  for(const key of Object.keys(context.crisisPressure??{}) as (keyof NonNullable<SocialContext["crisisPressure"]>)[])targets[key]=clamp(targets[key]+(context.crisisPressure?.[key]??0));
  const result = { ...context.social };
  // 모든 목표는 동일한 입력 사회 상태를 읽습니다. 지표 간 임의 순서 효과를 방지합니다.
  for (const key of socialKeys) {
    const value = clamp(context.social[key] + clamp((targets[key]-context.social[key])*c.speed[key],-c.limit[key],c.limit[key]));
    result[key] = value; result[`${key}DeltaLastMonth`] = value-context.social[key];
  }
  return result;
}
export function updateWorldSocial(world: WorldState,crisisWorld=world,damageFor:(kind:'country'|'region',id:string)=>number=()=>1): WorldState {
  const regions = Object.fromEntries(Object.entries(world.regions).map(([id,r]) => [id,{ ...r, social: r.simulationRole==='administrative'?r.social:updateSocialState(id,{...r,crisisPressure:getCrisisImpact(crisisWorld,{kind:"region",id},damageFor('region',id)).social}) }]));
  const countries = Object.fromEntries(Object.entries(world.countries).map(([id,r]) => {
    if (r.simulationMode==='aggregate_regions'||Object.values(regions).some(region => region.ownerCountryId===id&&region.simulationRole!=='administrative')) {
      const { social: _derived, ...federation } = r; return [id,federation];
    }
    return [id,{ ...r, social: updateSocialState(id,{ ...r, social: r.social ?? createInitialSocial(id),crisisPressure:getCrisisImpact(crisisWorld,{kind:"country",id},damageFor('country',id)).social }) }];
  }));
  return { ...world, countries, regions };
}
export function aggregateFederationSocial(members: readonly { population: PopulationState; social: SocialState }[]): SocialState {
  const total = members.reduce((sum,r) => sum+r.population.total,0);
  return Object.fromEntries(socialKeys.flatMap(key => [key,`${key}DeltaLastMonth` as const].map(field => [field,total>0 ? members.reduce((sum,r)=>sum+r.social[field]*r.population.total,0)/total : 0]))) as unknown as SocialState;
}

