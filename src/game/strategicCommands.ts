import { getDiplomaticActionBlock, performDiplomaticAction, countryName } from './diplomacy';
import { getPeaceBlock, resolvePeace } from './peace';
import { resolveConflictOutcome } from './conflict';
import { strategicConfig } from './strategicConfig';
import type { GameState, DiplomaticAction } from './types';
import type { AIStrategicDecisionRecord, ForeignProposal } from './strategicTypes';
export function recordStrategicDecision(game:GameState,id:string,data:Omit<AIStrategicDecisionRecord,'date'|'turn'|'countryId'>):GameState {
 const state=game.world.strategicAI?.[id];if(!state)return game;
 return {...game,world:{...game.world,strategicAI:{...game.world.strategicAI,[id]:{...state,recentStrategicDecisions:[{...data,countryId:id,turn:game.turn,date:{...game.date},...(data.targetCountryId?{targetName:countryName(game.world,data.targetCountryId)}:{})},...state.recentStrategicDecisions].slice(0,strategicConfig.recordLimit)}}}};
}
export function queueForeignProposal(game:GameState,p:Omit<ForeignProposal,'id'|'date'|'createdTurn'>):GameState {
 if((game.world.foreignProposals??[]).some(x=>x.actorId===p.actorId&&x.targetId===p.targetId&&x.kind===p.kind))return game;
 const proposal={...p,id:`foreign-${game.turn}-${p.actorId}-${p.targetId}-${p.kind}`,date:{...game.date},createdTurn:game.turn};
 return {...game,world:{...game.world,foreignProposals:[...(game.world.foreignProposals??[]),proposal]}};
}
export function routeForeignAction(game:GameState,actor:string,target:string,action:DiplomaticAction,recipient:string|null=game.player.controlledCountryId):GameState {
 const block=getDiplomaticActionBlock(game,actor,target,action,true);if(block)throw new Error(block);
 if(target===recipient&&['trade','non_aggression','defense','passage'].includes(action))return queueForeignProposal(game,{kind:'treaty',actorId:actor,targetId:target,action,summary:`${countryName(game.world,actor)}의 외교 협정 제안`});
 return performDiplomaticAction(game,actor,target,action,true);
}
export function respondToForeignProposal(game:GameState,id:string,accept:boolean):GameState {
 const p=game.world.foreignProposals?.find(x=>x.id===id);if(!p||p.targetId!==game.player.controlledCountryId||game.gameOverReason||!game.player.alive)throw new Error('응답할 외교 제안이 없습니다.');
 let next:GameState={...game,world:{...game.world,foreignProposals:game.world.foreignProposals!.filter(x=>x.id!==id)}};
 if(p.kind==='treaty'&&p.action){const block=getDiplomaticActionBlock(next,p.actorId,p.targetId,p.action,true);if(!block)next=performDiplomaticAction(next,p.actorId,p.targetId,p.action,true,accept);}
 if(accept&&p.kind==='peace'&&p.warId&&p.resolution&&!getPeaceBlock(next,p.warId,p.resolution))next=resolvePeace(next,p.warId,p.resolution);
 if(accept&&p.kind==='conflict'&&p.conflictId&&p.conflictResolution)next=resolveConflictOutcome(next,p.conflictId,p.conflictResolution);
 return recordStrategicDecision(next,p.actorId,{category:p.kind==='treaty'?'diplomacy':p.kind==='peace'?'peace':'conflict',action:accept?'proposal_accepted':'proposal_declined',targetCountryId:p.targetId,summary:p.summary+(accept?' · 수락':' · 거절'),reasonCodes:[]});
}

