import { speciesDefinitions } from '../game/populationConfig';
import { speciesShare } from '../game/population';
import type { PopulationState, SpeciesPoliticalState, SpeciesPoliticsState } from '../game/types';
import { politicalMetricCategory, type PoliticalMetric } from './speciesPoliticsLabels';

const metrics: { key: PoliticalMetric; label: string; delta: keyof Pick<SpeciesPoliticalState, 'satisfactionDeltaLastMonth' | 'influenceDeltaLastMonth' | 'autonomyDeltaLastMonth' | 'independenceDeltaLastMonth'> }[] = [
  { key: 'satisfaction', label: '만족도', delta: 'satisfactionDeltaLastMonth' }, { key: 'politicalInfluence', label: '정치 영향력', delta: 'influenceDeltaLastMonth' },
  { key: 'autonomyDemand', label: '자치 요구', delta: 'autonomyDeltaLastMonth' }, { key: 'independenceSentiment', label: '독립 성향', delta: 'independenceDeltaLastMonth' },
];
const number = (n: number) => n.toLocaleString('ko-KR');
export default function SpeciesPoliticsView({ population, politics }: { population: PopulationState; politics: SpeciesPoliticsState }) {
  const entries = Object.values(population.species).sort((a, b) => b.population - a.population || a.speciesId.localeCompare(b.speciesId));
  return <div className="species-politics-view"><p className="politics-description">만족도는 정부와 생활에 대한 평가, 영향력은 제도적 정책 결정력입니다. 자치는 국가 내부의 권한 확대, 독립은 국가 분리에 대한 성향을 나타냅니다. 영향력 합계는 100으로 제한하지 않습니다.</p>
    <div className="politics-grid">{entries.map(entry => {
      const definition = speciesDefinitions.find(d => d.id === entry.speciesId)!; const state = politics[entry.speciesId];
      return <article className="panel politics-card" key={entry.speciesId} data-species={entry.speciesId}><div className="panel-heading"><h2><span className="species-icon">{definition.code}</span>{definition.name}</h2><span>{speciesShare(entry, population).toFixed(1)}%</span></div>
        <p className="politics-population">{number(entry.population)}명</p><div className="politics-flows"><span>출생 {number(entry.birthsLastMonth)}</span><span>자연사망 {number(entry.deathsLastMonth)}</span><span>순이동 {entry.migrationLastMonth >= 0 ? '+' : ''}{number(entry.migrationLastMonth)}</span></div>
        {state ? metrics.map(metric => { const value = state[metric.key]; const delta = state[metric.delta]; return <div className={`political-indicator political-${metric.key}`} key={metric.key} data-metric={metric.key}>
          <div><span>{metric.label}</span><span className="political-category">{politicalMetricCategory(metric.key, value)}</span><strong>{value.toFixed(1)}</strong><small aria-label={`${metric.label} 지난달 변화`}>{Math.abs(delta) < .05 ? '—' : `${delta > 0 ? '▲' : '▼'}${Math.abs(delta).toFixed(1)}`}</small></div>
          <div className="gauge" role="meter" aria-label={`${definition.name} ${metric.label}`} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${value}%` }} /></div></div>; }) : <p className="panel-description">정치 상태가 없습니다.</p>}
      </article>;
    })}</div><p className="dashboard-note">정치적 압력은 수개월·수년에 걸쳐 변화합니다. 현재 수치만 계산하며 시위·폭동·독립 사건은 발생시키지 않습니다.</p></div>;
}
