import type { GameState,TechnologyDomain } from './types';
import type { TutorialState } from './tutorialTypes';
import { tutorialSteps } from './tutorialSteps';
import { startCrisis } from './crisis';
import { selectControlledRuntime } from './world';
import {canTutorialBlockTimeAdvance} from './tutorialAvailability';

export const tutorialStep = (game:GameState) => game.tutorial?.mode==='active' ? tutorialSteps.find(s=>s.id===game.tutorial?.stepId) : undefined;
export const tutorialElapsed = (game:GameState) => game.turn-(game.tutorial?.startedTurn??game.turn);
export function activateTutorial(game:GameState):GameState {
  if(game.turn!==1||game.player.controlledCountryId!=='sparrow'||game.player.controlledRegionId||(game.difficulty??'normal')!=='normal')throw new Error('튜토리얼은 새 Normal 참새자유공화국에서 시작합니다.');
  return {...game,tutorial:{mode:'active',stepId:'overview',startedTurn:game.turn,completedStepIds:[],scriptedScenarioEnabled:true,firedScriptIds:[]}};
}
function nextStep(game:GameState):GameState {
  const t=game.tutorial!,index=tutorialSteps.findIndex(s=>s.id===t.stepId),id=tutorialSteps[index+1]?.id??null;
  return {...game,tutorial:{...t,stepId:id,completedStepIds:[...new Set([...t.completedStepIds,t.stepId!])]}};
}
export function acknowledgeTutorial(game:GameState,menu:string):GameState {
  const step=tutorialStep(game);
  return step?.kind==='read'&&step.menu===menu?nextStep(game):game;
}
export function skipTutorial(game:GameState):GameState {
  if(game.tutorial?.mode!=='active')return game;
  // A presented event is a real event: keep it, its consequences and every RNG stream.
  return {...game,tutorial:{...game.tutorial,mode:'skipped',stepId:null,scriptedScenarioEnabled:false}};
}
export function observeTutorialAction(before:GameState,after:GameState):GameState {
  if(after===before||before.tutorial?.mode!=='active')return after;
  const id=before.tutorial.stepId,a=selectControlledRuntime(before),b=selectControlledRuntime(after);
  const changed=id==='tax'?JSON.stringify(a.fiscal.taxPolicy)!==JSON.stringify(b.fiscal.taxPolicy):id==='budget'?JSON.stringify(a.fiscal.budgetPolicy)!==JSON.stringify(b.fiscal.budgetPolicy):id==='technology'?Object.entries(b.technology!.domains).some(([domain,d])=>d.currentResearchId&&d.currentResearchId!==a.technology!.domains[domain as TechnologyDomain].currentResearchId):id==='diplomacy'?after.world.diplomacy!.history.some(h=>h.turn===after.turn&&h.actorId===after.player.controlledCountryId&&h.targetId==='pigeon'&&h.action==='improve'&&!before.world.diplomacy!.history.some(old=>old.id===h.id)):id==='event'?before.events.pendingEvent?.id.startsWith('tutorial:')&&!after.events.pendingEvent:false;
  return changed?nextStep(after):after;
}
export function tutorialAdvanceBlock(game:GameState):string|null {
  const step=tutorialStep(game);
  return step&&canTutorialBlockTimeAdvance(game,step)?'현재 안내의 화면 확인 또는 실제 행동을 마치세요. 안내는 언제든 종료할 수 있습니다.':null;
}
/** No random draws. Fixed milestones route through the existing event/crisis systems. */
export function scheduleTutorial(game:GameState):GameState {
  const t=game.tutorial;
  if(t?.mode!=='active'||!t.scriptedScenarioEnabled)return game;
  if(game.player.career.lastElection?.turn===game.turn){return {...game,tutorial:{...t,mode:'completed',stepId:null,scriptedScenarioEnabled:false,completedStepIds:[...new Set([...t.completedStepIds,'election'])]}};}
  if(game.gameOverReason){return {...game,tutorial:{...t,mode:'skipped',stepId:null,scriptedScenarioEnabled:false}};}
  let next=game;const elapsed=tutorialElapsed(game),step=tutorialStep(game);
  if(step?.id==='month'&&elapsed>=1)next=nextStep(next);
  if(step?.kind==='wait'&&elapsed>=(step.month??Infinity)&&step.id!=='election')next=nextStep(next);
  if(elapsed>=6&&step?.id==='event-wait'&&!t.firedScriptIds.includes('petition')){
    next={...next,tutorial:{...next.tutorial!,firedScriptIds:[...next.tutorial!.firedScriptIds,'petition']},events:{...next.events,pendingEvent:{id:'tutorial:petition',eventId:'crow-petition',date:{...next.date},turn:next.turn,jurisdiction:{kind:'country',id:'sparrow'},jurisdictionName:'참새자유공화국',severity:1}}};
  }
  if(elapsed>=24&&step?.id==='crisis-wait'&&!t.firedScriptIds.includes('storm')){
    next=startCrisis(next,{kind:'country',id:'sparrow'},'great_storm',60,'tutorial:storm',.2);
    next={...next,tutorial:{...next.tutorial!,firedScriptIds:[...next.tutorial!.firedScriptIds,'storm']}};
  }
  return next;
}
export function validateTutorial(value:unknown):asserts value is TutorialState {
  if(!value||typeof value!=='object')throw new Error('튜토리얼 저장 상태가 올바르지 않습니다.');
  const t=value as TutorialState,ids=new Set(tutorialSteps.map(s=>s.id));
  if(!['active','completed','skipped'].includes(t.mode)||!Number.isInteger(t.startedTurn)||t.startedTurn<1||typeof t.scriptedScenarioEnabled!=='boolean'||!Array.isArray(t.completedStepIds)||t.completedStepIds.some(id=>!ids.has(id))||new Set(t.completedStepIds).size!==t.completedStepIds.length||!Array.isArray(t.firedScriptIds)||t.firedScriptIds.some(id=>!['petition','storm'].includes(id))||new Set(t.firedScriptIds).size!==t.firedScriptIds.length||(t.mode==='active'?(!t.stepId||!ids.has(t.stepId)||!t.scriptedScenarioEnabled):(t.stepId!==null||t.scriptedScenarioEnabled)))throw new Error('튜토리얼 저장 상태가 올바르지 않습니다.');
}
