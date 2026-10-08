import { aiStrategyLabels } from '../game/aiConfig';
import { controlledGovernmentId, governmentDescriptors, governmentName } from '../game/government';
import type { GameState } from '../game/types';
export default function GovernmentPolicyView({game}:{game:GameState}) {
 const controlled=controlledGovernmentId(game);
 return <section className="government-policy-view" aria-label="세계 정부 정책 방향"><div className="section-heading"><h2>세계 정부 정책 방향</h2><span>공개된 최근 정책</span></div><div className="government-policy-grid">{governmentDescriptors(game.world).map(g=>{const state=game.world.governmentAI?.[g.id],player=g.id===controlled,last=state?.recentDecisions.find(d=>['tax','budget','research'].includes(d.type));return <article className="panel government-policy-card" key={g.id}><h3>{governmentName(game,g)}</h3><strong>{player?'직접 운영':aiStrategyLabels[state?.currentStrategy??'normal']}</strong><p>{player?'이 정부의 정책은 플레이어가 결정합니다.':last?.summary??'현재 정책을 유지하고 있습니다.'}</p></article>;})}</div></section>;
}
