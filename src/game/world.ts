import { synchronizeGovernmentAI } from './aiState';
import { createCrisisSystem } from './crisis';
import { synchronizeTechnology } from './technology';
import { synchronizeMilitary } from './military';
import { synchronizeDiplomacy } from './diplomacy';
import { derivedCountryRuntime } from './runtime';
import { createSecessionState } from './secessionInitial';
import { createInitialSocial } from './socialConfig';
import { countries, initialGovernance, regions } from './data';
import { aggregateFederationEconomy, createInitialEconomy } from './economy';
import { initialEconomyProfiles } from './economyConfig';
import { createInitialFiscal } from './fiscal';
import { countryFiscalProfiles, initialRegionalFinance, regionalFiscalProfile } from './fiscalConfig';
import { initialRegionalBudgets } from './budgetConfig';
import { aggregateFederationPopulation, createInitialPopulation } from './population';
import { initialPopulationProfiles } from './populationConfig';
import { createInitialSpeciesPolitics } from './speciesPolitics';
import type { GameState, CountryRuntimeState, RegionRuntimeState, WorldState } from './types';

export function createInitialWorldState(): WorldState {
  const regionStates = Object.fromEntries(regions.map(region => {
    const economy = createInitialEconomy(initialEconomyProfiles[region.id]);
    const population = createInitialPopulation(initialPopulationProfiles[region.id]);
    return [region.id, {
      regionIdentity: { id:region.id,name:region.name,primarySpeciesId:Object.values(population.species).sort((a,b)=>b.population-a.population)[0].speciesId,createdDate:{year:2030,month:1},isDynamic:false },secession:createSecessionState(region.id,region.initialOwnerCountryId,population),
      id: region.id, ownerCountryId: region.initialOwnerCountryId,
      population, social: createInitialSocial(region.id), speciesPolitics: createInitialSpeciesPolitics(region.id, population),
      economy, fiscal: createInitialFiscal({ ...regionalFiscalProfile, ...initialRegionalFinance[region.id], budgetPolicy: initialRegionalBudgets[region.id] }, economy), governance: { ...initialGovernance },
    }];
  }));
  return synchronizeGovernmentAI(synchronizeMilitary(synchronizeDiplomacy(synchronizeTechnology({
    crises:createCrisisSystem(),internalConflicts:{},retiredCountryIdentities:{},
    countries: Object.fromEntries(countries.map(country => {
      const profile = initialEconomyProfiles[country.id];
      const members = Object.values(regionStates).filter(region => region.ownerCountryId === country.id).map(region => region.economy);
      const economy = profile ? createInitialEconomy(profile)
        : aggregateFederationEconomy(members[0], members);
      const populationMembers = Object.values(regionStates).filter(region => region.ownerCountryId === country.id).map(region => region.population);
      const population = populationMembers.length ? aggregateFederationPopulation(populationMembers) : createInitialPopulation(initialPopulationProfiles[country.id]);
      return [country.id, { identity:{id:country.id,name:country.name,governmentLabel:country.governmentLabel,primarySpeciesId:country.speciesIds[0],foundedDate:{year:2030,month:1},originCountryId:null,status:'established',isDynamic:false,territorialDispute:'none'},simulationMode:country.regionIds.length?'aggregate_regions':'direct',...(populationMembers.length?{}:{secession:createSecessionState(country.id,country.id,population)}),id: country.id, economy, population, ...(populationMembers.length ? {} : { social: createInitialSocial(country.id), speciesPolitics: createInitialSpeciesPolitics(country.id, population) }), fiscal: createInitialFiscal(countryFiscalProfiles[country.governmentType], economy), ...(populationMembers.length ? {} : { governance: { ...initialGovernance } }) }];
    })),
    regions: regionStates,
  }))));
}

// UI는 운영 대상의 런타임 지표를 읽으며 세계의 다른 개체와 값을 공유하지 않습니다.
export function selectControlledRuntime(game: GameState): CountryRuntimeState | RegionRuntimeState {
  const { controlledCountryId, controlledRegionId } = game.player;
  const runtime = controlledRegionId === null
    ? derivedCountryRuntime(game.world,controlledCountryId) : game.world.regions[controlledRegionId];
  if (!runtime) throw new Error('운영 대상의 런타임 상태가 없습니다.');
  return runtime;
}
