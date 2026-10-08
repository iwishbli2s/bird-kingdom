import { getCrisisImpact, crisesFor, crisisRuntime, calculateCrisisDamage } from './crisis';
import { getTechnologyBonuses } from './technologyEffects';
import { getPassageMigrationAdjustment } from './diplomacyEffects';
import { populationConfig as config, speciesDefinitions } from './populationConfig';
import type { EconomyState, FiscalState, PopulationState, SpeciesDefinition, SpeciesId, SpeciesPopulationState, SocialState, WorldState } from './types';

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
type PopulationFiscal = Pick<FiscalState, 'budgetPolicy' | 'baselineBudgetPolicy'>;
type PopulationEconomy = Pick<EconomyState, 'growth' | 'unemployment'>;
const budgetMultiplier = (delta: number, response: number) => clamp(1 + delta * response, config.budgetMultiplierMin, config.budgetMultiplierMax);

export function calculateBirthRate(definition: SpeciesDefinition, economy: PopulationEconomy, fiscal: PopulationFiscal): number {
  const economic = clamp(1 + ((economy.growth - config.neutralGrowth) * config.birthGrowthResponse
    - (economy.unemployment - config.neutralUnemployment) * config.birthUnemploymentResponse) * definition.economicSensitivity, config.birthEconomicMin, config.birthEconomicMax);
  const welfare = budgetMultiplier(fiscal.budgetPolicy.welfare - fiscal.baselineBudgetPolicy.welfare, config.welfareBirthResponse);
  return definition.baseAnnualBirthRate * economic * welfare;
}
export function calculateDeathRate(definition: SpeciesDefinition, social: Pick<SocialState, 'healthcare'>): number {
  const healthcare = budgetMultiplier(social.healthcare - config.neutralSocial, config.healthcareDeathResponse);
  return definition.baseAnnualDeathRate * healthcare;
}
export function calculateMigrationRate(definition: SpeciesDefinition, economy: PopulationEconomy, social: Pick<SocialState, 'livingStandard'> = { livingStandard: config.neutralSocial }): number {
  const pressure = ((economy.growth - config.neutralGrowth) * config.migrationGrowthResponse
    - (economy.unemployment - config.neutralUnemployment) * config.migrationUnemploymentResponse) * definition.economicSensitivity;
  return clamp(definition.baseAnnualMigrationRate + pressure + (social.livingStandard-config.neutralSocial)*config.livingMigrationResponse, config.migrationMin, config.migrationMax);
}

function summarize(species: PopulationState['species']): PopulationState {
  const entries = Object.values(species);
  return { species, total: entries.reduce((sum, s) => sum + s.population, 0),
    birthsLastMonth: entries.reduce((sum, s) => sum + s.birthsLastMonth, 0),
    deathsLastMonth: entries.reduce((sum, s) => sum + s.deathsLastMonth, 0),
    netMigrationLastMonth: entries.reduce((sum, s) => sum + s.migrationLastMonth, 0) };
}

export function createInitialPopulation(profile: Partial<Record<SpeciesId, number>>): PopulationState {
  return summarize(Object.fromEntries(speciesDefinitions.filter(d => profile[d.id] !== undefined).map(d => {
    const population = profile[d.id]!;
    if (!Number.isSafeInteger(population) || population < 0) throw new RangeError('초기 인구는 음수가 아닌 안전한 정수여야 합니다.');
    return [d.id, { speciesId: d.id, population, birthRate: d.baseAnnualBirthRate, deathRate: d.baseAnnualDeathRate,
      migrationRate: d.baseAnnualMigrationRate, birthsLastMonth: 0, deathsLastMonth: 0, migrationLastMonth: 0 }];
  })));
}

export function updatePopulation(previous: PopulationState, economy: PopulationEconomy, fiscal: PopulationFiscal, social: Pick<SocialState, 'healthcare' | 'livingStandard'> = { livingStandard: config.neutralSocial, healthcare: config.neutralSocial }, migrationAdjustment=0,mortalityReduction=0,crisisMortalityMultiplier=1): PopulationState {
  const species: PopulationState['species'] = {};
  for (const definition of speciesDefinitions) {
    const before = previous.species[definition.id];
    if (!before) continue; // 존재하지 않는 집단을 이동으로 생성하지 않습니다.
    const birthRate = calculateBirthRate(definition, economy, fiscal);
    const deathRate = calculateDeathRate(definition, social)*(1-clamp(mortalityReduction,0,.15))*clamp(crisisMortalityMultiplier,1,1.8);
    const migrationRate = clamp(calculateMigrationRate(definition, economy, social)+migrationAdjustment,config.migrationMin,config.migrationMax);
    // 연율/12 방식. 세 흐름을 각각 반올림하여 인구 증감과 월 기록이 정확히 일치합니다.
    const birthsLastMonth = Math.round(before.population * birthRate / 100 / config.monthsPerYear);
    const deathsLastMonth = Math.min(before.population, Math.round(before.population * deathRate / 100 / config.monthsPerYear));
    const remaining = before.population + birthsLastMonth - deathsLastMonth;
    const migrationLastMonth = Math.max(-remaining, Math.round(before.population * migrationRate / 100 / config.monthsPerYear));
    species[definition.id] = { speciesId: definition.id, population: remaining + migrationLastMonth,
      birthRate, deathRate, migrationRate, birthsLastMonth, deathsLastMonth, migrationLastMonth };
  }
  return summarize(species);
}

