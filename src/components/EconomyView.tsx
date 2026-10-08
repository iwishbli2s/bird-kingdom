import { Factory, LockKeyhole, TrendingUp } from 'lucide-react';
import { industryConfig, industryIds } from '../game/economyConfig';
import type { EconomyState } from '../game/types';
import EconomyMetrics, { formatEconomyNumber } from './EconomyMetrics';

export default function EconomyView({ economy, jurisdiction }: { economy: EconomyState; jurisdiction: string }) {
  return <div className="economy-view"><section aria-labelledby="economy-summary-heading"><div className="section-heading"><h2 id="economy-summary-heading"><TrendingUp size={17} /> {jurisdiction} 경제 현황</h2><span>월간 경제 시뮬레이션</span></div><EconomyMetrics economy={economy} /></section>
    <section className="panel industry-panel" aria-labelledby="industry-heading"><div className="panel-heading"><h2 id="industry-heading"><Factory size={17} /> 산업구조</h2><span>5개 산업 · 생산성 기준 100</span></div><p className="panel-description">현재 생산량의 합계가 GDP를 구성합니다. 금액 단위는 십억 BK입니다.</p>
      <div className="industry-composition" aria-label="GDP 산업 구성비">{industryIds.map(id => <span key={id} className={`industry-color industry-${id}`} style={{ width: `${economy.gdp > 0 ? economy.industries[id].output / economy.gdp * 100 : 0}%` }} title={industryConfig[id].name} />)}</div>
      <div className="industry-table-wrap"><table className="industry-table"><thead><tr><th scope="col">산업</th><th scope="col">현재 생산량</th><th scope="col">GDP 비중</th><th scope="col">생산성</th></tr></thead><tbody>{industryIds.map(id => {
        const industry = economy.industries[id];
        const share = economy.gdp > 0 ? industry.output / economy.gdp * 100 : 0;
        return <tr key={id}><th scope="row"><span className={`industry-dot industry-color industry-${id}`} />{industryConfig[id].name}</th><td>{formatEconomyNumber(industry.output)} <small>BK</small></td><td><div className="industry-share"><div className="gauge"><span className={`industry-color industry-${id}`} style={{ width: `${share}%` }} /></div><span>{formatEconomyNumber(share)}%</span></div></td><td>{formatEconomyNumber(industry.productivity)}</td></tr>;
      })}</tbody></table></div><div className="economy-readonly"><LockKeyhole size={14} /><span>현재 경제 화면은 읽기 전용입니다. 세율 조정과 재정 상세는 예산 메뉴에서 확인하세요.</span></div>
    </section><p className="dashboard-note">매월 산업 생산과 생산성이 변화하며 성장률·실업률·물가에 반영됩니다. 정부 재정은 예산 메뉴에서 확인할 수 있습니다.</p>
  </div>;
}
