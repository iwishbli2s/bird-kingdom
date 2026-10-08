import {policyChangeBlock} from '../game/policySchedule';
import {controlledGovernmentId} from '../game/government';
import { useEffect, useState } from 'react';
import { Check, Landmark, SlidersHorizontal } from 'lucide-react';
import { taxFields, taxPolicyConfig } from '../game/fiscalConfig';
import type { BudgetPolicy, EconomyState, FiscalState, TaxPolicy,GameState } from '../game/types';
import BudgetView from './BudgetView';
import { formatEconomyNumber } from './EconomyMetrics';

export default function FiscalView({ game,fiscal, economy, jurisdiction, turn, onApply, onBudgetApply }: {
  game:GameState;fiscal: FiscalState; economy: EconomyState; jurisdiction: string; turn: number; onApply: (policy: TaxPolicy) => void; onBudgetApply: (policy: BudgetPolicy,emergency?:boolean) => void;
}) {
  const lock=policyChangeBlock(game,controlledGovernmentId(game),'tax');
  const [draft, setDraft] = useState<TaxPolicy>({ ...fiscal.taxPolicy });
  const [tab, setTab] = useState<'tax' | 'budget'>('tax');
  const [notice, setNotice] = useState('');
  useEffect(() => { setDraft({ ...fiscal.taxPolicy }); }, [fiscal.taxPolicy]);
  const changed = taxFields.some(field => draft[field] !== fiscal.taxPolicy[field]);
  const metrics = [
    { label: '국고', value: fiscal.treasury, unit: '십억 BK' }, { label: '정부 부채', value: fiscal.debt, unit: '십억 BK' },
    { label: 'Debt-to-GDP', value: economy.gdp > 0 ? fiscal.debt / economy.gdp * 100 : 0, unit: '%' },
    { label: '현재 연 이자율', value: fiscal.annualInterestRate, unit: '%' },
    { label: '이번 달 총 세입', value: fiscal.revenue.total, unit: '십억 BK' },
    { label: '이번 달 정책지출', value: fiscal.expenditure.programTotal, unit: '십억 BK' },
    { label: '부채 이자비용', value: fiscal.expenditure.interest, unit: '십억 BK' },
    ...(fiscal.expenditure.emergency? [{ label: '위기 긴급대응비', value: fiscal.expenditure.emergency, unit: '십억 BK' }]:[]),
    { label: '이번 달 총지출', value: fiscal.expenditure.total, unit: '십억 BK' },
    { label: '월간 재정수지', value: fiscal.monthlyBalance, unit: '십억 BK', signed: true },
  ];
  return <div className="fiscal-view"><div className="section-heading"><h2><Landmark size={17} /> {jurisdiction} 정부 재정</h2><span>{turn === 1 ? '시작 월 기준 추정 · 국고 반영 전' : '이번 달 결산'}</span></div>
    <div className="fiscal-metrics-grid">{metrics.map(metric => <article className={`metric-card ${metric.signed ? (metric.value >= 0 ? 'balance-surplus' : 'balance-deficit') : ''}`} key={metric.label}><div className="metric-label">{metric.label}</div><div className="metric-value">{metric.signed && metric.value >= 0 ? '+' : ''}{formatEconomyNumber(metric.value)}<span>{metric.unit}</span></div></article>)}</div>
    <div className="fiscal-tabs" role="tablist" aria-label="재정 관리"><button id="tax-tab" role="tab" aria-selected={tab === 'tax'} aria-controls="tax-panel" onClick={() => setTab('tax')}>재정 및 조세</button><button id="budget-tab" role="tab" aria-selected={tab === 'budget'} aria-controls="budget-panel" onClick={() => setTab('budget')}>예산 편성</button></div>
    <div id="tax-panel" role="tabpanel" aria-labelledby="tax-tab" hidden={tab !== 'tax'}><div className="fiscal-panels"><section className="panel revenue-panel"><div className="panel-heading"><h2>세입 상세</h2><span>월간 · 십억 BK</span></div><dl className="revenue-list">{[['소득세', fiscal.revenue.incomeTax], ['법인세', fiscal.revenue.corporateTax], ['소비세', fiscal.revenue.consumptionTax], ['총 세입', fiscal.revenue.total]].map(([label, amount]) => <div key={label}><dt>{label}</dt><dd>{formatEconomyNumber(Number(amount))}</dd></div>)}</dl><p className="panel-description">정책 적용 후에도 현재 결산은 유지됩니다. 새 세율은 다음 월 계산부터 반영됩니다.</p></section>
    <section className="panel tax-policy-panel"><div className="panel-heading"><h2><SlidersHorizontal size={17} /> 세율 조정</h2><span>운영 중인 정부만 변경</span></div><p className="panel-description">현재 세율과 변경 예정 세율을 확인하고 한 번에 적용하세요.</p>
      <p className="policy-cadence">세율 변경주기: 3개월 · 초안은 언제든 조정할 수 있습니다.</p>{lock&&<p className="policy-lock" role="status">{lock}</p>}<form onSubmit={event => { event.preventDefault(); if (changed&&!lock) { onApply({ ...draft }); setNotice('세율이 저장되었습니다. 다음 달부터 반영됩니다.'); } }}>
        <div className="tax-columns"><span>세목</span><span>현재 적용</span><span>변경 예정</span></div>
        {taxFields.map(field => <div className="tax-control" key={field}><div className="tax-values"><label htmlFor={field}>{taxPolicyConfig[field].label}</label><span>{fiscal.taxPolicy[field]}%</span><strong>{draft[field]}%</strong></div><input id={field} type="range" min={taxPolicyConfig[field].min} max={taxPolicyConfig[field].max} step="0.5" value={draft[field]} onChange={event => { setDraft(current => ({ ...current, [field]: Number(event.target.value) })); setNotice(''); }} /><div className="tax-range"><span>0%</span><span>{taxPolicyConfig[field].max}%</span></div></div>)}
        <div className="tax-actions"><button className="secondary" type="button" disabled={!changed} onClick={() => { setDraft({ ...fiscal.taxPolicy }); setNotice(''); }}>변경 취소</button><button className="primary" type="submit" title={!changed?'초안을 먼저 조정하세요.':lock??'다음 달부터 새 세율을 적용합니다.'} disabled={!changed||!!lock}><Check size={16} /> 세율 적용</button></div><p className="tax-notice" role="status">{changed ? '변경 예정값은 아직 적용되지 않았습니다.' : notice}</p>
      </form></section></div></div><div id="budget-panel" role="tabpanel" aria-labelledby="budget-tab" hidden={tab !== 'budget'}><BudgetView game={game} fiscal={fiscal} economy={economy} onApply={onBudgetApply} /></div><p className="dashboard-note">정책지출 + 부채 이자 = 총 정부지출. 세율과 예산의 변경은 다음 달부터 반영됩니다.</p>
  </div>;
}


