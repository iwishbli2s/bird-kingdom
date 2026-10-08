import { Activity, Landmark, Users } from 'lucide-react';
import { calculateMinorityCrisisPressure } from '../game/governance';
import { governanceKeys } from '../game/governanceConfig';
import { species } from '../game/data';
import type { GovernanceState, PopulationState, SpeciesPoliticsState } from '../game/types';
import { governanceCategory } from './governanceLabels';

const metrics={approval:{label:'정부 지지도',icon:Landmark,description:'생활수준, 실업, 물가와 국민 만족도가 정부 평가에 영향을 줍니다.'},stability:{label:'안정도',icon:Activity,description:'치안, 낮은 지지도와 종족별 정치적 불만이 정치질서의 안정에 영향을 줍니다.'},integration:{label:'통합도',icon:Users,description:'종족 만족도, 자치 요구, 독립 성향과 사회적 격차가 공동체 결속에 영향을 줍니다.'}};
export default function PoliticsView({governance,population,politics,jurisdiction}:{governance:GovernanceState;population:PopulationState;politics:SpeciesPoliticsState;jurisdiction:string}) {
  const crisis=calculateMinorityCrisisPressure(population,politics);
  const risk=crisis.speciesId ? politics[crisis.speciesId] : undefined;
  return <section aria-label="정치 현황"><div className="section-heading"><h2>{jurisdiction}의 정치 현황</h2><span>지표 범위 0–100</span></div><div className="social-grid">{governanceKeys.map(key=>{
    const metric=metrics[key],delta=Math.round(governance[`${key}DeltaLastMonth`]*10)/10;
    return <article className="panel social-card" key={key} data-governance={key}><div className="panel-heading"><h3><metric.icon size={19}/>{metric.label}</h3><span>{governanceCategory(key,governance[key])}</span></div><div className="social-value">{governance[key].toFixed(1)}<small>/ 100</small></div><div className="gauge" role="meter" aria-label={metric.label} aria-valuenow={governance[key]} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${governance[key]}%`}}/></div><div className={`social-trend ${delta===0?'':delta>0?'positive':'negative'}`}>지난달 {delta===0?'— 0.0':`${delta>0?'▲':'▼'} ${Math.abs(delta).toFixed(1)}`}</div><p>{metric.description}</p></article>;
  })}</div><section className="panel political-risk"><h3>주요 정치 위험</h3>{risk ? <><strong>{species.find(s=>s.id===crisis.speciesId)?.name}</strong><p>만족도 {risk.satisfaction.toFixed(1)} · 자치 요구 {risk.autonomyDemand.toFixed(1)} · 독립 성향 {risk.independenceSentiment.toFixed(1)}</p><small>인구 비중과 정치적 불만을 함께 고려한 정보입니다.</small></> : <p>현재 심각한 정치적 불만이 드러난 종족은 없습니다.</p>}</section><p className="dashboard-note">정부 지지도는 종족 만족도와, 정치 안정도는 일상적 치안과 구분됩니다. 공동체 통합은 장기간에 걸쳐 변화합니다.</p></section>;
}
