import { regionInfo } from '../game/runtime';
import { useState } from 'react';
import { getWarDeclarationBlock, resolveWarDeclaration } from '../game/casusBelli';
import { getDefenseAllies } from '../game/warfare';
import { aggressionReactionWeight } from '../game/aggression';
import { countryName } from '../game/diplomacy';
import { warGoalLabels, casusBelliLabels } from '../game/warfareConfig';
import type { GameState, WarGoal } from '../game/types';

export default function WarDeclaration({game,target,onDeclare}:{game:GameState;target:string;onDeclare:(reference:string,goal:WarGoal)=>void}) {
  const actor=game.player.controlledCountryId;
  const bellis=Object.values(game.world.warfare!.casusBelli).filter(b=>b.holderCountryId===actor&&b.targetCountryId===target&&!b.consumed&&b.expiresInMonths!==0);
  const [selection,setSelection]=useState<{id:string;goal:WarGoal;confirmed?:boolean}|null>(null);
  const goals=Object.keys(warGoalLabels) as WarGoal[];
  const observers=Object.keys(game.world.countries).filter(id=>id!==actor&&id!==target);
  const highRisk=observers.some(id=>aggressionReactionWeight(game.world,id,actor,target)>=1.25);
  const risk=observers.length?`국제적 반발: ${highRisk?'높음':'보통'}`:'현재 제3국이 없어 직접적인 국제 제재 가능성은 낮습니다.';
  const invasion=selection&&!resolveWarDeclaration(game,actor,selection.id).belli;
  const selectedBelli=selection?resolveWarDeclaration(game,actor,selection.id).belli:undefined;
  const selectedBlock=selection?getWarDeclarationBlock(game,actor,selection.id,selection.goal):null;
  const open=(id:string)=>setSelection({id,goal:goals.find(goal=>!getWarDeclarationBlock(game,actor,id,goal))??'punitive'});
  return <>
    <section className="panel war-declaration"><h2>전쟁명분</h2>
      {bellis.length?bellis.map(b=><div className="diplomatic-action" key={b.id}>
        <div><strong>{casusBelliLabels[b.type]}</strong><p>{b.expiresInMonths===null?'지속 명분':b.expiresInMonths+'개월 남음'}{b.targetRegionId?' · 목표 둥지권 '+(regionInfo(game,b.targetRegionId)?.name??b.targetRegionId):''}</p><p>국제적 정당성: 확보됨</p><small>{getWarDeclarationBlock(game,actor,b.id,goals.find(goal=>!getWarDeclarationBlock(game,actor,b.id,goal))??'punitive')??'선전포고 가능'}</small></div>
        <button className="secondary" disabled={!goals.some(goal=>!getWarDeclarationBlock(game,actor,b.id,goal))} onClick={()=>open(b.id)}>선전포고</button>
      </div>):<div className="diplomatic-action"><div><strong>전쟁명분: 없음</strong><p>국제적 정당성: 없음 · 이 전쟁은 침략전쟁으로 기록됩니다.</p><p className="invasion-warning">지금 선전포고하면 주변국의 신뢰가 떨어지고 위협 인식과 제재 가능성이 증가할 수 있습니다. 방어국의 초기 전쟁 지지도도 상승합니다.</p><p>{risk}</p><small>{getWarDeclarationBlock(game,actor,target,'punitive')??'무명분 선전포고 가능'}</small></div><button className="secondary" disabled={!!getWarDeclarationBlock(game,actor,target,'punitive')} onClick={()=>open(target)}>선전포고</button></div>}
    </section>
    {selection&&<div className="modal-backdrop war-confirm-backdrop"><section className="event-dialog panel" role="dialog" aria-modal="true" aria-labelledby="war-confirm-title">
      <h2 id="war-confirm-title">{invasion&&selection.confirmed?'명분 없이 전쟁을 시작하시겠습니까?':'선전포고 확인'}</h2>
      <p>예상 상대: {countryName(game.world,target)} · 현재 준비도 {game.world.countries[actor].military!.readiness.toFixed(1)}</p>
      <p>전쟁명분: {selectedBelli?casusBelliLabels[selectedBelli.type]:'없음'} · 국제적 정당성: {invasion?'없음':'확보됨'}</p>
      {invasion&&<div className="invasion-warning"><p>이 전쟁은 침략전쟁으로 기록됩니다. 주변국의 관계·신뢰가 하락하고 위협 인식이 상승합니다. 반복 침략은 더 큰 반발을 남깁니다.</p><p>{risk}</p></div>}
      <label>전쟁 목표 <select aria-label="전쟁 목표" value={selection.goal} onChange={e=>setSelection({...selection,goal:e.target.value as WarGoal,confirmed:false})}>{goals.map(goal=><option key={goal} disabled={!!getWarDeclarationBlock(game,actor,selection.id,goal)} value={goal}>{warGoalLabels[goal]}</option>)}</select></label>
      {invasion&&selection.goal==='border_claim'&&<p>영토 경계 목표는 상대국의 현재 둥지권 전체를 대상으로 합니다. 영토 이전에는 기존 점령·평화협정 조건이 필요합니다.</p>}
      <p>상대 방위조약 · 예상 참전국: {getDefenseAllies(game,target,actor).map(id=>countryName(game.world,id)).join(', ')||'없음'}</p>
      <p>{invasion?'명분 없는 공격에는 국제적 비용이 발생합니다.':'기존 명분을 소비합니다. 침략에 대한 추가 국제 패널티는 없습니다.'} 전시비용과 피로가 발생하며 영토 이전은 평화협정에서 확정됩니다.</p>
      {selectedBlock&&<p role="status">{selectedBlock}</p>}
      <div className="war-actions"><button className="secondary" autoFocus onClick={()=>setSelection(null)}>취소</button><button className="primary" disabled={!!selectedBlock} onClick={()=>{if(invasion&&!selection.confirmed){setSelection({...selection,confirmed:true});return;}onDeclare(selection.id,selection.goal);setSelection(null);}}>{invasion&&selection.confirmed?'침략전쟁 시작':'선전포고 확정'}</button></div>
    </section></div>}
  </>;
}
