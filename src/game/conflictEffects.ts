import { recordCrisisTerritoryChange } from './crisis';
import { mergeTechnologyStates } from './technologyEffects';
import { synchronizeMilitary } from './military';
import { synchronizeDiplomacy } from './diplomacy';
import { aggregateFederationEconomy, annualizedGrowth, sumIndustryOutput } from './economy';
import { aggregateFederationPopulation } from './population';
import { ownedRegions, refreshCountryAggregates } from './runtime';
import type { CountryRuntimeState, FiscalState, GameState, InternalConflictState, RegionRuntimeState, SpeciesId, WorldState } from './types';
const clamp=(n:number)=>Math.min(100,Math.max(0,n));
const spend=(f:FiscalState,cost:number):FiscalState=>({...f,treasury:Math.max(0,f.treasury-cost),debt:f.debt+Math.max(0,cost-f.treasury),hasIssuedDebt:f.hasIssuedDebt||cost>f.treasury});
export function applyConflictImpact(world:WorldState,countryId:string,industryLoss:number,costRate:number,long:boolean,socialScale=1):WorldState {
  const c=world.countries[countryId],members=ownedRegions(world,countryId);if(!c)return world;
  const impact=<T extends CountryRuntimeState|RegionRuntimeState>(r:T):T=>{
    const industries=Object.fromEntries(Object.entries(r.economy.industries).map(([id,i])=>[id,{...i,output:i.output*(1-(['agriculture','manufacturing','services'].includes(id)?industryLoss:0))}])) as typeof r.economy.industries;
    const gdp=sumIndustryOutput(industries),reference=r.economy.gdp/Math.pow(1+r.economy.growth/100,1/12);
    const population=structuredClone(r.population);
    if(long)for(const p of Object.values(population.species)){const outflow=Math.min(p.population,Math.round(p.population*.00006));p.population-=outflow;p.migrationLastMonth-=outflow;population.total-=outflow;population.netMigrationLastMonth-=outflow;}
    return {...r,economy:{...r.economy,industries,gdp,growth:annualizedGrowth(gdp,reference)},population,
      ...(r.social?{social:{...r.social,livingStandard:clamp(r.social.livingStandard-.12*socialScale),publicSafety:clamp(r.social.publicSafety-.15*socialScale),inequality:clamp(r.social.inequality+(long?.06:.02)*socialScale)}}:{}),
      ...(r.governance?{governance:{...r.governance,stability:clamp(r.governance.stability-.15*socialScale)}}:{})};
  };
  let next:WorldState=members.length?{...world,regions:{...world.regions,...Object.fromEntries(members.map(r=>[r.id,impact(r)]))}}:{...world,countries:{...world.countries,[countryId]:impact(c)}};
  const cost=c.economy.gdp*costRate;
  if(c.identity?.isDynamic&&members.length){const r=next.regions[members[0].id];next={...next,regions:{...next.regions,[r.id]:{...r,fiscal:spend(r.fiscal,cost)}}};}
  else next={...next,countries:{...next.countries,[countryId]:{...next.countries[countryId],fiscal:spend(next.countries[countryId].fiscal,cost)}}};
  return refreshCountryAggregates(next);
}
export function mergeFiscal(parent:FiscalState,child:FiscalState):FiscalState {
  return {...parent,treasury:parent.treasury+child.treasury,debt:parent.debt+child.debt,monthlyBalance:parent.monthlyBalance+child.monthlyBalance,
    revenue:Object.fromEntries(Object.keys(parent.revenue).map(key=>[key,parent.revenue[key as keyof typeof parent.revenue]+child.revenue[key as keyof typeof child.revenue]])) as unknown as typeof parent.revenue,
    expenditure:{...parent.expenditure,...(parent.expenditure.emergency||child.expenditure.emergency?{emergency:(parent.expenditure.emergency??0)+(child.expenditure.emergency??0)}:{}),programTotal:parent.expenditure.programTotal+child.expenditure.programTotal,interest:parent.expenditure.interest+child.expenditure.interest,total:parent.expenditure.total+child.expenditure.total,categories:Object.fromEntries(Object.keys(parent.expenditure.categories).map(key=>[key,parent.expenditure.categories[key as keyof typeof parent.expenditure.categories]+child.expenditure.categories[key as keyof typeof child.expenditure.categories]])) as typeof parent.expenditure.categories},hasIssuedDebt:parent.hasIssuedDebt||child.hasIssuedDebt};
}
export function reintegrateCountry(game:GameState,conflict:InternalConflictState,negotiated:boolean):GameState {
  const parent=game.world.countries[conflict.parentCountryId],child=game.world.countries[conflict.breakawayCountryId];if(!parent||!child)throw new Error('재통합 당사국이 존재하지 않습니다.');
  const members=ownedRegions(game.world,child.id);let countries={...game.world.countries},regions={...game.world.regions};
  const primary=child.identity!.primarySpeciesId;
  for(const member of members){const r=structuredClone(member),p=r.speciesPolitics[primary];r.ownerCountryId=parent.id;
    if(p)r.speciesPolitics[primary]={...p,satisfaction:clamp(p.satisfaction+(negotiated?4:-12)),autonomyDemand:clamp(p.autonomyDemand+(negotiated?-5:20)),independenceSentiment:clamp(Math.max(negotiated?10:25,p.independenceSentiment+(negotiated?-3:15)))};
    for(const m of Object.values(r.secession??{})){m.parentCountryId=parent.id;m.phase='inactive';m.monthsInPhase=0;m.monthsActive=0;m.createdCountryId=null;m.referendumScheduledInMonths=null;}
    if(r.secession?.[primary])r.secession[primary]!.grantedAutonomy=negotiated?80:30;
    regions[r.id]=r;
  }
  if(parent.simulationMode!=='aggregate_regions'){
    const transferred=members.map(r=>regions[r.id]);let merged=structuredClone(parent);
    merged.economy=aggregateFederationEconomy(parent.economy,[parent.economy,...transferred.map(r=>r.economy)]);
    merged.population=aggregateFederationPopulation([parent.population,...transferred.map(r=>r.population)]);
    for(const r of transferred)merged.fiscal=mergeFiscal(merged.fiscal,r.fiscal);
    const speciesPolitics={...merged.speciesPolitics};
    for(const id of Object.keys(merged.population.species) as SpeciesId[]){const old=parent.speciesPolitics?.[id],incoming=transferred.find(r=>r.speciesPolitics[id])?.speciesPolitics[id];if(!incoming)continue;const a=parent.population.species[id]?.population??0,b=transferred.reduce((s,r)=>s+(r.population.species[id]?.population??0),0),total=a+b;speciesPolitics[id]={...incoming,...(old?{satisfaction:(old.satisfaction*a+incoming.satisfaction*b)/total,autonomyDemand:(old.autonomyDemand*a+incoming.autonomyDemand*b)/total,independenceSentiment:(old.independenceSentiment*a+incoming.independenceSentiment*b)/total}: {})};}
    merged.speciesPolitics=speciesPolitics;merged.technology=transferred.reduce((t,r)=>mergeTechnologyStates(t,r.technology),parent.technology);
    const movement=transferred[0]?.secession?.[primary];if(movement)merged.secession={...merged.secession,[primary]:{...movement,jurisdictionId:parent.id}};
    countries[parent.id]=merged;
    // 직접 국가로 자산을 합쳤으므로 영토는 행정용으로 보존하고 중복 시뮬레이션하지 않습니다.
    for(const r of transferred){const zero=structuredClone(r);zero.simulationRole='administrative';zero.economy={...zero.economy,gdp:0,industries:Object.fromEntries(Object.entries(zero.economy.industries).map(([id,i])=>[id,{...i,output:0}])) as typeof zero.economy.industries};zero.population={species:{},total:0,birthsLastMonth:0,deathsLastMonth:0,netMigrationLastMonth:0};zero.fiscal={...zero.fiscal,treasury:0,debt:0,monthlyBalance:0,revenue:{incomeTax:0,corporateTax:0,consumptionTax:0,total:0},expenditure:{...zero.fiscal.expenditure,...(zero.fiscal.expenditure.emergency!==undefined?{emergency:0}:{}),programTotal:0,interest:0,total:0,categories:Object.fromEntries(Object.keys(zero.fiscal.expenditure.categories).map(id=>[id,0])) as typeof zero.fiscal.expenditure.categories}};regions[r.id]=zero;}
  }
  delete countries[child.id];
  const retiredCountryIdentities={...game.world.retiredCountryIdentities,[child.id]:structuredClone(child.identity!)};
  const internalConflicts=Object.fromEntries(Object.entries(game.world.internalConflicts??{}).map(([id,c])=>[id,c.status==='resolved'||id===conflict.id?c:c.parentCountryId===child.id?{...c,parentCountryId:parent.id,parentName:parent.identity!.name}:c.breakawayCountryId===child.id?{...c,status:'resolved' as const,resolution:'forced_reintegration' as const,resolvedDate:{...game.date}}:c]));
  let world=synchronizeMilitary(synchronizeDiplomacy(refreshCountryAggregates({...game.world,countries,regions,retiredCountryIdentities,internalConflicts})));
  const closedWars=Object.values(world.warfare!.wars).filter(w=>w.status==='resolved'&&game.world.warfare?.wars[w.id]?.status!=='resolved');
  if(closedWars.length){const state=world.warfare!;world={...world,warfare:{...state,wars:{...state.wars,...Object.fromEntries(closedWars.map(w=>[w.id,{...w,resolvedDate:{...game.date}}]))},history:[...closedWars.map(w=>({id:'war-removed-'+w.id+'-'+game.turn,date:{...game.date},turn:game.turn,warId:w.id,countryNames:{...w.countryNames},summary:w.countryNames[w.primaryAttacker]+' — '+w.countryNames[w.primaryDefender]+': 참전국 재통합에 따른 전쟁 종료'})),...state.history]}};}
  const history=game.world.diplomacy?.history??[];world={...world,diplomacy:{...world.diplomacy!,history:[{id:`diplomacy-remove-${child.id}-${game.turn}`,date:{...game.date},turn:game.turn,actorId:parent.id,targetId:child.id,actorName:parent.identity!.name,targetName:child.identity!.name,action:'country_removed',accepted:true,relationSnapshots:Object.values(game.world.diplomacy?.relations??{}).filter(r=>r.countryA===child.id||r.countryB===child.id).map(r=>({...r})),summary:`${child.identity!.name} 재통합: 활성 외교관계 정리`},...history]}};
  const removedRef=(j:{kind:string;id:string})=>(j.kind==='country'&&j.id===child.id)||(j.kind==='region'&&regions[j.id]?.simulationRole==='administrative');
  const events={...game.events,pendingEvent:game.events.pendingEvent&&(removedRef(game.events.pendingEvent.jurisdiction)||game.events.pendingEvent.diplomaticTargetId===child.id||(game.events.pendingEvent.warId&&world.warfare!.wars[game.events.pendingEvent.warId]?.status==='resolved'))?null:game.events.pendingEvent,
    activeEffects:game.events.activeEffects.filter(e=>!removedRef(e.jurisdiction)&&!e.effects.some(effect=>effect.kind==='diplomacy'&&effect.targetId===child.id)),cooldowns:Object.fromEntries(Object.entries(game.events.cooldowns).filter(([key])=>!key.startsWith(`country:${child.id}:`)))};
  // 자산 이전 시 보존하고, 강제 재통합의 복구 비용은 다음 세 달에 납부합니다.
  if(!negotiated){const target=parent.simulationMode==='aggregate_regions'?{kind:'region' as const,id:members[0].id}:{kind:'country' as const,id:parent.id};
    events.activeEffects.push({id:'reconstruction-'+conflict.id,sourceEventId:'conflict-parent-victory',jurisdiction:target,remainingMonths:3,effects:[{kind:'treasury',amount:-child.economy.gdp*.001},{kind:'social',metric:'livingStandard',delta:-.3}]});
  }
  const defeated=game.player.controlledCountryId===child.id;
  return recordCrisisTerritoryChange(game,{...game,world,events,gameOverReason:defeated?'state_defeat':game.gameOverReason,
    player:defeated?{...game.player,controlledCountryId:parent.id,controlledRegionId:null,defeatedCountryId:child.id}:game.player});
}
