import {balanceAdjustments,growthConvergenceConfig} from './balanceConfig';
import { economyConfig as config, industryConfig, industryIds, type InitialEconomyProfile } from './economyConfig';
import type { EconomyState, IndustryId, IndustryState, WorldState } from './types';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export const annualToMonthlyRate = (rate: number) => Math.expm1(Math.log1p(rate) / 12);
export const annualizedGrowth = (current: number, previous: number) => previous > 0 ? Math.expm1(Math.log(current / previous) * 12) * 100 : 0;
export const sumIndustryOutput = (industries: Record<IndustryId, IndustryState>) => industryIds.reduce((sum, id) => sum + industries[id].output, 0);

export function createInitialEconomy(profile: InitialEconomyProfile): EconomyState {
  const industries = Object.fromEntries(industryIds.map(id => [id, { output: profile.gdp * profile.shares[id], productivity: 100 }])) as Record<IndustryId, IndustryState>;
  const structuralGrowth = industryIds.reduce((sum, id) => sum + profile.shares[id] * (industryConfig[id].annualGrowth + industryConfig[id].annualProductivityGrowth), 0);
  const sensitivity = industryIds.reduce((sum, id) => sum + profile.shares[id] * industryConfig[id].cycleSensitivity, 0);
  return { gdp: sumIndustryOutput(industries), growth: profile.growth, unemployment: profile.unemployment,
    inflation: profile.inflation, industries,
    cycle: clamp((profile.growth / 100 - structuralGrowth) / sensitivity, -1, 1) };
}

export interface IndustryModifiers { annualGrowthAdjustment?: number; productivityMultiplier?: number }
export interface EconomyUpdateOptions {
  random?: () => number;
  shockMultiplier?:number;
  referenceShares?:Partial<Record<IndustryId,number>>;
  industryModifiers?: Partial<Record<IndustryId, IndustryModifiers>>;
}
/** Remaining expansion depends on accumulated productivity, never absolute GDP. */
export function matureGrowthFactor(productivity:number):number {const excess=Math.max(0,Math.log(Math.max(1,productivity)/growthConvergenceConfig.matureProductivity));return 1/(1+growthConvergenceConfig.growthResponse*excess*excess);}
export function diminishedProductivityMultiplier(productivity:number,multiplier:number):number {if(multiplier<=1)return multiplier;return 1+(multiplier-1)/(1+growthConvergenceConfig.productivityBonusResponse*Math.max(0,productivity/growthConvergenceConfig.matureProductivity-1));}
/** Calibrate normal employment/inflation against remaining structural potential in a mature economy. */
export function matureNeutralGrowth(economy:EconomyState,referenceShares?:Partial<Record<IndustryId,number>>):number {
 let potential=0,loss=0;
 for(const id of industryIds){const previous=economy.industries[id],spec=industryConfig[id],share=previous.output/Math.max(1,economy.gdp),reference=referenceShares?.[id];const pressure=reference?Math.max(0,share/reference-balanceAdjustments.sectorShareThreshold)*balanceAdjustments.sectorGrowthPressure:0;potential+=share*(spec.annualGrowth-pressure+spec.annualProductivityGrowth);loss+=share*spec.annualGrowth*(1-matureGrowthFactor(previous.productivity));}
 return config.neutralGrowth*Math.max(.1,1-loss/Math.max(.001,potential));
}
function shock(random: () => number, multiplier=1): number {
  const sample = random();
  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) throw new RangeError('경제 난수는 0 이상 1 미만이어야 합니다.');
  const value=sample*2-1; return value<-.75?value*multiplier:value;
}

