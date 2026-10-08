import {policyChangeBlock,markPolicyChanged} from './policySchedule';
import { refreshCountryAggregates } from './runtime';
import { controlledGovernmentId, getGovernment } from './government';
import { appendGameLog } from './logs';
import { validateTaxPolicy } from './fiscal';
import { taxFields } from './fiscalConfig';
import type { GameState, TaxPolicy, WorldState } from './types';
export function setGovernmentTaxPolicy(game:GameState,governmentId:string,policy:TaxPolicy,options:{log?:boolean}={}):GameState {
 if(!game.player.alive||game.gameOverReason)throw new Error('운영 종료 후에는 조세 정책을 변경할 수 없습니다.');
 validateTaxPolicy(policy);const g=getGovernment(game.world,governmentId);
 if(governmentId===controlledGovernmentId(game)&&game.events.pendingEvent)throw new Error('사건을 먼저 해결해야 합니다.');
 const j=g.jurisdiction,target=j.kind==='region'?game.world.regions[j.id]:game.world.countries[j.id];
 if(taxFields.every(field=>target.fiscal.taxPolicy[field]===policy[field]))return game;
 const block=policyChangeBlock(game,governmentId,'tax');if(block)throw new Error(block);
 const fiscal={...target.fiscal,taxPolicy:{...policy}};
 let world:WorldState=j.kind==='region'?{...game.world,regions:{...game.world.regions,[j.id]:{...game.world.regions[j.id],fiscal}}}:{...game.world,countries:{...game.world.countries,[j.id]:{...game.world.countries[j.id],fiscal}}};
 if(game.world.countries[g.countryId].identity?.isDynamic)world=refreshCountryAggregates(world);
 const next=markPolicyChanged({...game,world},governmentId,'tax');return options.log===false?next:appendGameLog(next,{category:'economic',type:'event',message:'정부가 새로운 조세 정책을 발표했습니다. 소득세 '+policy.incomeTaxRate+'% · 법인세 '+policy.corporateTaxRate+'% · 소비세 '+policy.consumptionTaxRate+'% (다음 달부터 반영)'});
}
export function setControlledTaxPolicy(game:GameState,policy:TaxPolicy):GameState {return setGovernmentTaxPolicy(game,controlledGovernmentId(game),policy);}

