import assert from 'node:assert/strict';
import { test } from 'node:test';
import { advanceMonth, createGame } from './legacyEngine';
import { combineIndustryModifiers, getBudgetIndustryModifiers, sumBudgetRates, validateBudgetPolicy } from '../src/game/budget';
import { budgetCategoryConfig, budgetCategoryIds, initialCountryBudgets, initialRegionalBudgets } from '../src/game/budgetConfig';
import { setControlledBudgetPolicy } from '../src/game/budgetPolicy';
import { setControlledTaxPolicy } from '../src/game/taxPolicy';
import { calculateDebtInterestRate, calculateFiscalExpenditure, getTaxIndustryModifiers, updateFiscalState } from '../src/game/fiscal';
import { sumIndustryOutput, updateWorldEconomy } from '../src/game/economy';
import { createSeededRandom } from '../src/game/random';
import { selectControlledRuntime } from '../src/game/world';
import type { BudgetPolicy, GameState } from '../src/game/types';

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) <= Math.max(1e-8, Math.abs(b) * 1e-12), `${a} != ${b}`);
const target = (game: GameState) => selectControlledRuntime(game);
const step = (game: GameState) => advanceMonth(game, { eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: () => .5, electionRandom:()=>0, mortalityRandom: () => .99 });
const zeroBudget = Object.fromEntries(budgetCategoryIds.map(id => [id, 0])) as BudgetPolicy;
const highBudget: BudgetPolicy = { defense: 8, education: 6, healthcare: 5, welfare: 8, security: 4, industrySupport: 4, infrastructure: 5, research: 5 };
function freeze<T>(value: T): T { if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze); } return value; }