export function updateEconomy(economy: EconomyState, options: EconomyUpdateOptions = {}): EconomyState {
  const random = options.random ?? Math.random;
  const cycle = clamp(economy.cycle * config.cyclePersistence + shock(random) * config.cycleShockWeight, -1, 1);
  const industries = Object.fromEntries(industryIds.map(id => {
    const previous = economy.industries[id];
    const spec = industryConfig[id];
    const modifier = options.industryModifiers?.[id];
    const adjustment = modifier?.annualGrowthAdjustment ?? 0;
    const productivityMultiplier = modifier?.productivityMultiplier ?? 1;
    if (!Number.isFinite(adjustment) || !Number.isFinite(productivityMultiplier) || productivityMultiplier < 0) throw new RangeError('산업 modifier가 유효하지 않습니다.');
    const share=previous.output/Math.max(1,economy.gdp),reference=options.referenceShares?.[id];
    const pressure=reference?Math.max(0,share/reference-balanceAdjustments.sectorShareThreshold)*balanceAdjustments.sectorGrowthPressure:0;
    const annualRate = clamp((spec.annualGrowth+Math.max(0,adjustment))*matureGrowthFactor(previous.productivity)-pressure + cycle * spec.cycleSensitivity + shock(random,options.shockMultiplier) * config.annualIndustryNoise + Math.min(0,adjustment), config.annualGrowthMin, config.annualGrowthMax);
    const productivityRate = annualToMonthlyRate(clamp(spec.annualProductivityGrowth * diminishedProductivityMultiplier(previous.productivity,productivityMultiplier), 0, config.annualGrowthMax));
    return [id, { output: Math.max(0, previous.output * (1 + annualToMonthlyRate(annualRate)) * (1 + productivityRate)),
      productivity: previous.productivity * (1 + productivityRate) }];
  })) as Record<IndustryId, IndustryState>;
  const gdp = sumIndustryOutput(industries);
  const growth = annualizedGrowth(gdp, economy.gdp);
  const neutralGrowth=matureNeutralGrowth(economy,options.referenceShares);
  const unemploymentChange = clamp((neutralGrowth - growth) * config.unemploymentResponse, -config.unemploymentMaxChange, config.unemploymentMaxChange);
  const unemployment = clamp(economy.unemployment + unemploymentChange, config.unemploymentMin, config.unemploymentMax);
  const targetInflation = config.inflationAnchor + (growth - neutralGrowth) * config.inflationGrowthPressure
    + cycle * config.inflationCyclePressure + (config.neutralUnemployment - unemployment) * config.inflationLaborPressure;
  const inflationChange = clamp((targetInflation - economy.inflation) * (1 - config.inflationPersistence), -config.inflationMaxChange, config.inflationMaxChange);
  const inflation = clamp(economy.inflation + inflationChange, config.inflationMin, config.inflationMax);
  return { ...economy, industries, cycle, gdp, growth, unemployment, inflation };
}

export function aggregateFederationEconomy(previous: EconomyState, members: readonly EconomyState[], afterMonthlyUpdate = false): EconomyState {
  if (members.length === 0) return previous;
  const gdp = members.reduce((sum, member) => sum + member.gdp, 0);
  const weighted = (key: 'growth' | 'unemployment' | 'inflation' | 'cycle') => gdp > 0 ? members.reduce((sum, member) => sum + member[key] * member.gdp, 0) / gdp : 0;
  const industries = Object.fromEntries(industryIds.map(id => {
    const output = members.reduce((sum, member) => sum + member.industries[id].output, 0);
    const productivity = output > 0 ? members.reduce((sum, member) => sum + member.industries[id].productivity * member.industries[id].output, 0) / output : 100;
    return [id, { output, productivity }];
  })) as Record<IndustryId, IndustryState>;
  return { ...previous, industries, gdp, cycle: clamp(weighted('cycle'), -1, 1),
    unemployment: clamp(weighted('unemployment'), config.unemploymentMin, config.unemploymentMax),
    inflation: clamp(weighted('inflation'), config.inflationMin, config.inflationMax),
    growth: afterMonthlyUpdate ? annualizedGrowth(gdp, previous.gdp) : weighted('growth') };
}

export interface WorldEconomyUpdateOptions extends EconomyUpdateOptions {
  referenceSharesFor?:(kind:'country'|'region',id:string)=>EconomyUpdateOptions['referenceShares'];
  shockMultiplierFor?:(kind:'country'|'region',id:string)=>number;
  modifiersFor?: (kind: 'country' | 'region', id: string) => EconomyUpdateOptions['industryModifiers'];
}
export function updateWorldEconomy(world: WorldState, options: WorldEconomyUpdateOptions = {}): WorldState {
  // 플레이어 선택이나 객체 삽입 순서에 영향을 받지 않도록 ID 순으로 난수를 소비합니다.
  const regions = Object.fromEntries(Object.keys(world.regions).sort().map(id => {
    const region = world.regions[id];
    if(region.simulationRole==='administrative')return [id,region];
    return [id, { ...region, economy: updateEconomy(region.economy, { ...options, referenceShares:options.referenceSharesFor?.('region',id)??options.referenceShares, shockMultiplier:options.shockMultiplierFor?.('region',id)??options.shockMultiplier, industryModifiers: options.modifiersFor?.('region', id) ?? options.industryModifiers }) }];
  }));
  const countries = Object.fromEntries(Object.keys(world.countries).sort().map(id => {
    const country = world.countries[id];
    const members = Object.values(regions).filter(region => region.ownerCountryId === id && region.simulationRole!=='administrative').map(region => region.economy);
    return [id, { ...country, economy: country.simulationMode==='aggregate_regions'&&members.length===0 ? {...country.economy,gdp:0,growth:0,industries:Object.fromEntries(Object.entries(country.economy.industries).map(([key,i])=>[key,{...i,output:0}])) as EconomyState['industries']} : members.length > 0
      ? aggregateFederationEconomy(country.economy, members, true)
      : updateEconomy(country.economy, { ...options, referenceShares:options.referenceSharesFor?.('country',id)??options.referenceShares, shockMultiplier:options.shockMultiplierFor?.('country',id)??options.shockMultiplier, industryModifiers: options.modifiersFor?.('country', id) ?? options.industryModifiers }) }];
  }));
  return { ...world, countries, regions };
}


