import {useState} from 'react';
import {assessFederalConfrontation,evaluateFederalActionSupport,federalActionBlock,federalActionLabels,federalPrimarySpecies,federalResponseLabels,isFederalState,recentFederalConfrontations} from '../game/federalPolitics';
import {formatDate} from '../game/engine';
import type {GameState,FederalAction,AutonomyDemandLevel} from '../game/types';
const levelLabels={limited:'제한적 자치',substantial:'광범위한 자치',maximum:'최대 자치'};
export default function FederalPoliticsView({game,onAction}:{game:GameState;onAction:(action:FederalAction,level:AutonomyDemandLevel)=>void}){
 const [level,setLevel]=useState<AutonomyDemandLevel>('limited'),[confirm,setConfirm]=useState(false);
 const id=game.player.controlledRegionId;if(!id||!isFederalState(game,id))return null;
 const r=game.world.regions[id],primary=federalPrimarySpecies(r),p=r.speciesPolitics[primary]!,m=r.secession![primary]!,assessment=assessFederalConfrontation(game,id),recent=recentFederalConfrontations(game,id),remaining=Math.max(0,(game.world.federalPolitics?.[id]?.nextActionTurn??0)-game.turn);
 const availableDate=game.date.year*12+game.date.month-1+remaining;
 return <section className="panel federal-politics" aria-label="연방정치"><div className="panel-heading"><h2>연방정치</h2><span>주정부 · 연방정부</span></div><p className="panel-description">주민의 요구를 바탕으로 연방에 협상을 요청하거나 맞설 수 있습니다. 지지 기반이 약한 강경노선은 주민의 반발과 재선 위험을 높입니다.</p>
 <dl className="federal-stats"><div><dt>현재 자치 수준</dt><dd>{m.grantedAutonomy.toFixed(1)}</dd></div><div><dt>자치 요구</dt><dd>{p.autonomyDemand.toFixed(1)}</dd></div><div><dt>독립 성향</dt><dd>{p.independenceSentiment.toFixed(1)}</dd></div><div><dt>연방 통합도</dt><dd>{r.governance.integration.toFixed(1)}</dd></div></dl>
 <p>정치적 기반: {assessment.politicalBacking>=65?'강함':assessment.politicalBacking<40?'취약':'보통'} · 독립 기반: {assessment.independenceBacking>=65?'강함':assessment.independenceBacking<40?'취약':'보통'}</p>
 <p className="federal-cooldown" role="status">{remaining?`다음 정치행동 가능: ${Math.floor(availableDate/12)}년 ${availableDate%12+1}월 · ${remaining}개월 남음`:'연방정치 행동 가능'}</p>
 <label className="federal-demand">자치권 요구 수준 <select aria-label="자치권 요구 수준" value={level} onChange={e=>setLevel(e.target.value as AutonomyDemandLevel)}>{Object.entries(levelLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
 <div className="federal-action-grid">{(Object.keys(federalActionLabels) as FederalAction[]).map(action=>{const support=evaluateFederalActionSupport(game,id,action),reason=federalActionBlock(game,id,action);return <article key={action}><h3>{federalActionLabels[action]}</h3><p>주민 반응 예상: {support.reaction}<br/>연방 반발: {['confront','declare','defy'].includes(action)?'높음':action==='criticize'?'낮음':'보통'}<br/>정치적 위험: {support.risk>=70?'높음':support.risk<40?'낮음':'보통'}</p><button className={action==='declare'?'secondary danger':'secondary'} disabled={!!reason} title={reason??federalActionLabels[action]} onClick={()=>action==='declare'?setConfirm(true):onAction(action,level)}>{federalActionLabels[action]}</button>{reason&&<small>{reason}</small>}</article>})}</div>
 {confirm&&<div className="federal-confirm" role="alertdialog" aria-label="일방 독립 확인"><h3>주민투표 없이 독립을 선언하시겠습니까?</h3><p>기존 연방에서 분리되어 영토 분쟁이 시작됩니다. 주민 지지가 약하면 정부 안정과 독립 방어가 취약해지며 재통합 압박을 받을 수 있습니다.</p><button className="secondary" onClick={()=>setConfirm(false)}>취소</button><button className="secondary danger" disabled={!!federalActionBlock(game,id,'declare')} onClick={()=>{setConfirm(false);onAction('declare',level);}}>일방 독립 확정</button></div>}
 <h3>최근 연방 갈등</h3>{recent.length?<ul className="federal-history">{recent.slice(0,8).map(h=><li key={h.id}>{formatDate(h.date)} · {federalActionLabels[h.action]}{h.action==='autonomy'?` (${levelLabels[h.level]})`:''} · 연방 {federalResponseLabels[h.response]}</li>)}</ul>:<p>아직 공식 연방정치 행동이 없습니다.</p>}
 </section>;
}
