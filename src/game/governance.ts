import { governanceConfig as c, governanceKeys, initialGovernance } from './governanceConfig';
import { createInitialSocial } from './socialConfig';
import type { EconomyState, FiscalState, GovernanceState, PopulationState, SocialState, SpeciesId, SpeciesPoliticsState, WorldState } from './types';

export interface GovernanceContext {
  economy: EconomyState; fiscal: FiscalState; social: SocialState;
  population: PopulationState; speciesPolitics?: SpeciesPoliticsState; governance: GovernanceState;
}
const clamp = (n: number, min: number = c.min, max: number = c.max) => Math.min(max,Math.max(min,n));
/** 정치 상태가 없는 집단은 분모에서도 제외합니다. 빈/0인구 입력은 중립 만족도를 사용합니다. */
export function aggregateSpeciesPoliticalInputs(population: PopulationState, politics: SpeciesPoliticsState = {}) {
  const entries = Object.values(population.species).flatMap(p => politics[p.speciesId] ? [{ population:p.population, politics:politics[p.speciesId]! }] : []);
  const total = entries.reduce((sum,e)=>sum+e.population,0);
  const weighted = (key: 'satisfaction' | 'autonomyDemand' | 'independenceSentiment') => total>0 ? entries.reduce((sum,e)=>sum+e.population*e.politics[key],0)/total : key==='satisfaction' ? c.neutralSocial : 0;
  return { satisfaction:weighted('satisfaction'), autonomyDemand:weighted('autonomyDemand'), independenceSentiment:weighted('independenceSentiment') };
}
export function calculateMinorityCrisisPressure(population: PopulationState, politics: SpeciesPoliticsState = {}): { pressure: number; speciesId: SpeciesId | null } {
  let pressure=0; let speciesId: SpeciesId | null=null;
  if(population.total<=0) return { pressure,speciesId };
  for(const id of Object.keys(population.species).sort() as SpeciesId[]) {
    const p=politics[id]; if(!p) continue;
    const k=c.distress;
    const distress=clamp(Math.max(0,k.satisfactionThreshold-p.satisfaction)*k.satisfaction + Math.max(0,p.autonomyDemand-k.autonomyThreshold)*k.autonomy + Math.max(0,p.independenceSentiment-k.independenceThreshold)*k.independence,0,k.limit);
    const risk=population.species[id]!.population/population.total*distress;
    if(risk>pressure){pressure=risk;speciesId=id;}
  }
  return { pressure,speciesId };
}
export function calculateApprovalTarget({economy:e,fiscal:f,social:s,population,speciesPolitics}: GovernanceContext): number {
  const k=c.approval, p=aggregateSpeciesPoliticalInputs(population,speciesPolitics);
  // 월 수지를 연간 GDP 대비 %로 정규화하고 영향 자체를 작게 제한합니다.
  const balance=e.gdp>0 ? f.monthlyBalance/e.gdp*12*100 : 0;
  const debtRatio=e.gdp>0 ? f.debt/e.gdp : 0;
  return clamp(k.baseline + (e.growth-c.neutralGrowth)*k.growth - (e.unemployment-c.neutralUnemployment)*k.unemployment - (e.inflation-c.neutralInflation)*k.inflation
    + (s.livingStandard-c.neutralSocial)*k.living + (s.inequality-c.neutralSocial)*k.inequality + (s.publicSafety-c.neutralSocial)*k.safety + (p.satisfaction-c.neutralSocial)*k.satisfaction
    + (f.taxPolicy.incomeTaxRate-f.baselineTaxPolicy.incomeTaxRate)*k.incomeTax + (f.taxPolicy.consumptionTaxRate-f.baselineTaxPolicy.consumptionTaxRate)*k.consumptionTax + (f.taxPolicy.corporateTaxRate-f.baselineTaxPolicy.corporateTaxRate)*k.corporateTax
    + clamp(balance*k.balance,-k.balanceLimit,k.balanceLimit) - Math.min(k.debtLimit,Math.max(0,debtRatio-k.debtThreshold)*k.debt));
}
export function calculateStabilityTarget({economy:e,social:s,governance:g,population,speciesPolitics}: GovernanceContext): number {
  const k=c.stability,p=aggregateSpeciesPoliticalInputs(population,speciesPolitics);
  return clamp(k.baseline + (s.publicSafety-c.neutralSocial)*k.safety - (e.unemployment-c.neutralUnemployment)*k.unemployment + (s.inequality-c.neutralSocial)*k.inequality
    - Math.max(0,k.approvalThreshold-g.approval)*k.approval - Math.max(0,k.approvalSevere-g.approval)*k.approvalExtra
    - Math.max(0,k.satisfactionThreshold-p.satisfaction)*k.satisfaction - p.autonomyDemand*k.autonomy - p.independenceSentiment*k.independence
    - calculateMinorityCrisisPressure(population,speciesPolitics).pressure*k.crisis);
}
export function calculateIntegrationTarget({social:s,population,speciesPolitics}: GovernanceContext): number {
  const k=c.integration,p=aggregateSpeciesPoliticalInputs(population,speciesPolitics);
  return clamp(k.baseline + (p.satisfaction-c.neutralSocial)*k.satisfaction - p.autonomyDemand*k.autonomy - p.independenceSentiment*k.independence + (s.inequality-c.neutralSocial)*k.inequality + (s.livingStandard-c.neutralSocial)*k.living);
}
export function updateGovernanceState(context: GovernanceContext): GovernanceState {
  const result={...context.governance};
  const move=(key: typeof governanceKeys[number],target:number)=>{
    result[key]=clamp(context.governance[key]+clamp((target-context.governance[key])*c.speed[key],-c.limit[key],c.limit[key]));
    result[`${key}DeltaLastMonth`]=result[key]-context.governance[key];
  };
  move('approval',calculateApprovalTarget(context));
  // 안정도는 이번 달 새 지지도를 읽습니다. 종족정치를 다시 계산하지 않습니다.
  move('stability',calculateStabilityTarget({...context,governance:result}));
  move('integration',calculateIntegrationTarget(context));
  return result;
}
export function updateWorldGovernance(world: WorldState): WorldState {
  const regions=Object.fromEntries(Object.entries(world.regions).map(([id,r])=>[id,{...r,governance:r.simulationRole==='administrative'?r.governance:updateGovernanceState(r)}]));
  const countries=Object.fromEntries(Object.entries(world.countries).map(([id,r])=>{
    if(r.simulationMode==='aggregate_regions'||Object.values(regions).some(region=>region.ownerCountryId===id&&region.simulationRole!=='administrative')){const {governance:_derived,...federation}=r;return [id,federation];}
    return [id,{...r,governance:updateGovernanceState({...r,social:r.social??createInitialSocial(id),governance:r.governance??{...initialGovernance}})}];
  }));
  return {...world,countries,regions};
}
export function aggregateFederationGovernance(members: readonly {population: PopulationState; governance: GovernanceState}[]): GovernanceState {
  const total=members.reduce((sum,r)=>sum+r.population.total,0);
  return Object.fromEntries(governanceKeys.flatMap(key=>[key,`${key}DeltaLastMonth` as const].map(field=>[field,total>0 ? members.reduce((sum,r)=>sum+r.governance[field]*r.population.total,0)/total : 0]))) as unknown as GovernanceState;
}
