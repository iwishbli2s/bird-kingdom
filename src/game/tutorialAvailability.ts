import type {GameState} from './types';
import type {TutorialStep} from './tutorialSteps';
import {controlledGovernmentId} from './government';
import {controlledPolicySchedule,policyChangeBlock} from './policySchedule';
import {getBilateralRelation,getDiplomaticActionBlock,getDiplomaticCooldown} from './diplomacy';
import {selectControlledRuntime} from './world';
import {researchBlock} from './technology';
import {technologyDefinitions} from './technologyDefinitions';

/** Derived from the same rules as the real commands; never resets their locks. */
export function tutorialActionAvailability(game:GameState,step:TutorialStep):{available:boolean;reason?:string;months?:number} {
  if(step.kind!=='action'||step.id==='month')return {available:true};
  if(game.events.pendingEvent)return {available:step.id==='event',reason:'열린 사건창을 먼저 해결하세요.'};
  if(step.id==='tax'||step.id==='budget'){
    const reason=policyChangeBlock(game,controlledGovernmentId(game),step.id);
    const schedule=controlledPolicySchedule(game);
    const until=step.id==='tax'?schedule?.taxNextChangeTurn:schedule?.budgetNextChangeTurn;
    return {available:!reason,reason:reason??undefined,months:reason&&until?Math.max(0,until-game.turn):undefined};
  }
  if(step.id==='diplomacy'){
    const actor=game.player.controlledCountryId,relation=getBilateralRelation(game.world,actor,'pigeon');
    const reason=getDiplomaticActionBlock(game,actor,'pigeon','improve');
    const months=relation?getDiplomaticCooldown(relation,actor,game.turn):0;
    return {available:!reason,months,reason:months?'다른 외교 행동으로 인해 외교 행동 재사용 대기기간이 적용되었습니다. 관계 개선 사절단은 재사용 대기기간이 끝난 뒤 보낼 수 있습니다. 시간을 진행해보세요.':reason??undefined};
  }
  if(step.id==='technology'){
    if(game.world.warfare?.allyRequests.some(r=>r.status==='pending'&&r.allyCountryId===game.player.controlledCountryId))return {available:false,reason:'참전 요청을 먼저 해결하세요.'};
    const technology=selectControlledRuntime(game).technology!;
    // Replacing an occupied slot is legal: the tutorial explicitly teaches cancellation.
    const available=technologyDefinitions.some(def=>{
      if(technology.domains[def.domain].currentResearchId===def.id)return false;
      const candidate=structuredClone(technology);
      for(const domain of Object.values(candidate.domains))domain.currentResearchId=null;
      return !researchBlock(candidate,def.id);
    });
    return {available,reason:available?undefined:'현재 지정할 수 있는 새로운 연구가 없습니다. 시간을 진행하거나 안내를 종료할 수 있습니다.'};
  }
  return {available:false,reason:'현재 목표 행동을 사용할 수 없습니다. 시간을 진행하거나 안내를 종료할 수 있습니다.'};
}

export function canTutorialBlockTimeAdvance(game:GameState,step:TutorialStep):boolean {
  if(step.kind==='wait'||step.id==='month')return false;
  if(step.kind==='read')return true;
  return tutorialActionAvailability(game,step).available;
}
