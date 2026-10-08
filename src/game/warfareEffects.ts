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
  const region=world.regions[front.regionId];if(!region||region.simulationRole==='administrative')return world;
  let r=structuredClone(region);const occupied=front.controllerCountryId!==r.ownerCountryId;
  if(occupied){
    const before=r.economy.gdp;for(const id of ['agriculture','manufacturing','services'] as const)r.economy.industries[id].output*=1-config.occupationLoss;
    r.economy.gdp=Object.values(r.economy.industries).reduce((s,i)=>s+i.output,0);r.economy.growth=(Math.pow(r.economy.gdp/(before/Math.pow(1+r.economy.growth/100,1/12)||1),12)-1)*100;
    const loss=r.fiscal.revenue.total*config.occupationRevenueLoss;
    r.fiscal={...r.fiscal,treasury:Math.max(0,r.fiscal.treasury-loss),debt:r.fiscal.debt+Math.max(0,loss-r.fiscal.treasury),monthlyBalance:r.fiscal.monthlyBalance-loss,revenue:Object.fromEntries(Object.entries(r.fiscal.revenue).map(([id,n])=>[id,n*(1-config.occupationRevenueLoss)])) as unknown as typeof r.fiscal.revenue};
    r.social.publicSafety=clamp(r.social.publicSafety-.2);
  }
  if(months>=config.longWarMonths)for(const p of Object.values(r.population.species)){const outflow=Math.min(p.population,Math.round(p.population*config.frontMigrationOutflow));p.population-=outflow;p.migrationLastMonth-=outflow;r.population.total-=outflow;r.population.netMigrationLastMonth-=outflow;}
  return refreshCountryAggregates({...world,regions:{...world.regions,[r.id]:r}});
}
export function applyMobilizationCosts(world:WorldState):WorldState {
  let next=world;for(const c of Object.values(world.countries)){const excess=Math.max(0,(c.military?.mobilization??15)-20)/100;if(!excess)continue;
    next=applyConflictImpact(next,c.id,excess*.0005,excess*.0002,false,excess);
  }return next;
}
function absorbRegion(world:WorldState,parentId:string,region:RegionRuntimeState):WorldState {
  const p=world.countries[parentId],r={...region,ownerCountryId:parentId};
  if(p.simulationMode==='aggregate_regions')return {...world,regions:{...world.regions,[r.id]:r}};
  const population=aggregateFederationPopulation([p.population,r.population]),politics={...p.speciesPolitics};
  for(const id of Object.keys(r.population.species) as SpeciesId[]){const incoming=r.speciesPolitics[id],old=p.speciesPolitics?.[id],a=p.population.species[id]?.population??0,b=r.population.species[id]?.population??0,total=a+b;if(incoming)politics[id]=old&&total?{...old,satisfaction:(old.satisfaction*a+incoming.satisfaction*b)/total,autonomyDemand:(old.autonomyDemand*a+incoming.autonomyDemand*b)/total,independenceSentiment:(old.independenceSentiment*a+incoming.independenceSentiment*b)/total}:{...incoming};}
  const parent={...p,technology:mergeTechnologyStates(p.technology,r.technology),population,speciesPolitics:politics,economy:aggregateFederationEconomy(p.economy,[p.economy,r.economy]),fiscal:mergeFiscal(p.fiscal,r.fiscal)};
  const zero=structuredClone(r);zero.simulationRole='administrative';zero.economy.gdp=0;zero.economy.growth=0;for(const i of Object.values(zero.economy.industries))i.output=0;
  zero.population={species:{},total:0,birthsLastMonth:0,deathsLastMonth:0,netMigrationLastMonth:0};
  zero.fiscal={...zero.fiscal,treasury:0,debt:0,monthlyBalance:0,revenue:{incomeTax:0,corporateTax:0,consumptionTax:0,total:0},expenditure:{...zero.fiscal.expenditure,...(zero.fiscal.expenditure.emergency!==undefined?{emergency:0}:{}),programTotal:0,interest:0,total:0,categories:Object.fromEntries(Object.keys(zero.fiscal.expenditure.categories).map(id=>[id,0])) as typeof zero.fiscal.expenditure.categories}};
  return {...world,countries:{...world.countries,[parentId]:parent},regions:{...world.regions,[zero.id]:zero}};
}
function transferWarTerritoryCore(game:GameState,regionIds:string[],receiver:string):GameState {
  let world=game.world;const losers=new Set<string>();
  for(const id of regionIds){const r=world.regions[id];if(!r||r.simulationRole==='administrative'||r.ownerCountryId===receiver)throw new Error('이전할 활성 영토가 필요합니다.');
    const owner=world.countries[r.ownerCountryId];if(!owner.identity?.isDynamic&&ownedRegions(world,owner.id).length<=1)throw new Error('시작 국가의 마지막 영토 이전은 지원하지 않습니다.');
    losers.add(owner.id);world=absorbRegion(world,receiver,r);
  }
  world=refreshCountryAggregates(world);const removed:string[]=[];let player={...game.player},gameOverReason=game.gameOverReason;
  for(const id of losers){const c=world.countries[id];if(c?.identity?.isDynamic&&c.simulationMode==='aggregate_regions'&&!ownedRegions(world,id).length){
    const countries={...world.countries};delete countries[id];removed.push(id);world={...world,countries,retiredCountryIdentities:{...world.retiredCountryIdentities,[id]:structuredClone(c.identity)}};
    if(player.controlledCountryId===id){player={...player,controlledCountryId:receiver,controlledRegionId:null,defeatedCountryId:id};gameOverReason='state_defeat';}
  }}
  if(player.controlledRegionId&&world.regions[player.controlledRegionId]?.ownerCountryId!==player.controlledCountryId)player.controlledRegionId=ownedRegions(world,player.controlledCountryId)[0]?.id??null;
  if(removed.length){
    const internalConflicts=Object.fromEntries(Object.entries(world.internalConflicts??{}).map(([id,c])=>[id,c.status==='resolved'?c:removed.includes(c.breakawayCountryId)?{...c,status:'resolved' as const,resolution:'forced_reintegration' as const,resolvedDate:{...game.date}}:removed.includes(c.parentCountryId)?{...c,parentCountryId:receiver,parentName:world.countries[receiver].identity!.name}:c]));
    const warfare=world.warfare!;world={...world,internalConflicts,warfare:{...warfare,wars:Object.fromEntries(Object.entries(warfare.wars).map(([id,w])=>[id,w.status!=='resolved'&&removed.some(c=>w.participants[c])?{...w,status:'resolved' as const,resolution:'status_quo' as const,resolvedDate:{...game.date},fronts:w.fronts.map(f=>({...f,controllerCountryId:world.regions[f.regionId]?.ownerCountryId??receiver}))}:w])),casusBelli:Object.fromEntries(Object.entries(warfare.casusBelli).filter(([,b])=>!removed.includes(b.holderCountryId)&&!removed.includes(b.targetCountryId))),truces:Object.fromEntries(Object.entries(warfare.truces).filter(([,t])=>!removed.includes(t.countryA)&&!removed.includes(t.countryB))),allyRequests:warfare.allyRequests.filter(r=>!removed.includes(r.allyCountryId)&&!removed.includes(r.requesterCountryId))}};
  }
  const gone=(kind:string,id:string)=>kind==='country'?removed.includes(id):world.regions[id]?.simulationRole==='administrative';
  const pending=game.events.pendingEvent,events={...game.events,pendingEvent:pending&&(gone(pending.jurisdiction.kind,pending.jurisdiction.id)||removed.includes(pending.diplomaticTargetId??'')||(pending.warId&&world.warfare!.wars[pending.warId]?.status==='resolved'))?null:pending,
    activeEffects:game.events.activeEffects.filter(e=>!gone(e.jurisdiction.kind,e.jurisdiction.id)&&!e.effects.some(effect=>effect.kind==='diplomacy'&&removed.includes(effect.targetId))),cooldowns:Object.fromEntries(Object.entries(game.events.cooldowns).filter(([key])=>!removed.some(id=>key.startsWith(`country:${id}:`))))};
  world=synchronizeDiplomacy(refreshCountryAggregates(world));world={...world,countries:Object.fromEntries(Object.entries(world.countries).map(([id,c])=>[id,{...c,military:{...c.military!,activeWars:c.military!.activeWars.filter(id=>world.warfare!.wars[id]?.status!=='resolved')}}]))};
  return recordCrisisTerritoryChange(game,{...game,world,events,player,gameOverReason});
}

export function transferWarTerritory(...args:Parameters<typeof transferWarTerritoryCore>):GameState { return synchronizePolicySchedules(args[0],collectHistory(args[0],transferWarTerritoryCore(...args))); }


