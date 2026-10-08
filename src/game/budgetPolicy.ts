import {policyChangeBlock,markPolicyChanged} from './policySchedule';
import { refreshCountryAggregates } from './runtime';
import { controlledGovernmentId, getGovernment } from './government';
import { appendGameLog } from './logs';
import { sumBudgetRates, validateBudgetPolicy } from './budget';
import { budgetCategoryIds } from './budgetConfig';
import type { BudgetPolicy,GameState,WorldState } from './types';
export function setGovernmentBudgetPolicy(game:GameState,governmentId:string,policy:BudgetPolicy,options:{log?:boolean;emergency?:boolean}={}):GameState {
 if(!game.player.alive||game.gameOverReason)throw new Error('운영 종료 후에는 예산 정책을 변경할 수 없습니다.');
 const g=getGovernment(game.world,governmentId);if(governmentId===controlledGovernmentId(game)&&game.events.pendingEvent)throw new Error('사건을 먼저 해결해야 합니다.');
 validateBudgetPolicy(policy);const j=g.jurisdiction,target=j.kind==='region'?game.world.regions[j.id]:game.world.countries[j.id];if(budgetCategoryIds.every(id=>target.fiscal.budgetPolicy[id]===policy[id]))return game;
 const block=policyChangeBlock(game,governmentId,'budget',options.emergency);if(block)throw new Error(block);
 const fiscal={...target.fiscal,budgetPolicy:{...policy}};let world:WorldState=j.kind==='region'?{...game.world,regions:{...game.world.regions,[j.id]:{...game.world.regions[j.id],fiscal}}}:{...game.world,countries:{...game.world.countries,[j.id]:{...game.world.countries[j.id],fiscal}}};
 if(game.world.countries[g.countryId].identity?.isDynamic)world=refreshCountryAggregates(world);const next=markPolicyChanged({...game,world},governmentId,'budget',options.emergency);return options.log===false?next:appendGameLog(next,{category:'economic',type:'event',message:'정부가 새로운 예산안을 확정했습니다. 총 프로그램 지출: GDP의 '+sumBudgetRates(policy).toFixed(1)+'%. (다음 달부터 반영)'});
}
export function setControlledBudgetPolicy(game:GameState,policy:BudgetPolicy,emergency=false):GameState {return setGovernmentBudgetPolicy(game,controlledGovernmentId(game),policy,{emergency});}