export function aggregateFederationPopulation(members: readonly PopulationState[]): PopulationState {
  const species: PopulationState['species'] = {};
  for (const definition of speciesDefinitions) {
    const entries = members.flatMap(member => member.species[definition.id] ? [member.species[definition.id]!] : []);
    if (!entries.length) continue;
    const population = entries.reduce((sum, s) => sum + s.population, 0);
    const weighted = (key: 'birthRate' | 'deathRate' | 'migrationRate') => population > 0 ? entries.reduce((sum, s) => sum + s[key] * s.population, 0) / population : definition[key === 'birthRate' ? 'baseAnnualBirthRate' : key === 'deathRate' ? 'baseAnnualDeathRate' : 'baseAnnualMigrationRate'];
    species[definition.id] = { speciesId: definition.id, population, birthRate: weighted('birthRate'), deathRate: weighted('deathRate'), migrationRate: weighted('migrationRate'),
      birthsLastMonth: entries.reduce((sum, s) => sum + s.birthsLastMonth, 0), deathsLastMonth: entries.reduce((sum, s) => sum + s.deathsLastMonth, 0), migrationLastMonth: entries.reduce((sum, s) => sum + s.migrationLastMonth, 0) };
  }
  return summarize(species);
}

export function updateWorldPopulation(world: WorldState,crisisWorld=world,damageFor:(kind:'country'|'region',id:string)=>number=()=>1): WorldState {
  const regions = Object.fromEntries(Object.entries(world.regions).map(([id, region]) => [id, { ...region, population: region.simulationRole==='administrative'?region.population:updatePopulation(region.population, region.economy, region.fiscal, region.social,getPassageMigrationAdjustment(world,region.ownerCountryId)+getCrisisImpact(crisisWorld,{kind:"region",id},damageFor('region',id)).migrationAdjustment,getTechnologyBonuses(region.technology).mortality,getCrisisImpact(crisisWorld,{kind:"region",id},damageFor('region',id)).mortalityMultiplier) }]));
  const countries = Object.fromEntries(Object.entries(world.countries).map(([id, country]) => {
    const members = Object.values(regions).filter(region => region.ownerCountryId === id && region.simulationRole!=='administrative').map(region => region.population);
    return [id, { ...country, population: (country.simulationMode==='aggregate_regions'||members.length) ? aggregateFederationPopulation(members) : updatePopulation(country.population, country.economy, country.fiscal, country.social,getPassageMigrationAdjustment(world,id)+getCrisisImpact(crisisWorld,{kind:"country",id},damageFor('country',id)).migrationAdjustment,getTechnologyBonuses(country.technology).mortality,getCrisisImpact(crisisWorld,{kind:"country",id},damageFor('country',id)).mortalityMultiplier) }];
  }));
  let result:WorldState={ ...world, countries, regions };
  if(!Object.keys(crisisWorld.crises?.activeCrises??{}).length||!result.crises)return result;
  // Counterfactual uses identical monthly inputs, with no crisis modifier and no RNG.
  // Allocate the actual excess deaths and displaced net migrants once across local crises.
  const baseline=updateWorldPopulation(world,{...crisisWorld,crises:{activeCrises:{},history:[],nextId:1}});
  const state=structuredClone(result.crises);
  for(const kind of ['country','region'] as const)for(const id of Object.keys(kind==='country'?countries:regions)){
    const j={kind,id},cs=crisesFor(crisisWorld,j).sort((a,b)=>a.id.localeCompare(b.id));if(!cs.length)continue;
    const key=kind==='country'?'countries':'regions',a=result[key][id].population,b=baseline[key][id].population;
    const impact=Math.max(0,a.deathsLastMonth-b.deathsLastMonth)+Math.max(0,b.netMigrationLastMonth-a.netMigrationLastMonth);
    const r=crisisRuntime(crisisWorld,j)!,weights=cs.map(c=>calculateCrisisDamage(c,r)),total=weights.reduce((s,n)=>s+n,0);let assigned=0;
    cs.forEach((c,i)=>{const amount=i===cs.length-1?impact-assigned:Math.floor(impact*(total?weights[i]/total:1/cs.length));assigned+=amount;
      if(state.activeCrises[c.id])state.activeCrises[c.id].totalPopulationImpact+=amount;
      else state.history=state.history.map(h=>h.crisisId===c.id&&h.action==='complete'&&h.elapsedMonths===c.elapsedMonths+1?{...h,populationImpact:h.populationImpact+amount}:h);
    });
  }
  return {...result,crises:state};
}
export const populationChange = (population: PopulationState) => population.birthsLastMonth - population.deathsLastMonth + population.netMigrationLastMonth;
export const speciesShare = (species: SpeciesPopulationState, population: PopulationState) => population.total > 0 ? species.population / population.total * 100 : 0;

