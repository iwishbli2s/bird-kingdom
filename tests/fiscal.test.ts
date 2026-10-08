import assert from 'node:assert/strict';
import { test } from 'node:test';
import { advanceMonth, createGame } from './legacyEngine';
import { calculateTaxRevenue, calculateDebtInterestRate, calculateFiscalExpenditure, getTaxIndustryModifiers, updateFiscalState, updateWorldFiscal, validateTaxPolicy } from '../src/game/fiscal';
import { sumBudgetRates } from '../src/game/budget';
import { setControlledTaxPolicy } from '../src/game/taxPolicy';
import { updateWorldEconomy, sumIndustryOutput } from '../src/game/economy';
import { createSeededRandom } from '../src/game/random';
import { selectControlledRuntime } from '../src/game/world';
import type { GameState, TaxPolicy } from '../src/game/types';

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) <= Math.max(1e-8, Math.abs(b) * 1e-12), `${a} != ${b}`);
const maxTax: TaxPolicy = { incomeTaxRate: 40, corporateTaxRate: 35, consumptionTaxRate: 25 };
const zeroTax: TaxPolicy = { incomeTaxRate: 0, corporateTaxRate: 0, consumptionTaxRate: 0 };
const target = (game: GameState) => selectControlledRuntime(game);
function freeze<T>(value: T): T { if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze); } return value; }
const step = (game: GameState) => advanceMonth(game, { eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: () => .5, electionRandom:()=>0, mortalityRandom: () => .99 });

