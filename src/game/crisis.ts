import {jurisdictionDifficulty} from './difficulty';
import { collectHistory } from './history';
import { economyConfig } from './economyConfig';
import { crisisConfig as config, crisisDefinitions } from './crisisConfig';
import { getTechnologyBonuses } from './technologyEffects';
import { controlledRegionId, countryInfo, regionInfo, refreshCountryAggregates } from './runtime';
import { appendGameLog } from './logs';
import type { IndustryModifiers } from './economy';
import type { ActiveCrisisState, CrisisImpact, CrisisResilience, CrisisSystemState, CrisisType, EventRuntime, GameState, Jurisdiction, WorldState } from './types';
export const clampCrisis=(n:number,min=0,max=100)=>Number.isFinite(n)?Math.max(min,Math.min(max,n)):min;
export const createCrisisSystem=():CrisisSystemState=>({activeCrises:{},history:[],nextId:1});
export const crisisJurisdiction=(c:ActiveCrisisState):Jurisdiction=>({kind:c.jurisdictionKind,id:c.jurisdictionId});
export function crisisRuntime(world:WorldState,j:Jurisdiction):EventRuntime|undefined {
 const r=j.kind==='country'?world.countries[j.id]:world.regions[j.id];
 return r?.social&&r.governance&&r.speciesPolitics&&!(j.kind==='region'&&world.regions[j.id].simulationRole==='administrative')?r as EventRuntime:undefined;
}
export const crisisOwner=(world:WorldState,j:Jurisdiction)=>j.kind==='country'?j.id:world.regions[j.id]?.ownerCountryId;
export const crisesFor=(world:WorldState,j:Jurisdiction)=>Object.values(world.crises?.activeCrises??{}).filter(c=>c.jurisdictionId===j.id&&c.jurisdictionKind===j.kind);
export const crisisJurisdictions=(world:WorldState):Jurisdiction[]=>[...Object.values(world.regions).filter(r=>r.simulationRole!=='administrative').map(r=>({kind:'region' as const,id:r.id})),...Object.values(world.countries).filter(c=>c.social&&c.simulationMode!=='aggregate_regions').map(c=>({kind:'country' as const,id:c.id}))].sort((a,b)=>(a.kind+':'+a.id).localeCompare(b.kind+':'+b.id));
export function calculateCrisisResilience(r:EventRuntime):CrisisResilience {
 const t=(key:keyof NonNullable<typeof r.technology>['domains'])=>clampCrisis(r.technology?.domains[key].level??0,0,10)*10;
 const money=clampCrisis(r.fiscal.treasury/Math.max(1,r.economy.gdp)*150);
 const infraBudget=clampCrisis(r.fiscal.budgetPolicy.infrastructure*15),healthBudget=clampCrisis(r.fiscal.budgetPolicy.healthcare*15);
 const information=t('information');
 const infrastructure=clampCrisis(r.social.publicSafety*.3+infraBudget*.2+t('infrastructure')*.3+information*.1+money*.1);
 const medical=clampCrisis(r.social.healthcare*.4+healthBudget*.2+t('medicine')*.3+information*.1);
 const foodSecurity=clampCrisis(clampCrisis(r.economy.industries.agriculture.output/Math.max(1,r.economy.gdp)*300)*.2+t('agriculture')*.4+infrastructure*.25+money*.15);
 return {infrastructure,medical,foodSecurity,information,emergencyResponse:clampCrisis(r.social.publicSafety*.25+infrastructure*.3+information*.2+r.governance.stability*.15+money*.1)};
}
export function calculateCrisisDamage(c:ActiveCrisisState,r:EventRuntime):number {
 const def=crisisDefinitions[c.type],res=calculateCrisisResilience(r),bonuses=getTechnologyBonuses(r.technology,true);
 const tag=def.resilience==='foodSecurity'?'food':c.category==='disease'?'disease':c.type==='corridor_icing'?'corridor':'wind';
 const protection=clampCrisis((bonuses.eventDamage[tag]??0)+(c.type==='wetland_contamination'?(bonuses.eventDamage.food??0)*.5:0),0,.4);
 const exposure=['wetland_drought','reed_fire','wetland_contamination'].includes(c.type)?1+(r.population.species.duck?.population??0)/Math.max(1,r.population.total)*.25:1;
 const vulnerability=1+(100-r.social.livingStandard)/500;
 return clampCrisis(c.intensity/100*exposure*vulnerability*(1-res[def.resilience]/125)*(1-protection)*(1-c.responseProtection)*(c.phase==='recovery'?.45:1),0,1.3);
}
export function calculateCrisisSeverity(game:GameState,j:Jurisdiction,type:CrisisType,eventSeverity=2):number {
 const r=crisisRuntime(game.world,j);if(!r)return 0;
 const def=crisisDefinitions[type],res=calculateCrisisResilience(r),month=game.date.month;
 const seasonal=type==='corridor_icing'&&[12,1,2].includes(month)?8:['great_storm','wetland_drought','reed_fire'].includes(type)&&[6,7,8].includes(month)?6:0;
 const recent=game.events.history.filter(e=>e.jurisdiction.id===j.id&&e.jurisdiction.kind===j.kind&&game.turn-e.turn<=6&&e.category==='disaster').length;
 return clampCrisis(eventSeverity*24+seasonal+(50-res[def.resilience])*.12+crisesFor(game.world,j).length*3+Math.min(6,recent*2));
}
function name(game:GameState,j:Jurisdiction){return j.kind==='region'?regionInfo(game,j.id)?.name??j.id:countryInfo(game,j.id).name;}
function history(game:GameState,c:ActiveCrisisState,action:'start'|'complete'|'aid'|'transfer'|'retired',summary:string):GameState {
 const state=game.world.crises??createCrisisSystem(),j=crisisJurisdiction(c);
 const entry={id:`${c.id}:${action}:${game.turn}:${state.history.length}`,crisisId:c.id,type:c.type,date:{...game.date},turn:game.turn,jurisdiction:j,jurisdictionName:name(game,j),action,summary,populationImpact:c.totalPopulationImpact,fiscalCost:c.totalFiscalCost,elapsedMonths:c.elapsedMonths};
 return {...game,world:{...game.world,crises:{...state,history:[entry,...state.history]}}};
}
function startCrisisCore(game:GameState,j:Jurisdiction,type:CrisisType,severity?:number,sourceEventId:string|null=null,protection=0,activityReduction=0):GameState {
 if(!crisisRuntime(game.world,j))throw new Error('위기를 처리할 수 없는 관할입니다.');
 if(crisesFor(game.world,j).some(c=>c.type===type))return game;
 const state=game.world.crises??createCrisisSystem(),def=crisisDefinitions[type],strength=clampCrisis(severity??calculateCrisisSeverity(game,j,type));
 const c:ActiveCrisisState={id:`crisis-${state.nextId}`,type,category:def.category,jurisdictionId:j.id,jurisdictionKind:j.kind,severity:strength,intensity:strength,phase:'active',elapsedMonths:0,remainingMonths:def.maxMonths,recoveryProgress:0,sourceEventId,totalPopulationImpact:0,totalFiscalCost:0,isContained:false,spreadPressure:0,responseProtection:clampCrisis(protection,0,.65),activityReduction:clampCrisis(activityReduction,0,.04),startedTurn:game.turn};
 let next:GameState={...game,world:{...game.world,crises:{...state,nextId:state.nextId+1,activeCrises:{...state.activeCrises,[c.id]:c}}}};
 if(strength>=50)next=history(next,c,'start',`${name(game,j)} — ${def.name} 발생`);
 return next;
}
export function getCrisisImpact(world:WorldState,j:Jurisdiction,damageMultiplier=1):CrisisImpact {
 const r=crisisRuntime(world,j),result:CrisisImpact={damage:0,mortalityMultiplier:1,migrationAdjustment:0,social:{},duckSatisfaction:0,logisticsPenalty:0};if(!r)return result;
 for(const c of crisesFor(world,j)){
  const damage=calculateCrisisDamage(c,r)*damageMultiplier,def=crisisDefinitions[c.type];result.damage+=damage;
  result.mortalityMultiplier+=damage*def.mortality;
  result.migrationAdjustment-=damage*(['nest_cliff_failure','wetland_drought','wetland_contamination'].includes(c.type)?.12:.05);
  result.social.livingStandard=(result.social.livingStandard??0)-damage*12;
  result.social.publicSafety=(result.social.publicSafety??0)-damage*(c.category==='disaster'?12:3);
  result.social.healthcare=(result.social.healthcare??0)-damage*(c.category==='disease'?15:2);
  result.social.inequality=(result.social.inequality??0)+damage*3;
  if(['wetland_drought','reed_fire','wetland_contamination'].includes(c.type))result.duckSatisfaction-=damage*.25;
  result.logisticsPenalty+=damage*(c.type==='corridor_icing'?10:4);
 }
 result.damage=clampCrisis(result.damage,0,config.maxCombinedDamage);result.mortalityMultiplier=clampCrisis(result.mortalityMultiplier,1,config.maxMortalityMultiplier);result.migrationAdjustment=clampCrisis(result.migrationAdjustment,-config.maxMigrationPenalty,0);result.logisticsPenalty=clampCrisis(result.logisticsPenalty,0,15);result.duckSatisfaction=clampCrisis(result.duckSatisfaction,-.5,0);
 for(const key of ['livingStandard','publicSafety','healthcare','inequality'] as const)if(result.social[key]!==undefined)result.social[key]=clampCrisis(result.social[key]!,key==='inequality'?0:-24,key==='inequality'?6:0);
 return result;
}
export function getCrisisIndustryModifiers(world:WorldState,j:Jurisdiction,damageMultiplier=1):Partial<Record<import('./types').IndustryId,IndustryModifiers>> {
 const r=crisisRuntime(world,j),result:ReturnType<typeof getCrisisIndustryModifiers>={};if(!r)return result;
 for(const c of crisesFor(world,j)){const d=calculateCrisisDamage(c,r)*damageMultiplier,def=crisisDefinitions[c.type];for(const id of def.industries){const old=result[id];result[id]={annualGrowthAdjustment:clampCrisis((old?.annualGrowthAdjustment??0)-d*.045-c.activityReduction*(c.phase==='active'?1:0),config.maxGrowthPenalty,0),productivityMultiplier:clampCrisis((old?.productivityMultiplier??1)-d*(c.category==='disease'?.22:.08),.55,1)};}}
 return result;
}
function atWar(world:WorldState,id:string){return Object.values(world.warfare?.wars??{}).some(w=>w.status==='active'&&w.participants[id])||Object.values(world.internalConflicts??{}).some(c=>c.status==='armed_conflict'&&(c.parentCountryId===id||c.breakawayCountryId===id));}
export function crisisMilitaryPenalty(world:WorldState,countryId:string):number {return clampCrisis(crisisJurisdictions(world).filter(j=>crisisOwner(world,j)===countryId).reduce((s,j)=>s+getCrisisImpact(world,j).logisticsPenalty,0),0,15);}
export function calculateDiseaseSpreadPressure(world:WorldState,c:ActiveCrisisState):number {
 const j=crisisJurisdiction(c),r=crisisRuntime(world,j);if(!r||c.category!=='disease'||c.phase!=='active'||c.isContained)return 0;
 const owner=crisisOwner(world,j),links=Object.values(world.diplomacy?.relations??{}).filter(x=>x.countryA===owner||x.countryB===owner);
 const connectivity=links.reduce((s,x)=>s+Math.min(12,x.tradeLevel*.12)+Number(x.migratoryPassageAgreement)*10,0);
 return clampCrisis(c.intensity*.55+Math.min(10,Math.log1p(r.population.total)/2)+Math.min(10,Math.abs(r.population.netMigrationLastMonth)/Math.max(1,r.population.total)*3000)+connectivity-calculateCrisisResilience(r).medical*.35);
}
export function diseaseConnection(world:WorldState,a:Jurisdiction,b:Jurisdiction):number {
 const ca=crisisOwner(world,a),cb=crisisOwner(world,b);if(ca===cb)return 1;
 const pair=Object.values(world.diplomacy?.relations??{}).find(x=>[x.countryA,x.countryB].includes(ca!)&&[x.countryA,x.countryB].includes(cb!));
 const war=Object.values(world.warfare?.wars??{}).some(w=>w.status!=='resolved'&&((w.attackers.includes(ca!)&&w.defenders.includes(cb!))||(w.attackers.includes(cb!)&&w.defenders.includes(ca!))));
 const migration=Math.abs(crisisRuntime(world,b)?.population.netMigrationLastMonth??0)/Math.max(1,crisisRuntime(world,b)?.population.total??0);
 return clampCrisis((pair?(war?0:pair.tradeLevel/100*.5)+Number(pair.migratoryPassageAgreement)*.4:0)+Math.min(.12,migration*100),0,1);
}
/** Territory anchor survives independence. Administrative absorption redirects response to the direct owner. */
export function synchronizeCrises(world:WorldState):WorldState {
 if(!world.crises)return world;
 const activeCrises:Record<string,ActiveCrisisState>={};
 for(const original of Object.values(world.crises.activeCrises)){
  let c={...original};const r=c.jurisdictionKind==='region'?world.regions[c.jurisdictionId]:undefined;
  if(r?.simulationRole==='administrative')c={...c,originJurisdictionId:c.originJurisdictionId??c.jurisdictionId,jurisdictionKind:'country',jurisdictionId:r.ownerCountryId};
  if(!crisisRuntime(world,crisisJurisdiction(c)))continue;
  const duplicate=Object.values(activeCrises).find(x=>x.type===c.type&&x.jurisdictionKind===c.jurisdictionKind&&x.jurisdictionId===c.jurisdictionId);
  if(duplicate)activeCrises[duplicate.id]={...duplicate,intensity:Math.max(duplicate.intensity,c.intensity),severity:Math.max(duplicate.severity,c.severity),recoveryProgress:Math.min(duplicate.recoveryProgress,c.recoveryProgress),totalFiscalCost:duplicate.totalFiscalCost+c.totalFiscalCost,totalPopulationImpact:duplicate.totalPopulationImpact+c.totalPopulationImpact};else activeCrises[c.id]=c;
 }
 return {...world,crises:{...world.crises,activeCrises}};
}
function recoverCrisisCore(game:GameState,id:string,value:number,aid=false):GameState {
 const c=game.world.crises?.activeCrises[id];if(!c)return game;
 const updated={...c,recoveryProgress:clampCrisis(c.recoveryProgress+value),intensity:clampCrisis(c.intensity-Math.max(0,value)*.25),isContained:c.isContained||value>=15};
 let next:GameState={...game,world:{...game.world,crises:{...game.world.crises!,activeCrises:{...game.world.crises!.activeCrises,[id]:updated}}}};
 if(aid)next=history(next,updated,'aid',`${name(game,crisisJurisdiction(c))} — ${crisisDefinitions[c.type].name} 국제지원 수락`);
 if(updated.recoveryProgress>=100){
  next=history(next,updated,'complete',`${name(game,crisisJurisdiction(c))} — ${crisisDefinitions[c.type].name} 종료 · 둥지권 복구 완료`);
  const remaining={...next.world.crises!.activeCrises};delete remaining[id];
  next={...next,world:{...next.world,crises:{...next.world.crises!,activeCrises:remaining}}};
 }
 return next;
}
/** Reads one snapshot. Newly spread crises cannot spread again or incur costs in this month. */
function updateWorldCrisesCore(game:GameState,random:()=>number=Math.random):GameState {
 let next={...game,world:synchronizeCrises(game.world)};const snapshot=next.world;
 const active=Object.values(snapshot.crises?.activeCrises??{}).sort((a,b)=>a.id.localeCompare(b.id));
 if(!active.length)return next;
 for(const c of active){
  const j=crisisJurisdiction(c),r=crisisRuntime(snapshot,j)!;const def=crisisDefinitions[c.type],res=calculateCrisisResilience(r),d=calculateCrisisDamage(c,r),war=atWar(snapshot,crisisOwner(snapshot,j)!),difficulty=jurisdictionDifficulty(game,j);
  const cost=r.economy.gdp*.00012*d*difficulty.crisisDamage*(1+(100-res.emergencyResponse)/150);
  const current=crisisRuntime(next.world,j)!;const balance=current.fiscal.treasury-cost;
  const fiscal={...current.fiscal,treasury:Math.max(0,balance),debt:current.fiscal.debt+Math.max(0,-balance),hasIssuedDebt:current.fiscal.hasIssuedDebt||balance<0,monthlyBalance:current.fiscal.monthlyBalance-cost,expenditure:{...current.fiscal.expenditure,emergency:(current.fiscal.expenditure.emergency??0)+cost,total:current.fiscal.expenditure.total+cost}};
  const runtime={...current,fiscal,economy:{...current.economy,inflation:clampCrisis(current.economy.inflation+(c.type==='seed_blight'||c.type==='wetland_drought'?d*.06:0),economyConfig.inflationMin,economyConfig.inflationMax)}};
  next={...next,world:j.kind==='country'?{...next.world,countries:{...next.world.countries,[j.id]:runtime}}:{...next.world,regions:{...next.world.regions,[j.id]:{...next.world.regions[j.id],...runtime}}}};
  const elapsedMonths=c.elapsedMonths+1;
  const increment=(5+res[def.resilience]*.11+res.emergencyResponse*.03)*(war?.65:1)*(c.type==='hail_damage'?3.5:1)*difficulty.crisisRecovery;
  const recoveryProgress=elapsedMonths>=def.maxMonths?100:clampCrisis(c.recoveryProgress+increment);
  const phase=elapsedMonths>=Math.max(1,def.activeMonths-Math.floor(res[def.resilience]/40))||recoveryProgress>=45?'recovery' as const:'active' as const;
  const intensity=clampCrisis(c.severity*(1-recoveryProgress/115));
  const updated={...c,elapsedMonths,remainingMonths:Math.max(0,def.maxMonths-elapsedMonths),recoveryProgress,phase,intensity,totalFiscalCost:c.totalFiscalCost+cost,totalPopulationImpact:c.totalPopulationImpact,isContained:c.isContained||recoveryProgress>65,spreadPressure:calculateDiseaseSpreadPressure(snapshot,c)};
  const state=next.world.crises!;next={...next,world:{...next.world,crises:{...state,activeCrises:{...state.activeCrises,[c.id]:updated}}}};
  if(recoveryProgress>=100){next=history(next,updated,'complete',`${name(next,j)} — ${def.name} 종료 · 둥지권 복구 완료`);const remaining={...next.world.crises!.activeCrises};delete remaining[c.id];next={...next,world:{...next.world,crises:{...next.world.crises!,activeCrises:remaining}}};next=appendGameLog(next,{category:'event',type:'event',message:`${name(next,j)} — ${def.name} 위기 대응이 종료되었습니다.`});continue;}
  if(c.category==='disease'&&c.phase==='active'&&!c.isContained){
   const candidates=crisisJurisdictions(snapshot).filter(target=>!(target.id===j.id&&target.kind===j.kind)&&!crisesFor(next.world,target).some(x=>x.type===c.type)&&diseaseConnection(snapshot,j,target)>0);
   for(const target of candidates){const roll=random();if(!Number.isFinite(roll)||roll<0||roll>=1)throw new RangeError('위기 난수는 0 이상 1 미만입니다.');const chance=updated.spreadPressure/100*diseaseConnection(snapshot,j,target)*config.spreadChanceScale;if(roll<chance){next=startCrisis(next,target,c.type,c.severity*.65,c.sourceEventId);break;}}
  }
 }
 const aggregated=refreshCountryAggregates(next.world);
 return {...next,world:{...aggregated,countries:Object.fromEntries(Object.entries(aggregated.countries).map(([id,c])=>[id,{...c,economy:{...c.economy,growth:next.world.countries[id].economy.growth}}]))}};
}
export function applyCrisisSpeciesPressure(world:WorldState,crisisWorld=world):WorldState {
 let next=world;for(const j of crisisJurisdictions(world)){const r=crisisRuntime(next,j)!,p=r.speciesPolitics.duck,d=getCrisisImpact(crisisWorld,j).duckSatisfaction;if(!p||!d)continue;const value=clampCrisis(p.satisfaction+d),runtime={...r,speciesPolitics:{...r.speciesPolitics,duck:{...p,satisfaction:value,satisfactionDeltaLastMonth:p.satisfactionDeltaLastMonth+value-p.satisfaction}}};next=j.kind==='country'?{...next,countries:{...next.countries,[j.id]:runtime}}:{...next,regions:{...next.regions,[j.id]:{...next.regions[j.id],...runtime}}};}return next;
}
export function calculateLeaderRisk(game:GameState):import('./types').LeaderRiskState {
 const id=controlledRegionId(game),j:Jurisdiction=id?{kind:'region',id}:{kind:'country',id:game.player.controlledCountryId},r=crisisRuntime(game.world,j);
 if(!r)return {situationalRisk:0,disasterExposure:0,diseaseExposure:0,conflictExposure:0,politicalRisk:0,mortalityModifierLastMonth:0,factors:[]};
 const res=calculateCrisisResilience(r),crises=crisesFor(game.world,j),factors=crises.map(c=>crisisDefinitions[c.type].name);
 const exposure=(category:'disaster'|'disease')=>clampCrisis(crises.filter(c=>c.category===category).reduce((sum,c)=>sum+calculateCrisisDamage(c,r)*65,0));
 const disasterExposure=exposure('disaster'),diseaseExposure=exposure('disease');
 const country=game.player.controlledCountryId,internal=Object.values(game.world.internalConflicts??{}).filter(c=>c.status==='armed_conflict'&&(c.parentCountryId===country||c.breakawayCountryId===country));
 const wars=Object.values(game.world.warfare?.wars??{}).filter(w=>w.status==='active'&&w.participants[country]);
 const conflictExposure=clampCrisis(internal.length*18+wars.length*18+(game.world.countries[country].military?.fatigue??0)*(wars.length?.12:0),0,45);if(conflictExposure)factors.push('전쟁·무장 분쟁');
 const separatism=Object.values(r.speciesPolitics).some(p=>p.independenceSentiment>=70);
 const politicalRisk=clampCrisis(Math.max(0,35-r.governance.stability)*.7+Math.max(0,30-r.governance.approval)*.3+internal.length*5+Number(separatism)*8,0,35);if(politicalRisk)factors.push('낮은 안정·분리 압력');
 const temporary=(game.player.temporaryLeaderRiskModifiers??[]).filter(m=>m.expiresTurn>=game.turn&&m.jurisdiction.id===j.id&&m.jurisdiction.kind===j.kind).reduce((s,m)=>s+m.value,0);if(temporary>0)factors.push('현장 지휘');
 const situationalRisk=clampCrisis(disasterExposure+diseaseExposure+conflictExposure+politicalRisk+temporary);
 // Calm countries retain the exact natural formula; young leaders get a bounded, small additive risk.
 const mortalityModifierLastMonth=clampCrisis(Math.pow(situationalRisk/100,2)*config.maxLeaderMortalityAddition*(1-res.information/300),0,config.maxLeaderMortalityAddition);
 return {situationalRisk,disasterExposure,diseaseExposure,conflictExposure,politicalRisk,mortalityModifierLastMonth,factors};
}
export function updateLeaderRisk(game:GameState):GameState {const temporaryLeaderRiskModifiers=(game.player.temporaryLeaderRiskModifiers??[]).filter(m=>m.expiresTurn>=game.turn);const next={...game,player:{...game.player,temporaryLeaderRiskModifiers}};return {...next,player:{...next.player,leaderRisk:calculateLeaderRisk(next)}};}

