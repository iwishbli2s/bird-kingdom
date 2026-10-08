import {synchronizePolicySchedules} from './policySchedule';
import { collectHistory } from './history';
import { getTechnologyBonuses } from './technologyEffects';
import { calculateBaseMilitaryPower } from './militaryPower';
import { militaryCommitments } from './military';
import { settleIndependenceDiplomacy } from './diplomacy';
import { conflictConfig as config } from './conflictConfig';
import { applyConflictImpact, reintegrateCountry } from './conflictEffects';
import { countryInfo, derivedCountryRuntime, ownedRegions, refreshCountryAggregates } from './runtime';
import { appendGameLog } from './logs';
import { createRandomSeed, createSeededRandom } from './random';
import type { ConflictAction, ConflictResolution, CountryRuntimeState, GameState, InternalConflictState, WorldState } from './types';
const clamp=(n:number,min=0,max=100)=>Math.min(max,Math.max(min,n));
export function activeConflicts(world:WorldState){return Object.values(world.internalConflicts??{}).filter(c=>c.status!=='resolved');}
export function calculateConflictCapability(r:CountryRuntimeState,activeCount=1):number {
  return Math.min(100,calculateBaseMilitaryPower(r,activeCount)+getTechnologyBonuses(r.technology).capability);
}
export function calculateConflictLogistics(r:CountryRuntimeState,control=100,penalty=0):number {
  return clamp(20+Math.min(20,Math.sqrt(Math.max(0,r.fiscal.treasury)/(r.economy.gdp+1))*18)+r.fiscal.budgetPolicy.infrastructure*3+r.fiscal.budgetPolicy.defense*.3+Math.min(15,Math.sqrt(Math.max(0,r.economy.industries.agriculture.output))*1.2)+control*.2-penalty);
}
export function calculateWarSupport(r:CountryRuntimeState,conflict:InternalConflictState,side:'parent'|'breakaway'):number {
  const g=r.governance,species=r.identity?.primarySpeciesId,sat=species?r.speciesPolitics?.[species]?.satisfaction??50:50;
  return side==='parent'?clamp((g?.approval??50)*.30+(g?.integration??50)*.22+sat*.18+(g?.stability??50)*.12+conflict.economicShare*25-conflict.parentFatigue*.42):clamp(conflict.foundingIndependence*.50+(g?.approval??50)*.18+(g?.stability??50)*.12+sat*.08+conflict.territorialControl*.12-conflict.breakawayFatigue*.45);
}
function createInternalConflictCore(game:GameState,parentId:string,childId:string,foundingIndependence:number):GameState {
  const child=game.world.countries[childId];if(!game.world.countries[parentId]||!child||child.identity?.status!=='disputed_breakaway')throw new Error('일방 독립 당사국이 필요합니다.');
  if(activeConflicts(game.world).some(c=>c.parentCountryId===parentId&&c.breakawayCountryId===childId))return game;
  let n=1;while(game.world.internalConflicts?.[`internal-${n}`])n++;
  const regions=ownedRegions(game.world,childId),parent=derivedCountryRuntime(game.world,parentId),breakaway=derivedCountryRuntime(game.world,childId),dynamic=regions.every(r=>r.regionIdentity?.isDynamic);
  let c:InternalConflictState={id:`internal-${n}`,parentCountryId:parentId,breakawayCountryId:childId,parentName:countryInfo(game,parentId).name,breakawayName:countryInfo(game,childId).name,regionIds:regions.map(r=>r.id),status:'political_standoff',startedDate:{...game.date},resolvedDate:null,
    territorialControl:dynamic?config.dynamicRegionControl:config.existingRegionControl,tension:config.initialTension,parentWarSupport:50,breakawayWarSupport:50,parentCapability:calculateConflictCapability(parent),breakawayCapability:calculateConflictCapability(breakaway),parentLogistics:calculateConflictLogistics(parent),breakawayLogistics:calculateConflictLogistics(breakaway,70,dynamic?8:3),parentFatigue:0,breakawayFatigue:0,monthsInConflict:0,monthsInStatus:0,stalemateMonths:0,parentDominanceMonths:0,breakawayDominanceMonths:0,foundingIndependence:clamp(foundingIndependence),economicShare:child.economy.gdp/(child.economy.gdp+parent.economy.gdp||1),lastHardlineTurn:null,lastEventTurn:null,resolution:null};
  c={...c,parentWarSupport:calculateWarSupport(parent,c,'parent'),breakawayWarSupport:calculateWarSupport(breakaway,c,'breakaway')};
  return appendGameLog({...game,world:{...game.world,internalConflicts:{...game.world.internalConflicts,[c.id]:c}}},{category:'political',type:'event',message:`${c.parentName} — ${c.breakawayName}: 비행권·둥지권을 둘러싼 정치적 대치 시작`});
}
export function resolveMonthlyConflict(game:GameState,c:InternalConflictState,random:()=>number):InternalConflictState {
  if(c.status==='resolved')return c;
  const parent=derivedCountryRuntime(game.world,c.parentCountryId),child=derivedCountryRuntime(game.world,c.breakawayCountryId);
  if(!parent||!child)throw new Error('활성 분쟁의 당사국 참조가 유효하지 않습니다.');
  const count=militaryCommitments(game.world,c.parentCountryId);
  let next={...c,monthsInConflict:c.monthsInConflict+1,monthsInStatus:c.monthsInStatus+1,parentCapability:calculateConflictCapability(parent,count),breakawayCapability:calculateConflictCapability(child,Math.max(1,militaryCommitments(game.world,c.breakawayCountryId))),parentLogistics:calculateConflictLogistics(parent,100-c.territorialControl),breakawayLogistics:calculateConflictLogistics(child,c.territorialControl,c.regionIds.some(id=>game.world.regions[id]?.regionIdentity?.isDynamic)?8:3)};
  if(c.status==='armed_conflict'){
    const roll=random();if(!Number.isFinite(roll)||roll<0||roll>=1)throw new RangeError('분쟁 난수는 0 이상 1 미만이어야 합니다.');
    const parentPower=next.parentCapability*(.35+next.parentLogistics/100)*(.35+1-c.parentFatigue/125)*(.6+c.parentWarSupport/200);
    const childPower=next.breakawayCapability*(.35+next.breakawayLogistics/100)*(.35+1-c.breakawayFatigue/125)*(.6+c.breakawayWarSupport/200);
    const advantage=(childPower-parentPower)/(childPower+parentPower||1);
    const delta=clamp(advantage*9+(roll-.5)*config.monthlyNoise,-config.maxMonthlyControlChange,config.maxMonthlyControlChange);
    next.territorialControl=clamp(c.territorialControl+delta);
    next.stalemateMonths=next.territorialControl>=40&&next.territorialControl<=60?c.stalemateMonths+1:0;
    const fatigue=config.fatigueGrowth+(next.stalemateMonths>=12?config.stalemateFatigue:0);
    next.parentFatigue=clamp(c.parentFatigue+fatigue+(100-next.parentLogistics)*.003);
    next.breakawayFatigue=clamp(c.breakawayFatigue+fatigue+(100-next.breakawayLogistics)*.003);
  }else if(c.status==='ceasefire'||c.status==='negotiation'){
    next.parentFatigue=clamp(c.parentFatigue-config.ceasefireRecovery);next.breakawayFatigue=clamp(c.breakawayFatigue-config.ceasefireRecovery);next.tension=clamp(c.tension-.6);
  }
  next.parentWarSupport=calculateWarSupport(parent,next,'parent');next.breakawayWarSupport=calculateWarSupport(child,next,'breakaway');
  next.parentDominanceMonths=next.territorialControl<=10?c.parentDominanceMonths+1:0;
  next.breakawayDominanceMonths=next.territorialControl>=90?c.breakawayDominanceMonths+1:0;
  return next;
}
export function updateWorldConflicts(game:GameState,random?:()=>number):GameState {
  const rng=random??createSeededRandom(createRandomSeed());let next=game;
  const conflicts=Object.fromEntries(Object.entries(game.world.internalConflicts??{}).sort(([a],[b])=>a.localeCompare(b)).map(([id,c])=>[id,resolveMonthlyConflict(game,c,rng)]));
  next={...next,world:{...next.world,internalConflicts:conflicts}};
  for(const c of Object.values(conflicts))if(c.status==='armed_conflict'){
    let world=applyConflictImpact(next.world,c.parentCountryId,config.parentIndustryLoss,config.parentCostRate,c.monthsInConflict>=config.longConflictMonths);
    world=applyConflictImpact(world,c.breakawayCountryId,config.breakawayIndustryLoss,config.breakawayCostRate,c.monthsInConflict>=config.longConflictMonths);
    next={...next,world};
    next=appendGameLog(next,{category:'political',type:'event',message:`${c.breakawayName} 편대의 비행 회랑·보급 횃대 통제 ${c.territorialControl.toFixed(1)}% · 양측 분쟁 부담 누적`});
  }
  return next;
}
function resolveConflictOutcomeCore(game:GameState,id:string,resolution:ConflictResolution):GameState {
  const c=game.world.internalConflicts?.[id];if(!c||c.status==='resolved'||game.gameOverReason)throw new Error('해결할 활성 분쟁이 없습니다.');
  if(resolution==='forced_reintegration'&&c.parentDominanceMonths<config.dominanceMonths)throw new Error('부모국 결정적 통제 기간 미충족');
  if(resolution==='independence_defended'&&(c.breakawayDominanceMonths<config.dominanceMonths||c.breakawayWarSupport<35))throw new Error('독립 방어 통제·지지 조건 미충족');
  if(resolution==='negotiated_reintegration'&&c.status!=='negotiation')throw new Error('재통합 협상이 필요합니다.');
  let next=resolution.includes('reintegration')?reintegrateCountry(game,c,resolution==='negotiated_reintegration'):game;
  if(!resolution.includes('reintegration')){
    const child=next.world.countries[c.breakawayCountryId];next={...next,world:{...next.world,countries:{...next.world.countries,[child.id]:{...child,identity:{...child.identity!,status:'established',territorialDispute:'none'}}}}};
    // 독립 인정은 부모국 통합과 다른 집단의 분리 압력에 작은 비용을 남깁니다.
    const parent=next.world.countries[c.parentCountryId],members=ownedRegions(next.world,parent.id);
    const adjust=<T extends CountryRuntimeState>(r:T):T=>({...r,...(r.governance?{governance:{...r.governance,integration:clamp(r.governance.integration-2),stability:clamp(r.governance.stability-1)}}:{}),speciesPolitics:Object.fromEntries(Object.entries(r.speciesPolitics??{}).map(([id,p])=>[id,{...p,autonomyDemand:clamp(p.autonomyDemand+1),independenceSentiment:clamp(p.independenceSentiment+.5)}]))});
    next={...next,world:refreshCountryAggregates(members.length?{...next.world,regions:{...next.world.regions,...Object.fromEntries(members.map(r=>[r.id,adjust(r)]))}}:{...next.world,countries:{...next.world.countries,[parent.id]:adjust(parent)}})};
  }
  if(!resolution.includes('reintegration'))next={...next,world:settleIndependenceDiplomacy(next.world,c.parentCountryId,c.breakawayCountryId,resolution==='independence_defended')};
  next={...next,world:{...next.world,internalConflicts:{...next.world.internalConflicts,[id]:{...c,status:'resolved',resolution,resolvedDate:{...game.date}}}}};
  return appendGameLog(next,{category:'political',type:'event',message:`${c.parentName} — ${c.breakawayName}: ${resolution.includes('reintegration')?'둥지권 재통합 완료':'독립 최종 확정'}`});
}
function applyConflictActionCore(game:GameState,id:string,action:ConflictAction):GameState {
  const c=game.world.internalConflicts?.[id];if(!c||c.status==='resolved'||game.gameOverReason)throw new Error('활성 분쟁이 필요합니다.');
  if(action==='recognize')return resolveConflictOutcome(game,id,'independence_recognized');
  if(action==='accept_autonomy')return resolveConflictOutcome(game,id,'negotiated_reintegration');
  if(action==='force_reintegrate')return resolveConflictOutcome(game,id,'forced_reintegration');
  if(action==='defend_independence')return resolveConflictOutcome(game,id,'independence_defended');
  let next={...c,lastEventTurn:game.turn};
  if(action==='administrative_shift')next.territorialControl=clamp(c.territorialControl-2);
  if(action==='supply'){next.parentFatigue=clamp(c.parentFatigue+1);next.breakawayFatigue=clamp(c.breakawayFatigue+2);}
  if(action==='public_opinion'){next.parentFatigue=clamp(c.parentFatigue+3);next.breakawayFatigue=clamp(c.breakawayFatigue+3);}
  if(action==='pressure'||action==='blockade'||action==='fail_negotiation'){next.tension=clamp(next.tension+(action==='blockade'?15:10));next.lastHardlineTurn=game.turn;if(action==='fail_negotiation'){next.status='political_standoff';next.monthsInStatus=0;}const child=game.world.countries[c.breakawayCountryId];game={...game,world:{...game.world,countries:{...game.world.countries,[child.id]:{...child,identity:{...child.identity!,territorialDispute:'parent_claims_reunification'}}}}};}
  if(action==='escalate'){
    if(c.monthsInConflict<config.minimumStandoffMonths||c.tension<config.escalationTension||c.lastHardlineTurn===null||game.world.countries[c.breakawayCountryId].identity?.territorialDispute!=='parent_claims_reunification')throw new Error('무력충돌 정치 조건 미충족');
    next.status='armed_conflict';next.monthsInStatus=0;
  }
  if(action==='ceasefire'||action==='negotiate'){next.status=action==='ceasefire'?'ceasefire':'negotiation';next.monthsInStatus=0;next.tension=clamp(c.tension-15);}
  return appendGameLog({...game,world:{...game.world,internalConflicts:{...game.world.internalConflicts,[id]:next}}},{category:'political',type:'event',message:`${c.breakawayName} 둥지권 분쟁 대응: ${action==='escalate'?'비행 회랑 무력충돌 시작':action==='ceasefire'?'대편대 휴전':action==='negotiate'?'공동 중재 협상': '관제권·협상 긴장 변화'}`});
}

export function createInternalConflict(...args:Parameters<typeof createInternalConflictCore>):GameState { return collectHistory(args[0],createInternalConflictCore(...args)); }

export function applyConflictAction(...args:Parameters<typeof applyConflictActionCore>):GameState { return collectHistory(args[0],applyConflictActionCore(...args)); }

export function resolveConflictOutcome(...args:Parameters<typeof resolveConflictOutcomeCore>):GameState { return synchronizePolicySchedules(args[0],collectHistory(args[0],resolveConflictOutcomeCore(...args))); }