test('모든 정부의 FiscalState 및 초기 국고·부채·세율·지출을 보존', () => {
  const world = createGame('sparrow').world;
  const expected = [[world.countries.sparrow, 220, 560, 15, 20, 8, 17], [world.countries.pigeon, 270, 720, 8, 10, 4, 8],
    [world.regions['pigeon-state'], 88, 170, 7, 8, 4, 7.5], [world.regions['eagle-state'], 70, 150, 7, 8, 4, 7.5],
    [world.regions['owl-state'], 66, 120, 7, 8, 4, 7.5], [world.regions['duck-state'], 52, 90, 7, 8, 4, 7.5]] as const;
  for (const [r, cash, debt, income, corporate, consumption, spending] of expected) {
    assert.equal('treasury' in r.economy, false); assert.equal('debt' in r.economy, false);
    assert.equal(r.fiscal.treasury, cash); assert.equal(r.fiscal.debt, debt);
    assert.deepEqual(r.fiscal.taxPolicy, { incomeTaxRate: income, corporateTaxRate: corporate, consumptionTaxRate: consumption });
    assert.deepEqual(r.fiscal.baselineTaxPolicy, r.fiscal.taxPolicy); near(sumBudgetRates(r.fiscal.budgetPolicy), spending);
  }
});
test('정부·새 게임 간 재정 및 정책 객체를 공유하지 않음', () => {
  const a = createGame('sparrow'); const b = createGame('sparrow');
  const all = [...Object.values(a.world.countries), ...Object.values(a.world.regions)];
  for (const field of ['fiscal'] as const) assert.equal(new Set(all.map(r => r[field])).size, 6);
  assert.equal(new Set(all.map(r => r.fiscal.taxPolicy)).size, 6);
  target(a).fiscal.taxPolicy.incomeTaxRate = 0;
  assert.equal(target(a).fiscal.baselineTaxPolicy.incomeTaxRate, 15); assert.equal(target(b).fiscal.taxPolicy.incomeTaxRate, 15);
});
for (const [name, field, ratio] of [['소득세', 'incomeTax', .55 * .15], ['법인세', 'corporateTax', .18 * .20], ['소비세', 'consumptionTax', .65 * .08]] as const) {
  test(`${name} 월간 계산은 GDP 기반·퍼센트 변환·12개월 분할`, () => near(calculateTaxRevenue(1600, target(createGame('sparrow')).fiscal.taxPolicy)[field], 1600 * ratio / 12));
}
test('세입 총합과 세율 0 및 GDP 0 처리', () => {
  const r = calculateTaxRevenue(1600, maxTax); near(r.total, r.incomeTax + r.corporateTax + r.consumptionTax);
  assert.deepEqual(calculateTaxRevenue(1600, zeroTax), { incomeTax: 0, corporateTax: 0, consumptionTax: 0, total: 0 });
  assert.equal(calculateTaxRevenue(0, maxTax).total, 0);
  assert.equal(calculateTaxRevenue(1600, { ...maxTax, corporateTaxRate: 0 }).corporateTax, 0);
});
test('기본 지출 및 이자와 지출 합계 계산', () => {
  const f = target(createGame('sparrow')).fiscal; const e = calculateFiscalExpenditure(1600, f, 3);
  near(e.programTotal, 1600 * .17 / 12); near(e.interest, 560 * .03 / 12); near(e.total, e.programTotal + e.interest);
  assert.equal(calculateFiscalExpenditure(1600, { ...f, debt: 0 }, 3).interest, 0);
});
test('부채비율 60%까지 3%, 100%에서 6.2%, 단조 증가 및 20% 상한', () => {
  assert.equal(calculateDebtInterestRate(600, 1000), 3); near(calculateDebtInterestRate(1000, 1000), 6.2);
  let previous = 0;
  for (let debt = 0; debt < 20000; debt += 50) { const rate = calculateDebtInterestRate(debt, 1000); assert.ok(rate >= previous && rate <= 20); previous = rate; }
  assert.equal(calculateDebtInterestRate(100, 0), 20); assert.equal(calculateDebtInterestRate(0, 0), 3);
});
test('흑자는 국고에 쌓이고 부채를 자동 상환하지 않음', () => {
  const r = target(createGame('sparrow')); const f = { ...r.fiscal, taxPolicy: maxTax }; const next = updateFiscalState(f, r.economy);
  assert.ok(next.monthlyBalance > 0); near(next.treasury, f.treasury + next.monthlyBalance); assert.equal(next.debt, f.debt);
});
test('적자는 국고 우선 사용, 충분하면 차입하지 않음', () => {
  const r = target(createGame('sparrow')); const next = updateFiscalState(r.fiscal, r.economy);
  assert.ok(next.monthlyBalance < 0); near(next.treasury, r.fiscal.treasury + next.monthlyBalance); assert.equal(next.debt, 560); assert.equal(next.hasIssuedDebt, false);
});
test('국고 부족분만 정확히 차입하고 국고는 0, 이자는 기존 부채 기준', () => {
  const r = target(createGame('sparrow')); const f = { ...r.fiscal, treasury: .1, taxPolicy: zeroTax }; const next = updateFiscalState(f, r.economy);
  assert.equal(next.treasury, 0); near(next.debt - f.debt, -next.monthlyBalance - .1); assert.equal(next.hasIssuedDebt, true);
  near(next.expenditure.interest, f.debt * next.annualInterestRate / 100 / 12);
});
test('국고와 적자가 동일하면 신규 차입 없음', () => {
  const r = target(createGame('sparrow')); const deficit = -r.fiscal.monthlyBalance;
  const next = updateFiscalState({ ...r.fiscal, treasury: deficit }, r.economy); assert.equal(next.treasury, 0); assert.equal(next.debt, 560);
});
for (const mode of ['sparrow', 'eagle'] as const) test(`${mode} 플레이에서 여섯 정부 모두 결산하며 연방 재정은 주 합계와 분리`, () => {
  const game = mode === 'sparrow' ? createGame('sparrow') : createGame('pigeon', 'eagle-state'); const next = step(game);
  for (const kind of ['countries', 'regions'] as const) for (const [id, runtime] of Object.entries(next.world[kind])) {
    assert.notEqual(runtime.fiscal.treasury, game.world[kind][id].fiscal.treasury);
    assert.deepEqual(runtime.fiscal.revenue, calculateTaxRevenue(runtime.economy.gdp, runtime.fiscal.taxPolicy));
    near(runtime.fiscal.monthlyBalance, runtime.fiscal.revenue.total - runtime.fiscal.expenditure.total);
  }
  const federal = next.world.countries.pigeon.fiscal;
  assert.notEqual(federal.treasury, Object.values(next.world.regions).reduce((sum, r) => sum + r.fiscal.treasury, 0));
  assert.notEqual(federal.debt, Object.values(next.world.regions).reduce((sum, r) => sum + r.fiscal.debt, 0));
});
test('재정 계산은 깊게 동결된 입력을 변경하지 않는 결정론적 함수', () => {
  const world = freeze(createGame('sparrow').world); const snapshot = structuredClone(world);
  assert.deepEqual(updateWorldFiscal(world), updateWorldFiscal(world)); assert.deepEqual(world, snapshot);
});
for (const mode of ['sparrow', 'eagle'] as const) test(`${mode} 정책 API는 운영 정부만 변경, 즉시 결산하지 않고 경제 로그 하나`, () => {
  const game = freeze(mode === 'sparrow' ? createGame('sparrow') : createGame('pigeon', 'eagle-state')); const next = setControlledTaxPolicy(game, maxTax);
  assert.deepEqual(target(next).fiscal.taxPolicy, maxTax); assert.deepEqual(target(game).fiscal.taxPolicy, target(game).fiscal.baselineTaxPolicy);
  assert.equal(target(next).fiscal.revenue, target(game).fiscal.revenue); assert.equal(target(next).economy, target(game).economy);
  assert.equal(next.logs.length, game.logs.length + 1); assert.equal(next.logs[0].category, 'economic'); assert.equal(next.turn, game.turn);
  for (const kind of ['countries', 'regions'] as const) for (const [id, r] of Object.entries(game.world[kind])) if (r !== target(game)) assert.equal(next.world[kind][id], r);
});
test('잘못된 세율은 유효성 검사로 거부하며 경계·소수 세율 허용', () => {
  for (const [field, maximum] of [['incomeTaxRate', 40], ['corporateTaxRate', 35], ['consumptionTaxRate', 25]] as const) {
    for (const value of [-1, maximum + 1, NaN, Infinity, -Infinity]) assert.throws(() => setControlledTaxPolicy(createGame('sparrow'), { ...maxTax, [field]: value }), RangeError);
    validateTaxPolicy({ ...zeroTax, [field]: maximum }); validateTaxPolicy({ ...zeroTax, [field]: .5 });
  }
});
test('동일 정책 재적용은 기록 없이 동일 객체 반환', () => { const g = createGame('sparrow'); assert.equal(setControlledTaxPolicy(g, { ...target(g).fiscal.taxPolicy }), g); });
test('사망 후 조세 변경 및 월 진행 차단', () => {
  const dead = advanceMonth(createGame('sparrow'), { eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: () => .5, mortalityRiskOverride: 1, electionRandom:()=>0, mortalityRandom: () => .5 });
  assert.throws(() => setControlledTaxPolicy(dead, maxTax)); assert.equal(step(dead), dead);
});
test('세율 저장 이후 다음 달의 새 GDP로 세입 계산', () => {
  const g = createGame('sparrow'); const changed = setControlledTaxPolicy(g, maxTax); const next = step(changed);
  assert.deepEqual(target(next).fiscal.revenue, calculateTaxRevenue(target(next).economy.gdp, maxTax));
  assert.ok(target(next).fiscal.revenue.total > target(step(g)).fiscal.revenue.total);
});
test('기준 세율에서 modifier 0 및 기존 2A 경제 경로와 동일', () => {
  const g = createGame('sparrow'); for (const r of [...Object.values(g.world.countries), ...Object.values(g.world.regions)]) for (const m of Object.values(getTaxIndustryModifiers(r.fiscal))) assert.equal(m.annualGrowthAdjustment, 0);
  const original = updateWorldEconomy(g.world, { random: () => .5 }); const next = step(g);
  for (const kind of ['countries', 'regions'] as const) for (const id of Object.keys(original[kind])) assert.deepEqual(next.world[kind][id].economy, original[kind][id].economy);
});
test('법인세 ±1%p는 대상 산업 연간 성장에 ∓0.04%p, 농업·서비스 영향 없음', () => {
  const f = target(createGame('sparrow')).fiscal;
  for (const delta of [-1, 1]) { const m = getTaxIndustryModifiers({ ...f, taxPolicy: { ...f.taxPolicy, corporateTaxRate: f.taxPolicy.corporateTaxRate + delta } });
    for (const id of ['manufacturing', 'advanced', 'defense'] as const) near(m[id].annualGrowthAdjustment!, -.0004 * delta);
    assert.equal(m.agriculture.annualGrowthAdjustment, 0); assert.equal(m.services.annualGrowthAdjustment, 0);
  }
});
test('소비세·소득세 modifier는 지정 산업에만 작은 효과', () => {
  const f = target(createGame('sparrow')).fiscal; const m = getTaxIndustryModifiers({ ...f, taxPolicy: { ...f.taxPolicy, incomeTaxRate: 16, consumptionTaxRate: 9 } });
  near(m.services.annualGrowthAdjustment!, -.0003); near(m.manufacturing.annualGrowthAdjustment!, -.0002); near(m.advanced.annualGrowthAdjustment!, -.0001); assert.equal(m.agriculture.annualGrowthAdjustment, 0);
});
test('독수리주 증세는 해당 산업만 약하게 감소시키고 다른 주 경제는 동일', () => {
  const g = createGame('pigeon', 'eagle-state'); const p = { ...target(g).fiscal.taxPolicy, corporateTaxRate: 9 }; const a = step(g); const b = step(setControlledTaxPolicy(g, p));
  for (const id of ['manufacturing', 'advanced', 'defense'] as const) assert.ok(target(b).economy.industries[id].output < target(a).economy.industries[id].output);
  assert.equal(target(a).economy.industries.agriculture.output, target(b).economy.industries.agriculture.output);
  for (const id of ['pigeon-state', 'owl-state', 'duck-state']) assert.deepEqual(a.world.regions[id].economy, b.world.regions[id].economy);
});
test('연방 세율은 이번 단계에서 자체 세입에만 적용', () => {
  const g = createGame('sparrow'); const altered = structuredClone(g); altered.world.countries.pigeon.fiscal.taxPolicy = maxTax;
  const a = step(g); const b = step(altered); assert.deepEqual(a.world.regions, b.world.regions);
  assert.deepEqual(a.world.countries.pigeon.economy, b.world.countries.pigeon.economy); assert.ok(b.world.countries.pigeon.fiscal.revenue.total > a.world.countries.pigeon.fiscal.revenue.total);
});
test('최초 차입만 정부당 한 번 로그, 월별 결산으로 로그 도배하지 않음', () => {
  let g = createGame('sparrow'); for (const r of [...Object.values(g.world.countries), ...Object.values(g.world.regions)]) r.fiscal.treasury = 0;
  g = step(g); const first = g.logs.filter(l => l.category === 'economic'); assert.equal(first.length, 6);
  const count = g.logs.length; g = step(g); assert.equal(g.logs.length, count + 1); assert.equal(g.logs.filter(l => l.category === 'economic').length, 6);
});
test('재정 추가 후 RNG 소비 수·사망 스트림 독립·고정 시드 재현 유지', () => {
  let economic = 0; let mortality = 0; const g = setControlledTaxPolicy(createGame('sparrow'), maxTax);
  advanceMonth(g, { eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: () => { economic++; return .5; }, electionRandom:()=>0, mortalityRandom: () => { mortality++; return .99; } });
  assert.equal(economic, 30); assert.equal(mortality, 1);
  const opts = () => ({ eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: createSeededRandom(42), electionRandom:()=>0, mortalityRandom: () => .99 }); assert.deepEqual(advanceMonth(g, opts()), advanceMonth(g, opts()));
});
for (const months of [120, 600]) test(`${months}개월 세율 0·최대 장기 재정 안정성과 산업·연방 합계`, () => {
  for (const policy of [zeroTax, maxTax]) {
    let g = setControlledTaxPolicy(createGame('sparrow'), policy); const rng = createSeededRandom(2030);
    for (let i = 0; i < months; i++) {
      g = advanceMonth(g, { eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: rng, electionRandom:()=>0, mortalityRandom: () => .99 });
      for (const r of [...Object.values(g.world.countries), ...Object.values(g.world.regions)]) {
        const f = r.fiscal; for (const n of [f.treasury, f.debt, f.monthlyBalance, f.annualInterestRate, ...Object.values(f.revenue), f.expenditure.programTotal, f.expenditure.interest, f.expenditure.total, ...Object.values(f.expenditure.categories)]) assert.ok(Number.isFinite(n));
        assert.ok(f.treasury >= 0 && f.debt >= 0 && f.annualInterestRate <= 20); near(r.economy.gdp, sumIndustryOutput(r.economy.industries));
      }
      near(g.world.countries.pigeon.economy.gdp, Object.values(g.world.regions).reduce((sum, r) => sum + r.economy.gdp, 0));
    }
    assert.equal(g.player.ageMonths, months + 12); assert.equal(g.player.alive, true);
  }
});