/** Direct-country secession partitions past totals and copies the ongoing territorial burden. */
export function inheritSplitCrises(game:GameState,source:Jurisdiction,target:Jurisdiction,share:number):GameState {
 if(!game.world.crises)return game;let state=structuredClone(game.world.crises);
 for(const c of crisesFor(game.world,source)){
  const id=`crisis-${state.nextId++}`,ratio=clampCrisis(share,0,1);
  state.activeCrises[id]={...c,id,jurisdictionKind:target.kind,jurisdictionId:target.id,originJurisdictionId:c.originJurisdictionId??source.id,totalFiscalCost:c.totalFiscalCost*ratio,totalPopulationImpact:Math.round(c.totalPopulationImpact*ratio)};
  state.activeCrises[c.id]={...c,totalFiscalCost:c.totalFiscalCost*(1-ratio),totalPopulationImpact:c.totalPopulationImpact-state.activeCrises[id].totalPopulationImpact};
 }
 return {...game,world:{...game.world,crises:state}};
}
export function recordCrisisTerritoryChange(previous:GameState,next:GameState):GameState {
 let result=next;
 for(const c of Object.values(previous.world.crises?.activeCrises??{})){
  const region=c.jurisdictionKind==='region'?next.world.regions[c.jurisdictionId]:undefined;
  const after=next.world.crises?.activeCrises[c.id]??(region?.simulationRole==='administrative'?crisesFor(next.world,{kind:'country',id:region.ownerCountryId}).find(x=>x.type===c.type):undefined),oldJ=crisisJurisdiction(c),newJ=after?crisisJurisdiction(after):null;
  const moved=after&&(newJ!.kind!==oldJ.kind||newJ!.id!==oldJ.id||crisisOwner(previous.world,oldJ)!==crisisOwner(next.world,newJ!));
  if(!after||moved){const state=result.world.crises??createCrisisSystem();const oldName=name(previous,oldJ),target=after?name(next,newJ!):null;
   const entry={id:`${c.id}:territory:${next.turn}:${state.history.length}`,crisisId:c.id,type:c.type,date:{...next.date},turn:next.turn,jurisdiction:after?newJ!:oldJ,jurisdictionName:after?target!:oldName,action:after?'transfer' as const:'retired' as const,summary:after?`${oldName} — ${crisisDefinitions[c.type].name}: ${target} 새 정부가 대응 승계`:`${oldName} — ${crisisDefinitions[c.type].name}: 독립 관할 소멸로 대응 기록 종료`,populationImpact:c.totalPopulationImpact,fiscalCost:c.totalFiscalCost,elapsedMonths:c.elapsedMonths};
   result={...result,world:{...result.world,crises:{...state,history:[entry,...state.history]}}};
  }
 }
 const pending=result.events.pendingEvent;
 const events={...result.events,pendingEvent:pending?.crisisId&&!result.world.crises?.activeCrises[pending.crisisId]?null:pending,activeEffects:result.events.activeEffects.map(e=>({...e,effects:e.effects.filter(effect=>effect.kind!=='crisis_recovery'||!!result.world.crises?.activeCrises[effect.crisisId])})).filter(e=>e.effects.length)};
 return {...result,events,player:{...result.player,...(result.player.temporaryLeaderRiskModifiers?{temporaryLeaderRiskModifiers:result.player.temporaryLeaderRiskModifiers.filter(m=>!!crisisRuntime(result.world,m.jurisdiction))}:{})}};
}

export function startCrisis(...args:Parameters<typeof startCrisisCore>):GameState { return collectHistory(args[0],startCrisisCore(...args)); }

export function recoverCrisis(...args:Parameters<typeof recoverCrisisCore>):GameState { return collectHistory(args[0],recoverCrisisCore(...args)); }

export function updateWorldCrises(...args:Parameters<typeof updateWorldCrisesCore>):GameState { return collectHistory(args[0],updateWorldCrisesCore(...args)); }