test('여섯 정부의 예산·기준예산 및 삭제된 단일지출률·baseSpending', () => {
  const g = createGame('sparrow');
  for (const r of [...Object.values(g.world.countries), ...Object.values(g.world.regions)]) {
    assert.deepEqual(Object.keys(r.fiscal.budgetPolicy), budgetCategoryIds); assert.deepEqual(r.fiscal.budgetPolicy, r.fiscal.baselineBudgetPolicy);
    assert.equal('annualBaseSpendingRate' in r.fiscal, false); assert.equal('baseSpending' in r.fiscal.expenditure, false);
    assert.notEqual(r.fiscal.budgetPolicy, r.fiscal.baselineBudgetPolicy);
  }
});
test('국가 초기 분야별 배분과 합계 17%·8%', () => {
  const g = createGame('sparrow'); const a = g.world.countries.sparrow.fiscal; const b = g.world.countries.pigeon.fiscal;
  assert.deepEqual(Object.values(a.budgetPolicy), [3, 2.5, 2.2, 3, 1.5, 1.4, 1.9, 1.5]);
  assert.deepEqual(Object.values(b.budgetPolicy), [3, .3, .3, .5, .7, .8, 1.4, 1]); near(sumBudgetRates(a.budgetPolicy), 17); near(sumBudgetRates(b.budgetPolicy), 8);
});
for (const [id, values] of Object.entries({ 'pigeon-state': [.2, 1.2, 1, 1.2, 1, .6, 1.3, 1], 'eagle-state': [1, .8, .8, .8, .9, 1.4, 1.2, .6], 'owl-state': [.1, 1.8, 1, .8, .6, .5, .8, 1.9], 'duck-state': [.1, .9, 1.1, 1.2, .8, 1.1, 1.8, .5] })) {
  test(`${id} 지정 초기 배분과 합계 7.5%`, () => { const f = createGame('sparrow').world.regions[id].fiscal; assert.deepEqual(Object.values(f.budgetPolicy), values); near(sumBudgetRates(f.budgetPolicy), 7.5); });
}
test('예산 객체는 정부·기준·설정·새 게임 간 독립', () => {
  const a = createGame('sparrow'); const b = createGame('sparrow'); const all = [...Object.values(a.world.countries), ...Object.values(a.world.regions)];
  assert.equal(new Set(all.map(r => r.fiscal.budgetPolicy)).size, 6); a.world.regions['eagle-state'].fiscal.budgetPolicy.defense = 0;
  assert.equal(initialRegionalBudgets['eagle-state'].defense, 1); assert.equal(b.world.regions['eagle-state'].fiscal.budgetPolicy.defense, 1);
  target(a).fiscal.budgetPolicy.education = 0; assert.equal(initialCountryBudgets['centralized-presidential-republic'].education, 2.5); assert.equal(target(a).fiscal.baselineBudgetPolicy.education, 2.5);
});
test('8개 월 지출·programTotal·총지출·기존 기본지출 보존', () => {
  const g = createGame('sparrow');
  for (const r of [...Object.values(g.world.countries), ...Object.values(g.world.regions)]) {
    const rate = r.id === 'sparrow' ? 17 : r.id === 'pigeon' ? 8 : 7.5; const f = r.fiscal;
    for (const id of budgetCategoryIds) near(f.expenditure.categories[id], r.economy.gdp * f.budgetPolicy[id] / 100 / 12);
    near(f.expenditure.programTotal, Object.values(f.expenditure.categories).reduce((a, b) => a + b, 0)); near(f.expenditure.programTotal, r.economy.gdp * rate / 100 / 12);
    near(f.expenditure.total, f.expenditure.programTotal + f.expenditure.interest); near(f.monthlyBalance, f.revenue.total - f.expenditure.total);
  }
  near(target(g).fiscal.expenditure.categories.education, 1600 * .025 / 12);
});
test('GDP 증가 시 동일 정책으로 실제 지출 증가, 예산 0에서도 이자는 유지', () => {
  const f = target(createGame('sparrow')).fiscal; const a = calculateFiscalExpenditure(1600, f, 3); const b = calculateFiscalExpenditure(3200, f, 3);
  near(b.programTotal, a.programTotal * 2); assert.equal(a.interest, b.interest);
  const z = calculateFiscalExpenditure(1600, { ...f, budgetPolicy: zeroBudget }, 3); assert.equal(z.programTotal, 0); assert.ok(z.interest > 0); assert.equal(z.total, z.interest);
});
for (const mode of ['sparrow', 'eagle'] as const) test(`${mode} API는 운영 정부만 변경하며 기준·원본·결산·날짜 보존`, () => {
  const g = freeze(mode === 'sparrow' ? createGame('sparrow') : createGame('pigeon', 'eagle-state')); const snapshot = structuredClone(g); const p = { ...target(g).fiscal.budgetPolicy, research: 3 }; const next = setControlledBudgetPolicy(g, p);
  assert.deepEqual(g, snapshot); assert.deepEqual(target(next).fiscal.budgetPolicy, p); assert.equal(target(next).fiscal.baselineBudgetPolicy, target(g).fiscal.baselineBudgetPolicy);
  assert.equal(target(next).fiscal.expenditure, target(g).fiscal.expenditure); assert.equal(target(next).fiscal.treasury, target(g).fiscal.treasury); assert.equal(target(next).economy, target(g).economy);
  assert.equal(next.date, g.date); assert.equal(next.turn, g.turn);
  for (const kind of ['countries', 'regions'] as const) for (const [id, r] of Object.entries(g.world[kind])) if (r !== target(g)) assert.equal(next.world[kind][id], r);
  p.research = 0; assert.equal(target(next).fiscal.budgetPolicy.research, 3);
});
test('예산 변경 로그 한 건, 동일안 재적용은 불변', () => {
  const g = createGame('sparrow'); const next = setControlledBudgetPolicy(g, highBudget);
  assert.equal(next.logs.length, g.logs.length + 1); assert.equal(next.logs[0].category, 'economic'); assert.match(next.logs[0].message, /45.0%/);
  assert.equal(setControlledBudgetPolicy(next, { ...highBudget }), next);
});
test('각 항목 범위·누락·비유한값·총합 초과 거부, 0과 경계 허용', () => {
  for (const id of budgetCategoryIds) {
    for (const value of [-.1, budgetCategoryConfig[id].max + .1, NaN, Infinity, -Infinity]) assert.throws(() => setControlledBudgetPolicy(createGame('sparrow'), { ...zeroBudget, [id]: value }), RangeError);
    validateBudgetPolicy({ ...zeroBudget, [id]: budgetCategoryConfig[id].max });
    const missing = { ...zeroBudget }; delete (missing as Partial<BudgetPolicy>)[id]; assert.throws(() => validateBudgetPolicy(missing), RangeError);
  }
  validateBudgetPolicy(highBudget); validateBudgetPolicy(zeroBudget); validateBudgetPolicy({ ...zeroBudget, education: 2.6 });
  assert.throws(() => validateBudgetPolicy({ ...highBudget, welfare: 8.1 }), RangeError);
});
test('사망 후 예산 변경 거부와 월 진행 차단', () => {
  const dead = advanceMonth(createGame('sparrow'), { eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: () => .5, electionRandom:()=>0, mortalityRandom: () => .5, mortalityRiskOverride: 1 });
  assert.throws(() => setControlledBudgetPolicy(dead, highBudget)); assert.equal(step(dead), dead);
});
test('초기 예산 modifier는 성장 0·생산성 1이며 기존 경제 경로와 동일', () => {
  const g = createGame('sparrow'); for (const r of [...Object.values(g.world.countries), ...Object.values(g.world.regions)]) for (const m of Object.values(getBudgetIndustryModifiers(r.fiscal))) assert.deepEqual(m, { annualGrowthAdjustment: 0, productivityMultiplier: 1 });
  const before = updateWorldEconomy(g.world, { random: () => .5 }); const next = step(g); for (const kind of ['countries', 'regions'] as const) for (const id of Object.keys(before[kind])) assert.deepEqual(before[kind][id].economy, next.world[kind][id].economy);
});
for (const category of budgetCategoryIds) test(`${category} ±1%p의 지정 성장·생산성 효과 및 삭감 반대 방향`, () => {
  const f = target(createGame('sparrow')).fiscal;
  const expected = {
    defense: { defense: [.002, 0] }, education: { manufacturing: [0, .1], services: [0, .1], advanced: [0, .1], defense: [0, .1] },
    healthcare: { agriculture: [0, .03], manufacturing: [0, .03], services: [0, .03], advanced: [0, .03], defense: [0, .03] },
    welfare: { services: [.0003, 0], manufacturing: [.0001, 0] }, security: { manufacturing: [0, .02], services: [0, .02] },
    industrySupport: { agriculture: [.0008, 0], manufacturing: [.0015, 0], defense: [.0012, 0], advanced: [.0005, 0] },
    infrastructure: { agriculture: [.0008, 0], manufacturing: [.0012, 0], services: [.001, 0], advanced: [.0005, 0] }, research: { advanced: [.0018, .1], manufacturing: [.0003, 0] },
  }[category] as Record<string, number[]>;
  for (const sign of [-1, 1]) {
    const m = getBudgetIndustryModifiers({ ...f, budgetPolicy: { ...f.budgetPolicy, [category]: f.budgetPolicy[category] + sign } });
    for (const [id, modifier] of Object.entries(m)) { near(modifier.annualGrowthAdjustment!, sign * (expected[id]?.[0] ?? 0)); near(modifier.productivityMultiplier!, 1 + sign * (expected[id]?.[1] ?? 0)); }
  }
});
test('modifier 합산은 성장 합·1 기준 생산성 변화 합, 폭증 상한과 유효성 검사', () => {
  const m = combineIndustryModifiers({ advanced: { annualGrowthAdjustment: .001, productivityMultiplier: 1.1 } }, { advanced: { annualGrowthAdjustment: -.0004, productivityMultiplier: 1.2 } });
  near(m.advanced.annualGrowthAdjustment!, .0006); near(m.advanced.productivityMultiplier!, 1.3);
  assert.equal(combineIndustryModifiers({ advanced: { productivityMultiplier: 100 } }).advanced.productivityMultiplier, 2.5);
  assert.equal(combineIndustryModifiers({ advanced: { productivityMultiplier: 0 } }).advanced.productivityMultiplier, .25);
  assert.throws(() => combineIndustryModifiers({ defense: { annualGrowthAdjustment: NaN } }));
});
test('세금과 예산 modifier가 함께 전달되며 다음 월 경제·재정에 반영', () => {
  const g = createGame('sparrow'); const taxed = setControlledTaxPolicy(g, { ...target(g).fiscal.taxPolicy, corporateTaxRate: 21 });
  const changed = setControlledBudgetPolicy(taxed, { ...target(g).fiscal.budgetPolicy, research: 2.5 }); const f = target(changed).fiscal;
  const modifiers = combineIndustryModifiers(getTaxIndustryModifiers(f), getBudgetIndustryModifiers(f)); near(modifiers.advanced.annualGrowthAdjustment!, .0014); near(modifiers.advanced.productivityMultiplier!, 1.1);
  const next = step(changed); const expected = updateWorldEconomy(changed.world, { random: () => .5, modifiersFor: (kind, id) => { const fiscal = changed.world[kind === 'country' ? 'countries' : 'regions'][id].fiscal; return combineIndustryModifiers(getTaxIndustryModifiers(fiscal), getBudgetIndustryModifiers(fiscal)); } });
  assert.deepEqual(target(next).economy, expected.countries.sparrow.economy); near(target(next).fiscal.expenditure.categories.research, target(next).economy.gdp * .025 / 12);
});
test('확대·삭감은 실제 정책지출 증가·감소, 적자 차입·흑자 국고와 이자 유지', () => {
  const r = target(createGame('sparrow')); const baseline = updateFiscalState(r.fiscal, r.economy);
  const high = updateFiscalState({ ...r.fiscal, budgetPolicy: highBudget, treasury: 1 }, r.economy); const low = updateFiscalState({ ...r.fiscal, budgetPolicy: zeroBudget }, r.economy);
  assert.ok(high.expenditure.programTotal > baseline.expenditure.programTotal && low.expenditure.programTotal < baseline.expenditure.programTotal);
  assert.equal(high.treasury, 0); assert.ok(high.debt > r.fiscal.debt); assert.ok(low.treasury > r.fiscal.treasury); assert.equal(low.debt, r.fiscal.debt);
  assert.equal(high.expenditure.interest, baseline.expenditure.interest); assert.equal(low.expenditure.interest, baseline.expenditure.interest);
});
test('고지출의 첫 달 성장 효과는 완만하고 추가 세입보다 지출 비용이 큼', () => {
  const g = createGame('sparrow'); const normal = step(g); const high = step(setControlledBudgetPolicy(g, highBudget));
  const n = target(normal); const h = target(high);
  assert.ok(h.economy.gdp / n.economy.gdp < 1.01);
  assert.ok(h.fiscal.expenditure.programTotal - n.fiscal.expenditure.programTotal > h.fiscal.revenue.total - n.fiscal.revenue.total);
});
test('여섯 정부가 자체 예산으로 매월 결산, 비플레이어 정책은 유지', () => {
  const g = createGame('pigeon', 'eagle-state'); const next = step(setControlledBudgetPolicy(g, highBudget));
  for (const kind of ['countries', 'regions'] as const) for (const [id, r] of Object.entries(next.world[kind])) {
    near(r.fiscal.expenditure.programTotal, r.economy.gdp * sumBudgetRates(r.fiscal.budgetPolicy) / 100 / 12);
    assert.notEqual(r.fiscal.treasury, g.world[kind][id].fiscal.treasury); if (id !== 'eagle-state') assert.deepEqual(r.fiscal.budgetPolicy, g.world[kind][id].fiscal.budgetPolicy);
  }
});
test('주 예산은 해당 주 경제에만 적용, 연방 예산·다른 주 독립', () => {
  const g = createGame('pigeon', 'eagle-state'); const a = step(g); const b = step(setControlledBudgetPolicy(g, { ...target(g).fiscal.budgetPolicy, defense: 3 }));
  assert.ok(target(b).economy.industries.defense.output > target(a).economy.industries.defense.output);
  for (const id of ['pigeon-state', 'owl-state', 'duck-state']) assert.deepEqual(a.world.regions[id], b.world.regions[id]);
  assert.deepEqual(a.world.countries.sparrow, b.world.countries.sparrow); assert.deepEqual(a.world.countries.pigeon.fiscal.budgetPolicy, b.world.countries.pigeon.fiscal.budgetPolicy);
});
test('공화국 예산은 자체 경제에 적용하고 연방 예산은 결산에만 사용', () => {
  const g = createGame('sparrow'); const normal = step(g); const increased = step(setControlledBudgetPolicy(g, { ...target(g).fiscal.budgetPolicy, defense: 5 })); assert.ok(target(increased).economy.industries.defense.output > target(normal).economy.industries.defense.output);
  const federal = structuredClone(g); federal.world.countries.pigeon.fiscal.budgetPolicy = highBudget; const altered = step(federal);
  assert.deepEqual(altered.world.regions, normal.world.regions); assert.deepEqual(altered.world.countries.pigeon.economy, normal.world.countries.pigeon.economy); assert.ok(altered.world.countries.pigeon.fiscal.expenditure.total > normal.world.countries.pigeon.fiscal.expenditure.total);
});
test('예산은 사회·거버넌스를 통해 반영되며 개인 사망 RNG는 유지', () => {
  const g = createGame('sparrow'); const changed = setControlledBudgetPolicy(g, highBudget); let economyCalls = 0; let deathCalls = 0;
  const next = advanceMonth(changed, { eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: () => { economyCalls++; return .5; }, electionRandom:()=>0, mortalityRandom: () => { deathCalls++; return .99; } });
  const normal = step(g); assert.deepEqual({...next.player,career:undefined}, {...normal.player,career:undefined}); assert.equal(economyCalls, 30); assert.equal(deathCalls, 1);
  assert.notDeepEqual(next.world.countries.sparrow.governance,g.world.countries.sparrow.governance); assert.notDeepEqual(next.world.countries.sparrow.governance,normal.world.countries.sparrow.governance); assert.equal('governance' in next.world.countries.pigeon,false);
});
test('예산 결산은 월별 분야 로그를 만들지 않고 고정 RNG 재현 유지', () => {
  const g = setControlledBudgetPolicy(createGame('sparrow'), highBudget); const opts = () => ({ eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: createSeededRandom(42), electionRandom:()=>0, mortalityRandom: () => .99 });
  const a = advanceMonth(g, opts()); assert.deepEqual(a, advanceMonth(g, opts())); assert.equal(a.logs.length, g.logs.length + 1);
});
for (const [name, policy, months] of [['정상 예산', null, 600], ['고지출 예산', highBudget, 120]] as const) test(`${name} ${months}개월 유한값·GDP 합계·연방 집계·부채 안정성과 재정 위험`, () => {
  let g = createGame('sparrow'); if (policy) g = setControlledBudgetPolicy(g, policy); const rng = createSeededRandom(2030);
  for (let month = 0; month < months; month++) {
    g = advanceMonth(g, { eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: rng, electionRandom:()=>0, mortalityRandom: () => .99 });
    for (const r of [...Object.values(g.world.countries), ...Object.values(g.world.regions)]) {
      const f = r.fiscal; for (const n of [r.economy.gdp, f.treasury, f.debt, f.annualInterestRate, f.expenditure.programTotal, f.expenditure.interest, f.expenditure.total, ...Object.values(f.expenditure.categories)]) assert.ok(Number.isFinite(n));
      assert.ok(f.treasury >= 0 && f.debt >= 0); near(r.economy.gdp, sumIndustryOutput(r.economy.industries)); near(f.expenditure.total, f.expenditure.programTotal + f.expenditure.interest);
    }
    near(g.world.countries.pigeon.economy.gdp, Object.values(g.world.regions).reduce((sum, r) => sum + r.economy.gdp, 0));
  }
  if (policy) { const f = target(g).fiscal; assert.ok(f.monthlyBalance < 0); assert.equal(f.treasury, 0); assert.ok(f.debt > 560); assert.ok(f.annualInterestRate > 3); assert.ok(calculateDebtInterestRate(f.debt, target(g).economy.gdp) > 3); }
  assert.equal(g.player.alive, true);
});

