import { synchronizeStrategicAI } from './strategicState';
import { strategicConfig, strategicReasons as reasons } from './strategicConfig';
import { assessCountry, chooseForeignPosture, domesticBurden, scoreDiplomaticAction, scoreWarDesire, warGoalFor, scoreAllyCall, warStrategy, scorePeace } from './strategicEvaluation';
import { recordStrategicDecision, routeForeignAction, queueForeignProposal } from './strategicCommands';
import { countryName } from './diplomacy';
import { activeWars, setCountryMobilizationTarget } from './military';
import { declareWar, applyWarAction, respondToAllyRequest } from './warfare';
import { getPeaceBlock, resolvePeace } from './peace';
import { applyConflictAction } from './conflict';
import { conflictActionScore } from './strategicParent';
import type { GameState, DiplomaticAction, WarResolution } from './types';
import type { StrategicAIState } from './strategicTypes';
const actions:DiplomaticAction[]=['recognize','lift_sanctions','trade','non_aggression','defense','passage','improve','sanction','withdraw_recognition','break_defense','break_non_aggression'];
const resolutions:WarResolution[]=['territory_transfer','reparations','recognition','abandon_reunification','defense_success','status_quo'];
const patchState=(game:GameState,id:string,values:Partial<StrategicAIState>):GameState=>({...game,world:{...game.world,strategicAI:{...game.world.strategicAI,[id]:{...game.world.strategicAI![id],...values}}}});
export function respondStrategicAllies(game:GameState,recipient:string|null=game.player.controlledCountryId):GameState {
 let next=game;for(const req of game.world.warfare?.allyRequests.filter(r=>r.status==='pending'&&r.allyCountryId!==recipient)??[]){const accept=scoreAllyCall(next,req.allyCountryId,req.requesterCountryId)>=45;try{next=respondToAllyRequest(next,req.id,accept);}catch{next=respondToAllyRequest(next,req.id,false);}next=recordStrategicDecision(next,req.allyCountryId,{category:'war',action:accept?'ally_join':'ally_decline',targetCountryId:req.requesterCountryId,summary:`${countryName(next.world,req.allyCountryId)} 방위조약 참전 ${accept?'수락':'거절'}`,reasonCodes:[reasons.ALLY]});}return next;
}
function manageWar(game:GameState,id:string,warId:string,recipient:string|null):GameState {
 let next=game,w=next.world.warfare!.wars[warId];if(w.status==='resolved')return next;
 const strategy=warStrategy(next,id,w),state=next.world.strategicAI![id];next=patchState(next,id,{currentWarStrategy:{...state.currentWarStrategy,[warId]:strategy}});
 if(w.status==='active'&&['seek_ceasefire','seek_peace','survival'].includes(strategy)){next=applyWarAction(next,w.id,'ceasefire');next=recordStrategicDecision(next,id,{category:'peace',action:'ceasefire',summary:countryName(next.world,id)+' 휴전 제안',reasonCodes:[reasons.EXHAUSTION]});return next;}
 if(w.status==='ceasefire'&&w.monthsInStatus>=3){next=applyWarAction(next,w.id,'negotiate');w=next.world.warfare!.wars[warId];}
 if(w.status!=='peace_negotiation')return next;
 const counterpart=w.primaryAttacker===id?w.primaryDefender:w.primaryAttacker;
 const playerInWar=recipient!==null&&!!w.participants[recipient];
 if(playerInWar&&(next.world.foreignProposals??[]).some(p=>p.warId===warId))return next;
 if(playerInWar&&game.turn-(state.diplomaticCooldowns[recipient!]??-100)<strategicConfig.pairHoldMonths)return next;
 const candidates=resolutions.filter(r=>!getPeaceBlock(next,warId,r)).map(r=>({r,own:scorePeace(next,id,w,r),other:scorePeace(next,counterpart,w,r)})).filter(x=>x.own>=25&&(playerInWar||x.other>=25)).sort((a,b)=>Math.min(b.own,b.other)-Math.min(a.own,a.other)||resolutions.indexOf(a.r)-resolutions.indexOf(b.r));
 const choice=candidates[0];if(!choice)return next;
 if(playerInWar){next=queueForeignProposal(next,{kind:'peace',actorId:id,targetId:recipient!,warId,resolution:choice.r,summary:countryName(next.world,id)+'의 평화협정 제안'});next=patchState(next,id,{diplomaticCooldowns:{...next.world.strategicAI![id].diplomaticCooldowns,[recipient!]:game.turn}});}else next=resolvePeace(next,warId,choice.r);
 return recordStrategicDecision(next,id,{category:'peace',action:playerInWar?'peace_proposal':choice.r,targetCountryId:counterpart,summary:countryName(next.world,id)+(playerInWar?' 평화 조건 제안':' 평화협정 체결'),reasonCodes:[reasons.EXHAUSTION,reasons.RECOVERY]});
}
function manageConflict(game:GameState,id:string,recipient:string|null):GameState {
 let next=game;for(const entry of Object.values(game.world.internalConflicts??{}).filter(c=>c.status!=='resolved'&&[c.parentCountryId,c.breakawayCountryId].includes(id))){const c=next.world.internalConflicts![entry.id];if(c.status==='resolved'||c.lastEventTurn===game.turn)continue;
 const parent=id===c.parentCountryId;let action:string|undefined;
 if(parent&&c.parentDominanceMonths>=3)action='force_reintegrate';else if(!parent&&c.breakawayDominanceMonths>=3&&c.breakawayWarSupport>=35)action='defend_independence';
 else if(c.status==='negotiation'&&c.monthsInStatus>=3){if(parent)action=c.foundingIndependence>65||conflictActionScore(next,id,c,'recognize')>40?'recognize':'accept_autonomy';else if(conflictActionScore(next,id,c,'accept_autonomy')>45)action='accept_autonomy';}
 else if(c.status==='armed_conflict'){if(conflictActionScore(next,id,c,'negotiate')>conflictActionScore(next,id,c,'pressure')+10)action='ceasefire';}
 else if(c.status==='ceasefire'&&c.monthsInStatus>=3)action='negotiate';
 else if(c.status==='political_standoff'&&game.turn-(c.lastEventTurn??-100)>=3){const soft=conflictActionScore(next,id,c,'negotiate'),hard=conflictActionScore(next,id,c,'pressure');if(parent&&hard>soft+20){action=c.monthsInConflict>=3&&c.tension>=65&&c.lastHardlineTurn!==null&&next.world.countries[c.breakawayCountryId].identity?.territorialDispute==='parent_claims_reunification'?'escalate':'pressure';}else action='negotiate';}
 if(!action)continue;const target=parent?c.breakawayCountryId:c.parentCountryId;
 if(action==='accept_autonomy'&&target===recipient||action==='recognize'&&!parent&&target===recipient){next=queueForeignProposal(next,{kind:'conflict',actorId:id,targetId:target,conflictId:c.id,conflictResolution:action==='accept_autonomy'?'negotiated_reintegration':'independence_recognized',summary:countryName(next.world,id)+'의 내부 분쟁 합의 제안'});}
 else if(action==='accept_autonomy'&&parent&&conflictActionScore(next,c.breakawayCountryId,c,action)<25)continue;
 else {next=applyConflictAction(next,c.id,action as Parameters<typeof applyConflictAction>[2]);}
 next=recordStrategicDecision(next,id,{category:'conflict',action,targetCountryId:target,summary:countryName(next.world,id)+' 분쟁 대응: '+action,reasonCodes:[action==='pressure'||action==='escalate'?reasons.ADVANTAGE:reasons.EXHAUSTION]});}
 return next;
}
export function updateStrategicAI(game:GameState,options:{autonomousWorld?:boolean}={}):GameState {
 if(game.gameOverReason||!game.player.alive)return game;
 // Human control is consulted only by this command-routing boundary, never by assessments or utility.
 const recipient=options.autonomousWorld?null:game.player.controlledCountryId;
 let next={...game,world:synchronizeStrategicAI(game.world)};next=respondStrategicAllies(next,recipient);
 for(const id of Object.keys(next.world.countries).sort()){if(id===recipient||!next.world.countries[id])continue;
 let state=next.world.strategicAI![id];if(state.lastStrategicEvaluationTurn===game.turn)continue;
 const wars=activeWars(next.world).filter(w=>w.participants[id]);const u=domesticBurden(next,id),urgent=wars.length>0||u.crisis>80;
 if(!urgent&&game.turn-state.lastStrategicEvaluationTurn<strategicConfig.evaluationMonths)continue;
 const assessments=Object.keys(next.world.countries).filter(t=>t!==id).map(t=>assessCountry(next,id,t)).sort((a,b)=>b.overallPriority-a.overallPriority||a.targetCountryId.localeCompare(b.targetCountryId));
 const posture=chooseForeignPosture(next,id,state,assessments);next=patchState(next,id,{targetAssessments:Object.fromEntries(assessments.map(a=>[a.targetCountryId,a])),foreignPolicy:posture,postureSinceTurn:posture!==state.foreignPolicy?game.turn:state.postureSinceTurn,lastStrategicEvaluationTurn:game.turn});state=next.world.strategicAI![id];
 for(const w of wars)if(w.primaryAttacker===id||w.primaryDefender===id)next=manageWar(next,id,w.id,recipient);
 if(!next.world.countries[id]||next.gameOverReason)continue;next=manageConflict(next,id,recipient);if(!next.world.countries[id]||next.gameOverReason)continue;
 const m=next.world.countries[id].military!,atWar=activeWars(next.world).some(w=>w.participants[id]&&w.status==='active'),severe=Object.values(next.world.diplomacy!.relations).some(r=>[r.countryA,r.countryB].includes(id)&&r.threat>=60);
 const target=atWar?(u.crisis>70||u.fiscal>70?35:55):severe?35:15;
 if(game.turn-state.lastMobilizationTurn>=strategicConfig.mobilizationCooldown&&Math.abs(m.mobilizationTarget-target)>=5){const step=m.mobilizationTarget+Math.sign(target-m.mobilizationTarget)*Math.min(10,Math.abs(target-m.mobilizationTarget));next=setCountryMobilizationTarget(next,id,step);next=patchState(next,id,{lastMobilizationTurn:game.turn});next=recordStrategicDecision(next,id,{category:'war',action:'mobilization',summary:countryName(next.world,id)+' 동원 목표 '+step+'%',reasonCodes:[atWar||severe?reasons.THREAT:reasons.RECOVERY]});}
 if(state.lastMajorActionTurn===game.turn||next.world.diplomacy!.history.some(h=>h.actorId===id&&h.turn===game.turn))continue;
 const belli=Object.values(next.world.warfare!.casusBelli).filter(b=>b.holderCountryId===id).map(b=>({b,score:scoreWarDesire(next,id,b)})).sort((a,b)=>b.score-a.score||a.b.id.localeCompare(b.b.id))[0];
 if(belli&&belli.score>=strategicConfig.warThreshold){next=declareWar(next,id,belli.b.id,warGoalFor(belli.b),true,true);next=respondStrategicAllies(next,recipient);next=patchState(next,id,{lastMajorActionTurn:game.turn});next=recordStrategicDecision(next,id,{category:'war',action:'declare_war',targetCountryId:belli.b.targetCountryId,summary:countryName(next.world,id)+' 선전포고',reasonCodes:[reasons.ADVANTAGE,reasons.BREAKAWAY]});continue;}
 const candidates=assessments.slice(0,strategicConfig.maxTargets).flatMap(a=>{const target=a.targetCountryId;if(!next.world.countries[target]||game.turn-(state.diplomaticCooldowns[target]??-100)<strategicConfig.pairHoldMonths||next.world.foreignProposals?.some(p=>p.actorId===id&&p.targetId===target))return [];return actions.map(action=>({target,action,score:scoreDiplomaticAction(next,id,target,action,a).total}));}).filter(a=>a.score>=strategicConfig.minimumUtility).sort((a,b)=>b.score-a.score||a.target.localeCompare(b.target)||actions.indexOf(a.action)-actions.indexOf(b.action));
 const choice=candidates[0];if(choice){next=routeForeignAction(next,id,choice.target,choice.action,recipient);next=patchState(next,id,{lastMajorActionTurn:game.turn,diplomaticCooldowns:{...next.world.strategicAI![id].diplomaticCooldowns,[choice.target]:game.turn}});next=recordStrategicDecision(next,id,{category:'diplomacy',action:choice.action,targetCountryId:choice.target,summary:countryName(next.world,id)+' → '+countryName(next.world,choice.target)+': '+choice.action,reasonCodes:[choice.action==='recognize'?reasons.LEGAL:choice.action==='sanction'?reasons.BREAKAWAY:choice.action==='defense'?reasons.COMMON_ENEMY:reasons.TRADE]});}
 }
 return {...next,world:synchronizeStrategicAI(next.world)};
}
