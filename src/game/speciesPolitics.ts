import { initialAutonomy, secessionConfig } from './secessionConfig';
import { initialGovernance } from './governanceConfig';
import { createInitialSocial } from './socialConfig';
import { getSpeciesPoliticalBaseline, initialSpeciesPolitics, speciesPoliticsConfig as config } from './speciesPoliticsConfig';
import { speciesDefinitions } from './populationConfig';
import { speciesShare } from './population';
import type { EconomyState, FiscalState, GovernanceState, PopulationState, SocialState, SpeciesDefinition, SpeciesId, SpeciesPoliticalBaseline, SpeciesPoliticalState, SpeciesPoliticsState, SecessionState, WorldState } from './types';

export interface SpeciesPoliticsContext { economy: EconomyState; fiscal: FiscalState; governance: GovernanceState; population: PopulationState; social: SocialState; secession?: SecessionState }
const clamp = (n: number, min = config.min as number, max = config.max as number) => Math.min(max, Math.max(min, n));
const move = (current: number, target: number, speed: number, limit: number) => clamp(current + clamp((target - current) * speed, -limit, limit));
const share = (population: PopulationState, id: SpeciesId) => population.species[id] ? speciesShare(population.species[id]!, population) : 0;
export const representationGap = (populationShare: number, influence: number) => populationShare - influence;

export function calculateSatisfactionTarget(baseline: SpeciesPoliticalBaseline, definition: SpeciesDefinition, context: SpeciesPoliticsContext): number {
  const { economy: e, fiscal: f, social: s } = context;
  const economy = ((e.growth - config.neutralGrowth) * config.growthEffect - (e.unemployment - config.neutralUnemployment) * config.unemploymentEffect - (e.inflation - config.neutralInflation) * config.inflationEffect) * definition.economicSensitivity;
  const taxes = (f.taxPolicy.incomeTaxRate - f.baselineTaxPolicy.incomeTaxRate) * config.incomeTaxEffect + (f.taxPolicy.consumptionTaxRate - f.baselineTaxPolicy.consumptionTaxRate) * config.consumptionTaxEffect;
  const social = (s.livingStandard-config.neutralLivingStandard)*config.livingStandardEffect + (s.inequality-config.neutralLivingStandard)*config.inequalityEffect
    + (s.publicSafety-config.neutralLivingStandard)*config.publicSafetyEffect + (s.healthcare-config.neutralLivingStandard)*config.healthcareEffect + (s.education-config.neutralLivingStandard)*config.educationEffect;
  return clamp(baseline.satisfaction + economy + taxes + social);
}
export const calculateInfluenceTarget = (baseline: SpeciesPoliticalBaseline, populationShare: number) => clamp(populationShare + baseline.influenceBias);

