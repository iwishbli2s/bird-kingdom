import { Banknote, Coins, PieChart, TrendingUp, Users, Wallet } from 'lucide-react';
import type { EconomyState, FiscalState } from '../game/types';

type MetricKey = 'gdp' | 'growth' | 'unemployment' | 'inflation' | 'treasury' | 'debt';
const metrics: { key: MetricKey; label: string; unit: string; icon: typeof Coins; note: string }[] = [
  { key: 'gdp', label: 'GDP', unit: '십억 BK', icon: Coins, note: '산업별 생산량 합계' },
  { key: 'growth', label: '경제성장률', unit: '%', icon: TrendingUp, note: '월간 변화의 연율화' },
  { key: 'unemployment', label: '실업률', unit: '%', icon: Users, note: '경제활동인구 기준' },
  { key: 'inflation', label: '물가상승률', unit: '%', icon: PieChart, note: '소비자물가 기준' },
  { key: 'treasury', label: '정부 재정', unit: '십억 BK', icon: Wallet, note: '정부 보유 자금' },
  { key: 'debt', label: '국가부채', unit: '십억 BK', icon: Banknote, note: '부채 잔액' },
];

export const formatEconomyNumber = (value: number) => Math.abs(value)>=1e6 ? value.toLocaleString('ko-KR',{notation:'compact',maximumFractionDigits:1}) : value.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default function EconomyMetrics({ economy, fiscal }: { economy: EconomyState; fiscal?: FiscalState }) {
  const values = { ...economy, ...(fiscal ? { treasury: fiscal.treasury, debt: fiscal.debt } : {}) };
  return <div className={`metrics-grid ${fiscal ? '' : 'economy-summary-grid'}`}>
    {metrics.filter(metric => fiscal || !['treasury', 'debt'].includes(metric.key)).map(metric => <article className="metric-card" key={metric.key}>
      <div className="metric-label">{metric.label}<metric.icon size={18} strokeWidth={1.5} /></div>
      <div className="metric-value" title={(values[metric.key]??0).toLocaleString('ko-KR',{maximumFractionDigits:4})}>{formatEconomyNumber(values[metric.key] ?? 0)}<span>{metric.unit}</span></div>
      <div className="metric-note">{metric.note}<span className="neutral-mark">—</span></div>
    </article>)}
  </div>;
}
