import { scoreMovementAction, conflictActionScore } from './strategicParent';
import { scoreDiplomaticAction, scorePeace, warStrategy } from './strategicEvaluation';
import type { EventContext, EventSeverity, GameEventDefinition } from './types';
export function chooseStrategicEvent(c:EventContext,e:GameEventDefinition,severity:EventSeverity):{choiceId:string;scored:boolean} {
 if(!e.id.startsWith('secession-')&&!e.conflictEvent&&!e.warEvent&&!e.diplomacyEvent)return {choiceId:e.nonPlayerChoiceId,scored:false};
 const owner=c.jurisdiction.kind==='country'?c.jurisdiction.id:c.game.world.regions[c.jurisdiction.id].ownerCountryId;
 try{const choices=e.choices.map((ch,i)=>{let score=0;const plan=ch.effects({...c,strategicAIEnabled:true},severity,.5);for(const x of plan.immediate){
 if(x.kind==='movement')score+=scoreMovementAction(c,x.speciesId,x.action,x.dispute);
 if(x.kind==='conflict'){const conflict=c.game.world.internalConflicts![x.conflictId];score+=conflictActionScore(c.game,owner,conflict,x.action);}
 if(x.kind==='diplomacy'){if(x.action)score+=scoreDiplomaticAction(c.game,owner,x.targetId,x.action).total;else score+=(x.relations??0)*2+(x.trust??0);}
 if(x.kind==='war'){const w=c.game.world.warfare!.wars[x.warId];if(x.resolution)score+=scorePeace(c.game,owner,w,x.resolution);else if(x.action){const s=warStrategy(c.game,owner,w);score+=['ceasefire','negotiate'].includes(x.action)?(['seek_ceasefire','seek_peace','survival'].includes(s)?70:5):s==='press_advantage'?40:s==='hold'?15:-10;}}
 if(x.kind==='casus_belli')score-=15;
 if(x.kind==='treasury')score+=x.amount/Math.max(1,c.runtime.economy.gdp)*100;
 }return {id:ch.id,score,i};});choices.sort((a,b)=>b.score-a.score||Number(b.id===e.nonPlayerChoiceId)-Number(a.id===e.nonPlayerChoiceId)||a.i-b.i);return {choiceId:Number.isFinite(choices[0].score)?choices[0].id:e.nonPlayerChoiceId,scored:true};}catch{return {choiceId:e.nonPlayerChoiceId,scored:false};}
}
