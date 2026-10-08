import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { calculateCrisisResilience, crisisJurisdictions, crisisOwner, crisisRuntime, crisesFor, calculateLeaderRisk } from '../game/crisis';
import { crisisDefinitions, crisisSeverityLabel, leaderRiskLabel } from '../game/crisisConfig';
import { controlledRegionId, countryInfo, regionInfo } from '../game/runtime';
import type { GameState, Jurisdiction } from '../game/types';
export function LeaderRiskView({game}:{game:GameState}) {
 const risk=calculateLeaderRisk(game);
 return <section className="panel leader-risk-panel" aria-label="지도자 상황위험"><div className="panel-heading"><h2><ShieldCheck size={18}/> 지도자 상황위험</h2><strong>{leaderRiskLabel(risk.situationalRisk)}</strong></div><p>{risk.factors.length?risk.factors.join(' · '):'현재 특별한 상황위험 요인이 없습니다.'}</p><small>의료·경보·안전 기반과 현재 위기 상황을 반영합니다. 현장 지휘의 노출은 일시적입니다.</small></section>;
}
export default function CrisisView({game}:{game:GameState}) {
 const region=controlledRegionId(game),j:Jurisdiction=region?{kind:'region',id:region}:{kind:'country',id:game.player.controlledCountryId};
 const r=crisisRuntime(game.world,j),res=r?calculateCrisisResilience(r):null;
 const current=crisesFor(game.world,j).slice().sort((a,b)=>b.severity-a.severity||a.id.localeCompare(b.id));
 const others=crisisJurisdictions(game.world).filter(x=>x.id!==j.id||x.kind!==j.kind).flatMap(x=>crisesFor(game.world,x).map(c=>({c,j:x}))).sort((a,b)=>b.c.severity-a.c.severity);
 return <section className="crisis-view" aria-label="위기 대응 현황"><div className="section-heading"><h2><AlertTriangle size={18}/> 현재 위기</h2><span>{current.length}건 · 해당 운영 관할</span></div>{res&&<div className="crisis-resilience">{([['infrastructure','기반 회복력'],['medical','의료 대응력'],['foodSecurity','식량 안전'],['emergencyResponse','긴급 대응'],['information','정보 기반']] as const).map(([key,label])=><div key={key}><span>{label}</span><strong>{res[key].toFixed(0)}<small> / 100</small></strong></div>)}</div>}
 <div className="crisis-grid">{current.map(c=><article className="panel crisis-card" key={c.id}><div className="event-meta"><span>{c.category==='disaster'?'재난':'질병'}</span><strong>{crisisSeverityLabel(c.severity)}</strong><span>{c.phase==='active'?'위기 진행':'회복 단계'}</span></div><h3>{crisisDefinitions[c.type].name}</h3><p>{crisisDefinitions[c.type].impacts}</p><dl><div><dt>발생 강도 / 현재 강도</dt><dd>{c.severity.toFixed(0)} / {c.intensity.toFixed(0)}</dd></div><div><dt>진행 기간</dt><dd>{c.elapsedMonths}개월</dd></div><div><dt>누적 대응비</dt><dd>{c.totalFiscalCost.toFixed(2)}</dd></div><div><dt>회복 진행</dt><dd>{c.recoveryProgress.toFixed(0)}%</dd></div></dl><div className="gauge" role="meter" aria-label={`${crisisDefinitions[c.type].name} 회복`} aria-valuenow={c.recoveryProgress} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${c.recoveryProgress}%`}}/></div>{c.category==='disease'&&<small>{c.isContained?'확산 통제 중':'검역·의료 대응 진행 중'}</small>}</article>)}</div>{!current.length&&<div className="panel crisis-empty">현재 진행 중인 재난·질병 위기가 없습니다.</div>}
 <details className="panel world-crises"><summary>다른 둥지권의 위기 · {others.length}건</summary>{others.map(({c,j:x})=><p key={c.id}>{x.kind==='region'?regionInfo(game,x.id)?.name:countryInfo(game,x.id).name} · {countryInfo(game,crisisOwner(game.world,x)!).name} — {crisisDefinitions[c.type].name} · {crisisSeverityLabel(c.severity)} · 회복 {c.recoveryProgress.toFixed(0)}%</p>)}</details></section>;
}
