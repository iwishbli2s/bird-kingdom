import {dissolveCountry} from './countryDissolution';
import {directCoreId, materializeDirectCore, sovereignTerritories, extractDirectTerritory,directTerritoryShare} from './territory';
import {synchronizePolicySchedules} from './policySchedule';
import { collectHistory } from './history';
import { recordCrisisTerritoryChange } from './crisis';
import { mergeTechnologyStates } from './technologyEffects';
import { applyConflictImpact, mergeFiscal } from './conflictEffects';
import { aggregateFederationEconomy } from './economy';
import { aggregateFederationPopulation } from './population';
import { ownedRegions, refreshCountryAggregates } from './runtime';
import { synchronizeDiplomacy } from './diplomacy';
import { warfareConfig as config } from './warfareConfig';
import { clampMilitary as clamp } from './militaryPower';
import type { GameState, RegionRuntimeState, SpeciesId, WarFrontState, WorldState } from './types';
export function applyWarCosts(world:WorldState,countryId:string,active:boolean,_months:number):WorldState {
  const m=world.countries[countryId].military!,excess=Math.max(0,m.mobilization-20)/100;
  return applyConflictImpact(world,countryId,active?config.industryLoss+excess*.001:0,(active?config.warCostRate:config.ceasefireCostRate)*(1+excess),active&&_months>=config.longWarMonths,active?1:0);
}
export function applyOccupationImpact(world:WorldState,front:WarFrontState,months:number):WorldState {
  const region=world.regions[front.regionId];if(!region)return world;
  const direct=region.simulationRole==='administrative';
  const source=direct?world.countries[region.ownerCountryId]:region;if(!source||direct&&world.countries[region.ownerCountryId]?.simulationMode!=='direct')return world;
  const share=direct?directTerritoryShare(world,region):1;
  let r=structuredClone(source);const occupied=front.controllerCountryId!==region.ownerCountryId;
  if(occupied){
    const before=r.economy.gdp;for(const id of ['agriculture','manufacturing','services'] as const)r.economy.industries[id].output*=1-config.occupationLoss*share;
    r.economy.gdp=Object.values(r.economy.industries).reduce((s,i)=>s+i.output,0);r.economy.growth=(Math.pow(r.economy.gdp/(before/Math.pow(1+r.economy.growth/100,1/12)||1),12)-1)*100;
    const loss=r.fiscal.revenue.total*config.occupationRevenueLoss*share;
    r.fiscal={...r.fiscal,treasury:Math.max(0,r.fiscal.treasury-loss),debt:r.fiscal.debt+Math.max(0,loss-r.fiscal.treasury),monthlyBalance:r.fiscal.monthlyBalance-loss,revenue:Object.fromEntries(Object.entries(r.fiscal.revenue).map(([id,n])=>[id,n*(1-config.occupationRevenueLoss*share)])) as unknown as typeof r.fiscal.revenue};
    r.social!.publicSafety=clamp(r.social!.publicSafety-.2*share);
  }
  if(months>=config.longWarMonths)for(const p of Object.values(r.population.species)){const outflow=Math.min(p.population,Math.round(p.population*config.frontMigrationOutflow*share));p.population-=outflow;p.migrationLastMonth-=outflow;r.population.total-=outflow;r.population.netMigrationLastMonth-=outflow;}
  return refreshCountryAggregates(direct?{...world,countries:{...world.countries,[r.id]:r as WorldState['countries'][string]}}:{...world,regions:{...world.regions,[r.id]:r as RegionRuntimeState}});
}
export function applyMobilizationCosts(world:WorldState):WorldState {
  let next=world;for(const c of Object.values(world.countries)){const excess=Math.max(0,(c.military?.mobilization??15)-20)/100;if(!excess)continue;
    next=applyConflictImpact(next,c.id,excess*.0005,excess*.0002,false,excess);
  }return next;
}
function absorbRegion(world:WorldState,parentId:string,region:RegionRuntimeState):WorldState {
  const p=world.countries[parentId],r={...region,ownerCountryId:parentId};
  if(p.simulationMode==='aggregate_regions')return {...world,regions:{...world.regions,[r.id]:r}};
  // Normalize the existing share ledger to today's direct assets before adding
  // a newly acquired district. Growth stays in the existing country simulation.
  const members=Object.values(world.regions).filter(x=>x.ownerCountryId===parentId),fallback=world.regions[directCoreId(parentId)]?.directAssetWeight??1;
  const total=members.reduce((s,x)=>s+(x.directAssetWeight??fallback),0);
  const normalized=Object.fromEntries(members.map(x=>[x.id,{...x,directAssetWeight:total>0?(x.directAssetWeight??fallback)*p.economy.gdp/total:0}]));
  const population=aggregateFederationPopulation([p.population,r.population]),politics={...p.speciesPolitics};
  for(const id of Object.keys(r.population.species) as SpeciesId[]){const incoming=r.speciesPolitics[id],old=p.speciesPolitics?.[id],a=p.population.species[id]?.population??0,b=r.population.species[id]?.population??0,total=a+b;if(incoming)politics[id]=old&&total?{...old,satisfaction:(old.satisfaction*a+incoming.satisfaction*b)/total,autonomyDemand:(old.autonomyDemand*a+incoming.autonomyDemand*b)/total,independenceSentiment:(old.independenceSentiment*a+incoming.independenceSentiment*b)/total}:{...incoming};}
  const parent={...p,technology:mergeTechnologyStates(p.technology,r.technology),population,speciesPolitics:politics,economy:aggregateFederationEconomy(p.economy,[p.economy,r.economy]),fiscal:mergeFiscal(p.fiscal,r.fiscal)};
  const zero=structuredClone(r);zero.simulationRole='administrative';zero.economy.gdp=0;zero.economy.growth=0;for(const i of Object.values(zero.economy.industries))i.output=0;
  zero.directAssetWeight=r.economy.gdp;
  zero.population={species:{},total:0,birthsLastMonth:0,deathsLastMonth:0,netMigrationLastMonth:0};
  zero.fiscal={...zero.fiscal,treasury:0,debt:0,monthlyBalance:0,revenue:{incomeTax:0,corporateTax:0,consumptionTax:0,total:0},expenditure:{...zero.fiscal.expenditure,...(zero.fiscal.expenditure.emergency!==undefined?{emergency:0}:{}),programTotal:0,interest:0,total:0,categories:Object.fromEntries(Object.keys(zero.fiscal.expenditure.categories).map(id=>[id,0])) as typeof zero.fiscal.expenditure.categories}};
  return {...world,countries:{...world.countries,[parentId]:parent},regions:{...world.regions,...normalized,[zero.id]:zero}};
}
function transferWarTerritoryCore(game:GameState,regionIds:string[],receiver:string):GameState {
  if(game.gameOverReason||!game.world.countries[receiver]||!regionIds.length||new Set(regionIds).size!==regionIds.length)throw new Error('유효한 영토 이전이 필요합니다.');
  let next=game;
  for(const id of regionIds){const c=Object.values(next.world.countries).find(c=>directCoreId(c.id)===id);if(c)next=materializeDirectCore(next,c.id);}
  for(const id of regionIds){const r=next.world.regions[id];if(!r||!next.world.countries[r.ownerCountryId]||r.ownerCountryId===receiver)throw new Error('다른 소유국의 영토가 필요합니다.');}
  next=materializeDirectCore(next,receiver);
  const losers=new Set<string>();let world=next.world;
  for(const id of regionIds){const r=world.regions[id];losers.add(r.ownerCountryId);const extracted=extractDirectTerritory(world,r);world=absorbRegion(extracted.world,receiver,extracted.region);}
  next={...next,world:refreshCountryAggregates(world)};
  for(const id of losers)if(!sovereignTerritories(next.world,id).length)next=dissolveCountry(next,id,{successorId:receiver});
  if(next.player.controlledRegionId&&next.world.regions[next.player.controlledRegionId]?.ownerCountryId!==next.player.controlledCountryId)next={...next,player:{...next.player,controlledRegionId:ownedRegions(next.world,next.player.controlledCountryId)[0]?.id??null}};
  const gone=(j:{kind:string;id:string})=>j.kind==='region'&&next.world.regions[j.id]?.simulationRole==='administrative';
  next={...next,events:{...next.events,pendingEvent:next.events.pendingEvent&&gone(next.events.pendingEvent.jurisdiction)?null:next.events.pendingEvent,activeEffects:next.events.activeEffects.filter(e=>!gone(e.jurisdiction))}};
  return recordCrisisTerritoryChange(game,{...next,world:synchronizeDiplomacy(refreshCountryAggregates(next.world))});
}

export function transferWarTerritory(...args:Parameters<typeof transferWarTerritoryCore>):GameState {
  let before=args[0];
  for(const id of args[1]){const c=Object.values(before.world.countries).find(c=>directCoreId(c.id)===id);if(c)before=materializeDirectCore(before,c.id);}
  return synchronizePolicySchedules(args[0],collectHistory(before,transferWarTerritoryCore(before,args[1],args[2])));
}


