import { synchronizeGovernmentAI } from './aiState';
import { synchronizeCrises } from './crisis';
import { aggregateTechnologyStates } from './technologyEffects';
import { countries, regions } from './data';
import { aggregateFederationEconomy } from './economy';
import { aggregateFederationPopulation } from './population';
import { aggregateFederationSocial } from './social';
import { aggregateFederationSpeciesPolitics } from './speciesPolitics';
import { aggregateFederationGovernance } from './governance';
import type { CountryDefinition, GameState, RegionDefinition, SpeciesId, WorldState } from './types';
export const ownedRegions=(world:WorldState,id:string)=>Object.values(world.regions).filter(r=>r.ownerCountryId===id&&r.simulationRole!=='administrative');
export function controlledRegionId(game:GameState):string|null {
  if(game.player.controlledRegionId)return game.player.controlledRegionId;
  const c=game.world.countries[game.player.controlledCountryId];
  return c.identity?.isDynamic&&c.simulationMode==='aggregate_regions'?ownedRegions(game.world,c.id)[0]?.id??null:null;
}
export function countryInfo(game:GameState,id:string):CountryDefinition {
  const c=game.world.countries[id],original=countries.find(c=>c.id===id);
  const retired=game.world.retiredCountryIdentities?.[id];
  if(!c&&!retired)throw new Error('존재하지 않는 국가입니다.');
  return {...original,id,name:(c?.identity??retired)?.name??original?.name??id,englishName:original?.englishName??'INDEPENDENT REPUBLIC',
    governmentType:original?.governmentType??'centralized-presidential-republic',governmentLabel:(c?.identity??retired)?.governmentLabel??original?.governmentLabel??'대통령제 공화국',
    description:original?.description??'둥지권과 비행 회랑의 행정을 이어가는 신생 공화국.',playScope:'국가 전체 운영',
    speciesIds:Object.keys(c?.population.species??{}) as SpeciesId[],regionIds:ownedRegions(game.world,id).map(r=>r.id)};
}
export function regionInfo(game:GameState,id:string|null):RegionDefinition|undefined {
  if(!id)return undefined;const r=game.world.regions[id],original=regions.find(r=>r.id===id);if(!r)return undefined;
  return {...original,id,initialOwnerCountryId:original?.initialOwnerCountryId??'sparrow',name:r.regionIdentity?.name??original?.name??id,
    englishName:original?.englishName??'NEST TERRITORY',specialty:original?.specialty??'독립 둥지권',description:original?.description??'새로운 행정 둥지권',isCapital:original?.isCapital??false};
}
export function refreshCountryAggregates(world:WorldState):WorldState {
  return synchronizeGovernmentAI(synchronizeCrises({...world,countries:Object.fromEntries(Object.entries(world.countries).map(([id,c])=>{
    const members=ownedRegions(world,id);if(c.simulationMode!=='aggregate_regions'&&!members.length)return [id,c];
    const economy=members.length?aggregateFederationEconomy(c.economy,members.map(r=>r.economy)):{...c.economy,gdp:0,growth:0,industries:Object.fromEntries(Object.entries(c.economy.industries).map(([id,i])=>[id,{...i,output:0}])) as typeof c.economy.industries};
    const {social:_social,governance:_governance,speciesPolitics:_politics,...rest}=c;
    return [id,{...rest,technology:aggregateTechnologyStates(members),economy,population:aggregateFederationPopulation(members.map(r=>r.population)),
      ...(c.identity?.isDynamic&&members.length===1?{fiscal:members[0].fiscal}: {})}];
  }))}));
}
export function derivedCountryRuntime(world:WorldState,id:string) {
  const c=world.countries[id],members=ownedRegions(world,id);if(c.simulationMode!=='aggregate_regions'&&!members.length)return c;
  return {...c,social:aggregateFederationSocial(members),governance:aggregateFederationGovernance(members),
    speciesPolitics:aggregateFederationSpeciesPolitics(members),secession:members.length===1?members[0].secession:{}};
}
