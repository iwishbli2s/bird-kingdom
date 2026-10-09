import {assessConflictPressure,conflictFamily,getConflictEventFamilyMultiplier} from './conflictPressure';
import {pressureEventDefinitions,statePairTarget} from './pressureEvents';
import {withGameRandom} from './randomState';
import { collectHistory } from './history';
import { scorePeace } from './strategicEvaluation';
import { conflictActionScore } from './strategicParent';
import { chooseDomesticAIEvent } from './aiEvents';
import { recordAIDecision } from './ai';
import { governmentForJurisdiction } from './government';
import { crisisEventDefinitions } from './crisisEvents';
import { crisesFor, calculateCrisisResilience, startCrisis, crisisRuntime } from './crisis';
import { legacyCrisisEvents } from './crisisConfig';
import { technologyEventDefinitions, technologyDiscoveryDefinition } from './technologyEvents';
import { mitigateTechnologyEventEffects } from './technologyEffects';
import { warEventDefinitions, contextWar } from './warEvents';
import { diplomacyEventDefinitions, diplomaticTarget, hasMigratoryPassage } from './diplomacyEvents';
import { conflictEventDefinitions, contextConflict } from './conflictEvents';
import { secessionEventDefinitions } from './secessionEvents';
import { controlledRegionId, countryInfo, regionInfo } from './runtime';
import { eventDefinitions } from './eventDefinitions';
import { eventConfig } from './eventConfig';
import { applyEventEffects } from './eventEffects';
import { cooldownKey, jurisdictionKey } from './eventHelpers';
import { appendGameLog } from './logs';
import { createRandomSeed, createSeededRandom } from './random';
import type { EventContext, EventState, GameEventDefinition, Jurisdiction, PendingEvent } from './eventTypes';
import type { GameState } from './types';
export const allEventDefinitions=[...pressureEventDefinitions,...eventDefinitions,...secessionEventDefinitions,...conflictEventDefinitions,...diplomacyEventDefinitions,...warEventDefinitions,...technologyEventDefinitions,...crisisEventDefinitions];
export const createEventState=():EventState=>({pendingEvent:null,cooldowns:{},activeEffects:[],history:[]});
export const getEventDefinition=(id:string)=>{const definition=id==='technology-discovery'?technologyDiscoveryDefinition:allEventDefinitions.find(e=>e.id===id);if(!definition)throw new Error('존재하지 않는 사건입니다.');return definition;};
export function eventContext(game:GameState,jurisdiction:Jurisdiction,conflictId?:string,diplomaticTargetId?:string,warId?:string,crisisId?:string):EventContext {
  const r=jurisdiction.kind==='country'?game.world.countries[jurisdiction.id]:game.world.regions[jurisdiction.id];
  if(!r?.social||!r.governance||!r.speciesPolitics)throw new Error('사건을 직접 처리할 수 없는 지역입니다.');
  return {game,jurisdiction,crisisId,conflictId,diplomaticTargetId,warId,runtime:{...r,social:r.social,governance:r.governance,speciesPolitics:r.speciesPolitics}};
}
export function calculateEventChance(id:string,game:GameState,j:Jurisdiction,pressure?:import("./conflictPressure").ConflictPressureAssessment):number {
  const e=getEventDefinition(id),c=eventContext(game,j);c.conflictPressure=pressure;
  if((!e.priority&&(game.events.cooldowns[cooldownKey(j,id)]??0)>0)||!Object.keys(c.runtime.population.species).length||!e.eligible(c))return 0;
  const family=conflictFamily(e);
  const chance=e.calculateChance(c)*(family&&!e.priority?getConflictEventFamilyMultiplier(game,j,family,pressure):1)*(legacyCrisisEvents[id]?1-calculateCrisisResilience(c.runtime).emergencyResponse/500:1);
  return Number.isFinite(chance)?e.priority?Math.min(1,Math.max(0,chance)):family?eventConfig.maxIndividualChance*(-Math.expm1(-Math.max(0,chance)/eventConfig.maxIndividualChance)):Math.min(eventConfig.maxIndividualChance,Math.max(0,chance)):0;
}
function sample(random:()=>number):number{const n=random();if(!Number.isFinite(n)||n<0||n>=1)throw new RangeError('사건 난수는0 이상1 미만이어야 합니다.');return n;}
export function chooseWeightedEvent(candidates:readonly {definition:GameEventDefinition;chance:number}[],random:()=>number):GameEventDefinition|null {
  const ordered=candidates.filter(e=>e.chance>0).slice().sort((a,b)=>a.definition.id.localeCompare(b.definition.id));
  if(!ordered.length)return null;
  const combined=Math.min(eventConfig.maxCombinedChance,1-ordered.reduce((p,e)=>p*(1-e.chance),1));
  if(sample(random)>=combined)return null;
  const total=ordered.reduce((sum,e)=>sum+e.chance,0);let pick=sample(random)*total;
  for(const e of ordered){pick-=e.chance;if(pick<0)return e.definition;}
  return ordered[ordered.length-1].definition;
}
export function tickEventState(game:GameState):GameState {
  let next=game;
  const migrated=new Set<string>();
  for(const active of game.events.activeEffects.filter(e=>e.remainingMonths>0)){
    const legacyType=legacyCrisisEvents[active.sourceEventId];
    if(legacyType&&active.effects.some(e=>e.kind==='industry'&&e.multiplier<1)){
      migrated.add(active.id);
      if(crisisRuntime(next.world,active.jurisdiction))next=startCrisis(next,active.jurisdiction,legacyType,48,active.sourceEventId,.2);
    }else next=applyEventEffects(next,active.jurisdiction,active.effects);
  }
  return {...next,events:{...next.events,cooldowns:Object.fromEntries(Object.entries(game.events.cooldowns).flatMap(([id,n])=>n>1?[[id,n-1]]:[])),activeEffects:game.events.activeEffects.filter(e=>e.remainingMonths>1&&!migrated.has(e.id)).map(e=>({...e,remainingMonths:e.remainingMonths-1}))}};
}
function resolve(game:GameState,pending:PendingEvent,choiceId:string,playerChoice:boolean,outcomeRandom:()=>number,secessionRandom?:()=>number,strategic=false,autonomousWorld=false):GameState {
  const e=getEventDefinition(pending.eventId),choice=e.choices.find(choice=>choice.id===choiceId);
  if(!choice)throw new Error('유효하지 않은 사건 선택입니다.');
  const context=eventContext(game,pending.jurisdiction,pending.conflictId,pending.diplomaticTargetId,pending.warId,pending.crisisId),choiceLabel=choice.labelFor?.(context)??choice.label;
  context.statePairTarget=pending.statePairTarget;
  context.strategicAIEnabled=strategic;
  let plan=choice.effects(context,pending.severity,sample(outcomeRandom));
  if(['migrant-refuge','nest-overcrowding','flight-corridor'].includes(e.id)&&hasMigratoryPassage(context)){
    const mitigate=(effects:typeof plan.immediate)=>effects.map(effect=>effect.kind==='social'&&effect.delta<0?{...effect,delta:effect.delta*.75}:effect.kind==='species'&&effect.metric==='satisfaction'&&effect.delta<0?{...effect,delta:effect.delta*.75}:effect);
    plan={...plan,immediate:mitigate(plan.immediate),ongoing:plan.ongoing?.map(active=>({...active,effects:mitigate(active.effects)}))};
  }
  const damageTags=[...e.tags,...(e.id==='seed-disease'?['food']:e.id==='flight-corridor'?['corridor']:['storm','headwind','nest-cliff'].includes(e.id)?['wind']:e.id==='feather-mites'?['disease']:[])];
  plan={...plan,immediate:mitigateTechnologyEventEffects(context.runtime.technology,damageTags,plan.immediate),ongoing:plan.ongoing?.map(effect=>({...effect,effects:mitigateTechnologyEventEffects(context.runtime.technology,damageTags,effect.effects)}))};
  let routed=game;
  if(strategic&&!playerChoice){const actor=pending.jurisdiction.kind==='country'?pending.jurisdiction.id:game.world.regions[pending.jurisdiction.id].ownerCountryId,recipient=autonomousWorld?null:game.player.controlledCountryId;
    plan={...plan,immediate:plan.immediate.filter(effect=>{
      if(effect.kind==='diplomacy'&&effect.action){routed=routeForeignAction(routed,actor,effect.targetId,effect.action,recipient);return false;}
      if(effect.kind==='war'&&effect.resolution&&recipient&&game.world.warfare!.wars[effect.warId].participants[recipient]){routed=queueForeignProposal(routed,{kind:'peace',actorId:actor,targetId:recipient,warId:effect.warId,resolution:effect.resolution,summary:e.title});return false;}
      if(effect.kind==='conflict'&&effect.action==='accept_autonomy'&&recipient&&[game.world.internalConflicts![effect.conflictId].parentCountryId,game.world.internalConflicts![effect.conflictId].breakawayCountryId].includes(recipient)){routed=queueForeignProposal(routed,{kind:'conflict',actorId:actor,targetId:recipient,conflictId:effect.conflictId,conflictResolution:'negotiated_reintegration',summary:e.title});return false;}
      if(effect.kind==='war'&&effect.resolution){const war=game.world.warfare!.wars[effect.warId];if([war.primaryAttacker,war.primaryDefender].some(id=>scorePeace(game,id,war,effect.resolution!)<25))return false;}
      if(effect.kind==='conflict'&&effect.action==='recognize'){const c=game.world.internalConflicts![effect.conflictId];if(actor===c.breakawayCountryId){if(c.parentCountryId===recipient){routed=queueForeignProposal(routed,{kind:'conflict',actorId:actor,targetId:recipient,conflictId:c.id,conflictResolution:'independence_recognized',summary:e.title});return false;}if(conflictActionScore(game,c.parentCountryId,c,'recognize')<25)return false;}}
      if(effect.kind==='conflict'&&effect.action==='accept_autonomy'){const c=game.world.internalConflicts![effect.conflictId];if(conflictActionScore(game,c.breakawayCountryId,c,'accept_autonomy')<25)return false;}
      return true;
    })};
  }
  let next=applyEventEffects(routed,pending.jurisdiction,plan.immediate,secessionRandom);
  next={...next,events:{...next.events,pendingEvent:playerChoice?null:next.events.pendingEvent,
    cooldowns:{...next.events.cooldowns,[cooldownKey(pending.jurisdiction,e.id)]:e.cooldownMonths},
    activeEffects:[...next.events.activeEffects,...(plan.ongoing??[]).map((effect,i)=>({id:`${pending.id}:${i}`,sourceEventId:e.id,jurisdiction:{...pending.jurisdiction},remainingMonths:effect.months,effects:effect.effects}))],
    history:[{...pending,date:{...pending.date},jurisdiction:{...pending.jurisdiction},jurisdictionName:pending.jurisdictionName??jurisdictionName(game,pending.jurisdiction),title:e.title,category:e.category,choiceId,choiceLabel,playerChoice},...next.events.history]}};
  return appendGameLog(next,{category:'event',type:'event',message:`${jurisdictionName(game,pending.jurisdiction)} — ${e.title}: ${choiceLabel}`});
}
function resolvePendingEventCore(game:GameState,choiceId:string,outcomeRandom?:()=>number,secessionRandom?:()=>number,strategic=true):GameState {
  if(game.gameOverReason||!game.player.alive)throw new Error('종료 후 사건을 해결할 수 없습니다.');
  if(!game.events.pendingEvent)throw new Error('해결할 사건이 없습니다.');
  return resolve(game,game.events.pendingEvent,choiceId,true,outcomeRandom??createSeededRandom(createRandomSeed()),secessionRandom,strategic);
}
export interface EventOptions {strategicAI?:boolean;autonomousWorld?:boolean;domesticAI?:boolean;eventOccurrenceRandom?:()=>number;eventOutcomeRandom?:()=>number;secessionRandom?:()=>number}
export function generateWorldEvents(game:GameState,options:EventOptions={}):GameState {
  if(game.gameOverReason||!game.player.alive||game.events.pendingEvent)return game;
  const occurrence=options.eventOccurrenceRandom??createSeededRandom(createRandomSeed()),outcome=options.eventOutcomeRandom??createSeededRandom(createRandomSeed());
  const regionId=controlledRegionId(game);
  const player:Jurisdiction=options.autonomousWorld?{kind:'country',id:'observer:none'}:regionId?{kind:'region',id:regionId}:{kind:'country',id:game.player.controlledCountryId};
  const jurisdictions:Jurisdiction[]=[...Object.keys(game.world.regions).filter(id=>game.world.regions[id].simulationRole!=='administrative').map(id=>({kind:'region' as const,id})),...Object.keys(game.world.countries).filter(id=>game.world.countries[id].simulationMode!=='aggregate_regions'&&!Object.values(game.world.regions).some(r=>r.ownerCountryId===id&&r.simulationRole!=='administrative')).map(id=>({kind:'country' as const,id}))].sort((a,b)=>jurisdictionKey(a).localeCompare(jurisdictionKey(b)));
  // 발생 후보와 강도는 같은 월말 스냅샷에서 결정합니다. NPC 처리 순서가 확률에 영향을 주지 않습니다.
  const proposals=jurisdictions.flatMap(j=>{
    if(game.tutorial?.mode==='active'&&game.tutorial.scriptedScenarioEnabled&&jurisdictionKey(j)===jurisdictionKey(player))return [];
    const pressure=assessConflictPressure(game,j);
    const candidates=allEventDefinitions.map(definition=>({definition,chance:calculateEventChance(definition.id,game,j,pressure)}));
    const chosen=candidates.filter(e=>e.definition.priority&&e.chance>0).sort((a,b)=>a.definition.id.localeCompare(b.definition.id))[0]?.definition??chooseWeightedEvent(candidates,occurrence);
    if(!chosen)return [];
    return [{id:`${game.turn}:${jurisdictionKey(j)}:${chosen.id}`,eventId:chosen.id,jurisdictionName:jurisdictionName(game,j),date:{...game.date},turn:game.turn,jurisdiction:j,severity:chosen.severity(eventContext(game,j)),...(chosen.statePairEvent?{statePairTarget:statePairTarget(eventContext(game,j))}:{}),...(chosen.crisisEvent?{crisisId:crisesFor(game.world,j).sort((a,b)=>b.severity-a.severity||a.id.localeCompare(b.id)).find(x=>chosen.eligible(eventContext(game,j,undefined,undefined,undefined,x.id)))?.id}:{}),...(chosen.diplomacyEvent?{diplomaticTargetId:diplomaticTarget(eventContext(game,j),chosen.id)}:{}),...(chosen.warEvent?{warId:contextWar(eventContext(game,j))!.id}:{}),...(chosen.conflictEvent?{conflictId:contextConflict(eventContext(game,j))!.id}:{})}];
  });
  const seen=new Set<string>();
  const unique=proposals.slice().sort((a,b)=>Number(jurisdictionKey(b.jurisdiction)===jurisdictionKey(player))-Number(jurisdictionKey(a.jurisdiction)===jurisdictionKey(player))).filter(p=>{const id=p.warId??p.conflictId;if(!id)return true;if(seen.has(id))return false;seen.add(id);return true;});
  let next=game;
  const stillValid=(state:GameState,p:PendingEvent)=>(!p.statePairTarget||[p.statePairTarget.actorStateId,p.statePairTarget.targetStateId].every(id=>state.world.regions[id]?.ownerCountryId==='pigeon'&&state.world.regions[id].simulationRole!=='administrative'))&&!!(p.jurisdiction.kind==='country'?state.world.countries[p.jurisdiction.id]:state.world.regions[p.jurisdiction.id]?.simulationRole!=='administrative'&&state.world.regions[p.jurisdiction.id])&&(!p.crisisId||!!state.world.crises?.activeCrises[p.crisisId])&&(!p.diplomaticTargetId||!!state.world.countries[p.diplomaticTargetId])&&(!p.conflictId||state.world.internalConflicts?.[p.conflictId]?.status!=='resolved')&&(!p.warId||state.world.warfare?.wars[p.warId]?.status!=='resolved');
  for(const pending of unique.filter(p=>jurisdictionKey(p.jurisdiction)!==jurisdictionKey(player)))if(!next.gameOverReason&&stillValid(next,pending)){
    const definition=getEventDefinition(pending.eventId),context=eventContext(game,pending.jurisdiction,pending.conflictId,pending.diplomaticTargetId,pending.warId,pending.crisisId);context.statePairTarget=pending.statePairTarget;
    const actor=pending.jurisdiction.kind==='country'?pending.jurisdiction.id:next.world.regions[pending.jurisdiction.id].ownerCountryId;
    if(options.strategicAI!==false&&definition.diplomacyEvent&&(actor===game.player.controlledCountryId&&!options.autonomousWorld||next.world.strategicAI?.[actor]?.lastMajorActionTurn===game.turn))continue;
    context.strategicAIEnabled=options.strategicAI!==false;
    const strategicChoice=options.strategicAI===false?null:chooseStrategicEvent(context,definition,pending.severity);
    const choice=strategicChoice?.scored?strategicChoice:options.domesticAI===false?{choiceId:definition.nonPlayerChoiceId,scored:false}:chooseDomesticAIEvent(context,definition,pending.severity);
    next=resolve(next,pending,choice.choiceId,false,outcome,options.secessionRandom,options.strategicAI!==false,options.autonomousWorld);
    if(strategicChoice?.scored&&next.world.strategicAI?.[actor]){next=recordStrategicDecision(next,actor,{category:definition.conflictEvent?'conflict':definition.warEvent?'war':definition.diplomacyEvent?'diplomacy':'secession',action:choice.choiceId,summary:definition.title+': '+definition.choices.find(c=>c.id===choice.choiceId)!.label,reasonCodes:[]});if(definition.diplomacyEvent)next={...next,world:{...next.world,strategicAI:{...next.world.strategicAI,[actor]:{...next.world.strategicAI![actor],lastMajorActionTurn:game.turn}}}};}
    const government=governmentForJurisdiction(next,pending.jurisdiction);if(choice.scored&&!strategicChoice?.scored&&government)next=recordAIDecision(next,government.id,{type:'event',summary:definition.title+': '+definition.choices.find(c=>c.id===choice.choiceId)!.label,reasonCodes:['DOMESTIC_RESPONSE'],choiceId:choice.choiceId});
  }
  const pending=unique.find(p=>jurisdictionKey(p.jurisdiction)===jurisdictionKey(player));
  return pending&&!next.gameOverReason&&stillValid(next,pending)?{...next,events:{...next.events,pendingEvent:pending}}:next;
}
export const jurisdictionName=(game:GameState,j:Jurisdiction)=>j.kind==='region'?(regionInfo(game,j.id)?.name??j.id):countryInfo(game,j.id).name;
import { chooseStrategicEvent } from './strategicEvents';
import { recordStrategicDecision, routeForeignAction, queueForeignProposal } from './strategicCommands';

export function resolvePendingEvent(...args:Parameters<typeof resolvePendingEventCore>):GameState { return withGameRandom(args[0],(g,r)=>collectHistory(g,resolvePendingEventCore(g,args[1],args[2]??r('eventOutcome'),args[3]??r('secession'),args[4]))); }