export function calculateAutonomyTarget(baseline: SpeciesPoliticalBaseline, satisfaction: number, gap: number, integration: number): number {
  const discomfort = Math.max(0, config.satisfactionLow - satisfaction) * config.autonomyLowEffect
    + Math.max(0, config.satisfactionVeryLow - satisfaction) * config.autonomyVeryLowEffect
    + Math.max(0, satisfaction - config.satisfactionComfort) * config.autonomyComfortEffect;
  return clamp(baseline.autonomyDemand + discomfort + Math.max(0, gap) * config.autonomyRepresentationEffect + (config.neutralIntegration - integration) * config.autonomyIntegrationEffect);
}
export function calculateIndependenceTarget(baseline: SpeciesPoliticalBaseline, satisfaction: number, autonomy: number, gap: number, integration: number): number {
  const [low, medium, high] = config.autonomyThresholds;
  const [weak, meaningful, strong] = config.autonomyPressureSlopes;
  const pressure = Math.min(Math.max(0, autonomy - low), medium - low) * weak
    + Math.min(Math.max(0, autonomy - medium), high - medium) * meaningful + Math.max(0, autonomy - high) * strong;
  const distress = clamp((config.satisfactionComfort - satisfaction) / config.independenceDistressSpan, 0, 1);
  const gate = clamp((autonomy - low) / (config.max - low), 0, 1);
  const aggravation = (Math.max(0, gap) * config.independenceRepresentationEffect + Math.max(0, config.neutralIntegration - integration) * config.independenceIntegrationEffect) * gate;
  const recovery = Math.max(0, satisfaction - config.independenceRecoverySatisfaction) * config.independenceRecoveryEffect + Math.max(0, integration - config.neutralIntegration) * config.independenceIntegrationRecovery;
  return clamp(baseline.independenceSentiment + (pressure + aggravation) * distress - recovery);
}
export function createInitialSpeciesPolitics(jurisdictionId: string, population: PopulationState): SpeciesPoliticsState {
  return Object.fromEntries(Object.values(population.species).map(entry => {
    const initial = initialSpeciesPolitics[jurisdictionId]?.[entry.speciesId];
    const baseline = getSpeciesPoliticalBaseline(jurisdictionId, entry.speciesId);
    return [entry.speciesId, { speciesId: entry.speciesId, satisfaction: initial?.[0] ?? baseline.satisfaction,
      politicalInfluence: initial?.[1] ?? calculateInfluenceTarget(baseline, share(population, entry.speciesId)), autonomyDemand: initial?.[2] ?? baseline.autonomyDemand, independenceSentiment: initial?.[3] ?? baseline.independenceSentiment,
      satisfactionDeltaLastMonth: 0, influenceDeltaLastMonth: 0, autonomyDeltaLastMonth: 0, independenceDeltaLastMonth: 0 }];
  }));
}
export function updateSpeciesPolitics(jurisdictionId: string, previous: SpeciesPoliticsState, context: SpeciesPoliticsContext): SpeciesPoliticsState {
  const result: SpeciesPoliticsState = {};
  for (const definition of speciesDefinitions) {
    if (!context.population.species[definition.id]) continue;
    const before = previous[definition.id] ?? createInitialSpeciesPolitics(jurisdictionId, context.population)[definition.id]!;
    const baseline = getSpeciesPoliticalBaseline(jurisdictionId, definition.id);
    const currentShare = share(context.population, definition.id);
    const satisfaction = move(before.satisfaction, calculateSatisfactionTarget(baseline, definition, context)+((context.secession?.[definition.id]?.grantedAutonomy??initialAutonomy[jurisdictionId]?.[definition.id]??25)-(initialAutonomy[jurisdictionId]?.[definition.id]??25))*secessionConfig.autonomySatisfaction, config.satisfactionSpeed, config.satisfactionMaxChange);
    const politicalInfluence = move(before.politicalInfluence, calculateInfluenceTarget(baseline, currentShare), config.influenceSpeed, config.influenceMaxChange);
    const gap = representationGap(currentShare, politicalInfluence);
    const autonomyDemand = move(before.autonomyDemand, calculateAutonomyTarget(baseline, satisfaction, gap, context.governance.integration)-((context.secession?.[definition.id]?.grantedAutonomy??initialAutonomy[jurisdictionId]?.[definition.id]??25)-(initialAutonomy[jurisdictionId]?.[definition.id]??25))*secessionConfig.autonomyDemandRelief, config.autonomySpeed, config.autonomyMaxChange);
    const independenceSentiment = move(before.independenceSentiment, calculateIndependenceTarget(baseline, satisfaction, autonomyDemand, gap, context.governance.integration)-((context.secession?.[definition.id]?.grantedAutonomy??initialAutonomy[jurisdictionId]?.[definition.id]??25)-(initialAutonomy[jurisdictionId]?.[definition.id]??25))*secessionConfig.autonomyIndependenceRelief, config.independenceSpeed, config.independenceMaxChange);
    result[definition.id] = { speciesId: definition.id, satisfaction, politicalInfluence, autonomyDemand, independenceSentiment,
      satisfactionDeltaLastMonth: satisfaction - before.satisfaction, influenceDeltaLastMonth: politicalInfluence - before.politicalInfluence,
      autonomyDeltaLastMonth: autonomyDemand - before.autonomyDemand, independenceDeltaLastMonth: independenceSentiment - before.independenceSentiment };
  }
  return result;
}
export function updateWorldSpeciesPolitics(world: WorldState): WorldState {
  const regions = Object.fromEntries(Object.entries(world.regions).map(([id, region]) => [id, { ...region, speciesPolitics: region.simulationRole==='administrative'?region.speciesPolitics:updateSpeciesPolitics(id, region.speciesPolitics, region) }]));
  const countries = Object.fromEntries(Object.entries(world.countries).map(([id, country]) => {
    if (country.simulationMode==='aggregate_regions'||Object.values(regions).some(region => region.ownerCountryId === id && region.simulationRole!=='administrative')) {
      const { speciesPolitics: _derived, ...federation } = country;
      return [id, federation]; // 연방 정치값은 저장하지 않고 필요할 때 주에서 집계합니다.
    }
    return [id, { ...country, speciesPolitics: updateSpeciesPolitics(id, country.speciesPolitics ?? {}, { ...country, social: country.social ?? createInitialSocial(id), governance: country.governance ?? { ...initialGovernance } }) }];
  }));
  return { ...world, countries, regions };
}
export function aggregateFederationSpeciesPolitics(members: readonly { population: PopulationState; speciesPolitics?: SpeciesPoliticsState }[]): SpeciesPoliticsState {
  const result: SpeciesPoliticsState = {};
  for (const definition of speciesDefinitions) {
    const entries = members.flatMap(member => {
      const politics = member.speciesPolitics?.[definition.id]; const population = member.population.species[definition.id]?.population ?? 0;
      return politics ? [{ politics, population }] : [];
    });
    if (!entries.length) continue;
    const total = entries.reduce((sum, e) => sum + e.population, 0);
    const weighted = (key: Exclude<keyof SpeciesPoliticalState, 'speciesId'>) => total > 0 ? clamp(entries.reduce((sum, e) => sum + e.politics[key] * e.population, 0) / total, key.includes('Delta') ? -config.max : config.min, config.max) : 0;
    result[definition.id] = { speciesId: definition.id, satisfaction: weighted('satisfaction'), politicalInfluence: weighted('politicalInfluence'), autonomyDemand: weighted('autonomyDemand'), independenceSentiment: weighted('independenceSentiment'), satisfactionDeltaLastMonth: weighted('satisfactionDeltaLastMonth'), influenceDeltaLastMonth: weighted('influenceDeltaLastMonth'), autonomyDeltaLastMonth: weighted('autonomyDeltaLastMonth'), independenceDeltaLastMonth: weighted('independenceDeltaLastMonth') };
  }
  return result;
}
