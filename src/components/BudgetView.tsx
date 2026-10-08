import {policyChangeBlock} from '../game/policySchedule';
import {controlledGovernmentId} from '../game/government';
import { useEffect, useState } from 'react';
import { Check, SlidersHorizontal } from 'lucide-react';
import { sumBudgetRates, validateBudgetPolicy } from '../game/budget';
import { budgetCategoryConfig, budgetCategoryIds, budgetConfig } from '../game/budgetConfig';
import { calculateDebtInterestRate, calculateFiscalExpenditure, calculateTaxRevenue } from '../game/fiscal';
import type { BudgetPolicy, EconomyState, FiscalState,GameState } from '../game/types';
import { formatEconomyNumber } from './EconomyMetrics';

export default function BudgetView({ game,fiscal, economy, onApply }: {
  game:GameState;fiscal: FiscalState; economy: EconomyState; onApply: (policy: BudgetPolicy,emergency?:boolean) => void;
}) {
  const government=controlledGovernmentId(game),lock=policyChangeBlock(game,government,'budget'),emergencyLock=policyChangeBlock(game,government,'budget',true);
  const [draft, setDraft] = useState<BudgetPolicy>({ ...fiscal.budgetPolicy });
  const [notice, setNotice] = useState('');
  useEffect(() => { setDraft({ ...fiscal.budgetPolicy }); }, [fiscal.budgetPolicy]);
  const changed = budgetCategoryIds.some(id => draft[id] !== fiscal.budgetPolicy[id]);
  const currentTotal = sumBudgetRates(fiscal.budgetPolicy);
  const draftTotal = sumBudgetRates(draft);
  let validationError = '';
  try { validateBudgetPolicy(draft); } catch (error) { validationError = error instanceof Error ? error.message : '유효하지 않은 예산안입니다.'; }
  const preview = validationError ? null : calculateFiscalExpenditure(economy.gdp, { debt: fiscal.debt, budgetPolicy: draft }, calculateDebtInterestRate(fiscal.debt, economy.gdp));
  const expectedRevenue = calculateTaxRevenue(economy.gdp, fiscal.taxPolicy).total;
  const expectedBalance = preview ? expectedRevenue - preview.total : null;
  const largeDeficit = preview !== null && preview.total > expectedRevenue * budgetConfig.largeDeficitExpenditureRatio;
  return <section className="panel budget-policy-panel">
    <div className="panel-heading"><h2><SlidersHorizontal size={17} /> 예산 편성</h2><span>연간 GDP 대비 비율 · 0.1%p 단위</span></div>
    <p className="panel-description">운영 정부의 8개 분야 예산을 배분하세요. 이자비용은 결산에서 별도로 계산됩니다.</p>
    <div className="budget-summary">
      <div><span>현재 예산 총합</span><strong data-testid="current-budget-total">GDP {currentTotal.toFixed(1)}%</strong></div>
      <div><span>변경안 총합 / 상한 {budgetConfig.maxTotalRate}%</span><strong data-testid="draft-budget-total">GDP {draftTotal.toFixed(1)}%</strong></div>
      <div><span>예상 월 정책지출</span><strong>{preview ? formatEconomyNumber(preview.programTotal) : '—'}<small> 십억 BK</small></strong></div>
      <div className={expectedBalance !== null && expectedBalance < 0 ? 'balance-deficit' : 'balance-surplus'}><span>예상 월간 {expectedBalance === null ? '수지' : expectedBalance < 0 ? '적자' : '흑자'}</span><strong data-testid="budget-preview-balance">{expectedBalance === null ? '—' : `${expectedBalance >= 0 ? '+' : ''}${formatEconomyNumber(expectedBalance)}`}<small> 십억 BK</small></strong></div>
    </div>
    <p className="budget-estimate-note">현재 GDP·저장된 세율·현재 부채 기준 예상치입니다. 다음 달 경제 변화는 포함하지 않습니다.{preview && ` 예상 세입 ${formatEconomyNumber(expectedRevenue)} − 정책지출 ${formatEconomyNumber(preview.programTotal)} − 이자 ${formatEconomyNumber(preview.interest)} = 수지 ${formatEconomyNumber(expectedBalance!)}십억 BK.`}</p>
    <p className="policy-cadence">예산 변경주기: 12개월 · 긴급 수정은 심각한 위기/전쟁 때 가능하며 6개월 대기와 새 12개월 잠금이 적용됩니다.</p>{lock&&<p className="policy-lock" role="status">{lock}</p>}<form onSubmit={event => { event.preventDefault(); if (changed && !validationError&&!lock) { onApply({ ...draft }); setNotice('예산안이 저장되었습니다. 다음 달부터 반영됩니다.'); } }}>
      <div className="budget-row budget-columns" aria-hidden="true"><span>분야</span><span>예산 조정</span><span>현재 비율</span><span>변경 비율</span><span>이번 달 지출</span></div>
      <div className="budget-rows">{budgetCategoryIds.map(id => {
        const config = budgetCategoryConfig[id];
        return <div className="budget-row" key={id} data-category={id}>
          <label className="budget-name" htmlFor={`budget-${id}`}>{config.label}</label>
          <input className="budget-slider" id={`budget-${id}`} aria-label={`${config.label} 예산`} type="range" min={config.min} max={config.max} step={budgetConfig.inputStep} value={draft[id]} onChange={event => { setDraft(current => ({ ...current, [id]: Number(event.target.value) })); setNotice(''); }} />
          <span className="budget-current"><small>현재 </small>{fiscal.budgetPolicy[id].toFixed(1)}%</span>
          <span className="budget-draft"><input aria-label={`${config.label} 예산 변경 비율`} type="number" min={config.min} max={config.max} step={budgetConfig.inputStep} value={draft[id]} onChange={event => { setDraft(current => ({ ...current, [id]: Number(event.target.value) })); setNotice(''); }} /><span>%</span></span>
          <span className="budget-actual"><small>이번 달 </small>{fiscal.expenditure.categories[id].toFixed(2)}<small> 십억 BK</small></span>
        </div>;
      })}</div>
      <p className="budget-estimate-note">이번 달 지출은 마지막 결산 금액입니다. 새 정책을 저장해도 결산은 유지되며 다음 월 진행 시 갱신됩니다.</p>
      {validationError && <p className="budget-warning" role="alert">{validationError}</p>}
      {!validationError && largeDeficit && <p className="budget-warning">이 예산안은 현재 경제 규모 기준으로 큰 재정적자가 예상됩니다. 국고가 소진되면 부족분을 신규 부채로 충당합니다.</p>}
      <div className="tax-actions"><button className="secondary" type="button" disabled={!changed} onClick={() => { setDraft({ ...fiscal.budgetPolicy }); setNotice(''); }}>변경 취소</button><button className="primary" type="submit" title={!changed?'초안을 먼저 조정하세요.':validationError||lock||'다음 달부터 새 예산을 적용합니다.'} disabled={!changed || !!validationError||!!lock}><Check size={16} /> 예산안 적용</button></div>
      {lock&&!emergencyLock&&<button className="secondary" type="button" title={!changed?'초안을 먼저 조정하세요.':validationError||'실제 긴급 예산 규칙을 적용합니다.'} disabled={!changed||!!validationError} onClick={()=>onApply({...draft},true)}>긴급 예산 수정</button>}{lock&&emergencyLock&&<p className="policy-lock">{emergencyLock}</p>}<p className="tax-notice" role="status">{changed ? '변경안은 아직 적용되지 않았습니다.' : notice}</p>
    </form>
  </section>;
}

