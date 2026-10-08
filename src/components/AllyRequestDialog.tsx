import {useDialog} from './useDialog';
import { countryName } from '../game/diplomacy';
import type { GameState } from '../game/types';
export default function AllyRequestDialog({game,onRespond,onEndTutorial}:{onEndTutorial?:()=>void;game:GameState;onRespond:(id:string,accept:boolean)=>void}){
 const dialogRef=useDialog();
  const req=game.world.warfare!.allyRequests.find(r=>r.status==='pending'&&r.allyCountryId===game.player.controlledCountryId);if(!req)return null;
 const war=game.world.warfare!.wars[req.warId];return <div className="modal-backdrop"><section ref={dialogRef} className="event-dialog panel" role="dialog" aria-modal="true" aria-labelledby="ally-request-title"><h2 id="ally-request-title">방위조약 참전 요청</h2><p>{countryName(game.world,req.requesterCountryId)}이 {war.countryNames[war.primaryAttacker]}의 공격을 받아 공동 비행회랑 방어를 요청했습니다.</p><p>참전하면 전시비용·피로가 발생합니다. 불참하면 신뢰 25, 관계 20이 하락하고 방위조약이 해제됩니다.</p><div className="war-actions"><button className="primary" autoFocus onClick={()=>onRespond(req.id,true)}>참전</button><button className="secondary" onClick={()=>onRespond(req.id,false)}>불참</button></div>{game.tutorial?.mode==='active'&&<button className="secondary" onClick={onEndTutorial}>튜토리얼 종료</button>}</section></div>;
}
