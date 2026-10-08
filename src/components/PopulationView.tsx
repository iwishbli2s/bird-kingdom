import { Users } from 'lucide-react';
import { useState } from 'react';
import { populationChange, speciesShare } from '../game/population';
import { speciesDefinitions } from '../game/populationConfig';
import type { PopulationState, SpeciesPoliticsState } from '../game/types';
import SpeciesPoliticsView from './SpeciesPoliticsView';

export const formatPopulation = (n: number) => Math.abs(n)>=1e9?n.toLocaleString('ko-KR',{notation:'compact',maximumFractionDigits:1}):n.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
const signed = (n: number) => `${n >= 0 ? '+' : ''}${formatPopulation(n)}`;

export default function PopulationView({ population, politics, jurisdiction, turn }: { population: PopulationState; politics: SpeciesPoliticsState; jurisdiction: string; turn: number }) {
  const [tab, setTab] = useState<'population' | 'politics'>('population');
  const change = populationChange(population);
  const previousTotal = population.total - change;
  const monthlyGrowth = previousTotal > 0 ? change / previousTotal * 100 : 0;
  const entries = Object.values(population.species).sort((a, b) => b.population - a.population || a.speciesId.localeCompare(b.speciesId));
  const metrics = [
    { label: '총인구', value: formatPopulation(population.total), unit: '명' },
    { label: '지난달 출생', value: formatPopulation(population.birthsLastMonth), unit: '명' },
    { label: '지난달 자연사망', value: formatPopulation(population.deathsLastMonth), unit: '명' },
    { label: '지난달 순이동', value: signed(population.netMigrationLastMonth), unit: '명' },
    { label: '월간 인구 증감', value: signed(change), unit: '명' },
    { label: '월간 인구 증감률', value: `${monthlyGrowth >= 0 ? '+' : ''}${monthlyGrowth.toFixed(3)}`, unit: '%' },
  ];
  return <div className="population-view"><div className="section-heading"><h2><Users size={17} /> {jurisdiction} 인구 현황</h2><span>{turn === 1 ? '시작 시점 · 월간 변동 없음' : '최근 월간 계산 결과'}</span></div>
    <div className="population-metrics-grid">{metrics.map(metric => <article className="metric-card" key={metric.label}><div className="metric-label">{metric.label}</div><div className="metric-value">{metric.value}<span>{metric.unit}</span></div></article>)}</div>
    <div className="fiscal-tabs" role="tablist" aria-label="종족 정보"><button id="population-tab" role="tab" aria-selected={tab === 'population'} aria-controls="population-panel" onClick={() => setTab('population')}>인구 통계</button><button id="politics-tab" role="tab" aria-selected={tab === 'politics'} aria-controls="politics-panel" onClick={() => setTab('politics')}>종족 정치</button></div>
    <div id="population-panel" role="tabpanel" aria-labelledby="population-tab" hidden={tab !== 'population'}><section className="panel population-panel"><div className="panel-heading"><h2>종족별 인구 구성</h2><span>{entries.length}개 집단 · 비율은 현재 인구 기준</span></div>
      <div className="population-table-wrap"><table className="population-table"><thead><tr><th>종족</th><th>현재 인구</th><th>비율</th><th>출생</th><th>자연사망</th><th>순이동</th><th>연 출생률</th><th>연 사망률</th><th>연 순이동률</th></tr></thead><tbody>{entries.map(entry => {
        const definition = speciesDefinitions.find(d => d.id === entry.speciesId)!;
        const share = speciesShare(entry, population);
        return <tr key={entry.speciesId} data-species={entry.speciesId}><th scope="row"><span className="species-icon">{definition.code}</span>{definition.name}</th>
          <td data-label="현재 인구">{formatPopulation(entry.population)}</td><td data-label="비율"><span>{share.toFixed(1)}%</span><div className="gauge" role="meter" aria-label={`${definition.name} 인구 비율`} aria-valuenow={share} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${share}%` }} /></div></td>
          <td data-label="월 출생">{formatPopulation(entry.birthsLastMonth)}</td><td data-label="월 자연사망">{formatPopulation(entry.deathsLastMonth)}</td><td data-label="월 순이동">{signed(entry.migrationLastMonth)}</td>
          <td data-label="연 출생률">{entry.birthRate.toFixed(2)}%</td><td data-label="연 사망률">{entry.deathRate.toFixed(2)}%</td><td data-label="연 순이동률">{entry.migrationRate >= 0 ? '+' : ''}{entry.migrationRate.toFixed(2)}%</td></tr>;
      })}</tbody></table></div>
      <p className="panel-description population-table-note">출생·자연사망·순이동 인원은 최근 월간 계산값이며 비율은 연간 기준입니다. 순이동은 외부 순유입·순유출의 근사로, 주 사이의 실제 이동을 나타내지 않습니다.</p>
    </section><p className="dashboard-note">경제 상황과 보건·복지 예산이 인구 변화에 작은 영향을 줍니다. 전체 인구의 자연사망과 플레이어 개인의 사망 판정은 별도 시스템입니다.</p></div>
    <div id="politics-panel" role="tabpanel" aria-labelledby="politics-tab" hidden={tab !== 'politics'}><SpeciesPoliticsView population={population} politics={politics} /></div></div>;
}
