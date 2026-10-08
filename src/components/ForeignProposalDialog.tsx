import {useDialog} from './useDialog';
import { countryName, getDiplomaticActionBlock } from '../game/diplomacy';
import { diplomaticActionLabels, diplomaticActionDescriptions } from '../game/diplomacyConfig';
import { getPeaceBlock } from '../game/peace';
import { formatDate } from '../game/engine';
import type { GameState } from '../game/types';
const peaceLabels={status_quo:'현 상태와 영유권 유지',territory_transfer:'전쟁 목표 둥지권 영토 이전',reparations:'국고 배상',recognition:'독립국 승인',abandon_reunification:'재통합 주장 포기',defense_success:'방어 성공과 현상 유지'};
export default function ForeignProposalDialog({game,onRespond,onEndTutorial}:{onEndTutorial?:()=>void;game:GameState;onRespond:(id:string,accept:boolean)=>void}){
 const dialogRef=useDialog();
  const p=game.world.foreignProposals?.find(x=>x.targetId===game.player.controlledCountryId);if(!p)return null;
 const blocked=p.kind==='treaty'&&p.action?getDiplomaticActionBlock(game,p.actorId,p.targetId,p.action,true):p.kind==='peace'&&p.warId&&p.resolution?getPeaceBlock(game,p.warId,p.resolution):null;
 const title=p.action?diplomaticActionLabels[p.action]:p.kind==='peace'?'평화협정':'내부 분쟁 합의';
 const w=p.warId?game.world.warfare!.wars[p.warId]:undefined;
 return <div className="modal-backdrop"><section ref={dialogRef} className="event-dialog panel foreign-proposal" role="dialog" aria-modal="true" aria-labelledby="foreign-title"><div className="event-meta"><span>외교 제안</span><time>{formatDate(p.date)}</time></div><h2 id="foreign-title">{countryName(game.world,p.actorId)}의 {title} 제안</h2><p>수락 여부를 결정하십시오. 거절하면 해당 합의는 체결되지 않습니다.</p>{p.action&&<p>{diplomaticActionDescriptions[p.action]}</p>}{p.kind==='conflict'&&<p>{p.conflictResolution==='negotiated_reintegration'?'확대 자치로 부모국에 재통합합니다. 신생국을 운영 중이라면 게임이 종료됩니다.':'독립 지위를 승인하고 내부 분쟁을 종료합니다.'}</p>}{p.resolution&&<p>{peaceLabels[p.resolution]}{p.resolution==='territory_transfer'&&w?' · '+countryName(game.world,w.primaryAttacker)+'에 이전: '+w.fronts.map(f=>game.world.regions[f.regionId]?.regionIdentity?.name??f.regionId).join(' / '):''}{p.resolution==='reparations'&&w?' · '+countryName(game.world,w.primaryDefender)+' → '+countryName(game.world,w.primaryAttacker)+' · '+Math.min(game.world.countries[w.primaryDefender].fiscal.treasury,game.world.countries[w.primaryDefender].economy.gdp*.01).toFixed(2)+' BK (십억)':''}</p>}{blocked&&<p>{blocked}</p>}<div className="event-choices"><button aria-label="제안 수락" autoFocus disabled={!!blocked} onClick={()=>onRespond(p.id,true)}><strong>제안 수락</strong><span>표시된 조약 또는 합의 조건을 적용합니다.</span></button><button aria-label="제안 거절" onClick={()=>onRespond(p.id,false)}><strong>제안 거절</strong><span>현재 조약·영토 상태를 유지합니다.</span></button></div>{game.tutorial?.mode==='active'&&<button className="secondary" onClick={onEndTutorial}>튜토리얼 종료</button>}</section></div>;
}
