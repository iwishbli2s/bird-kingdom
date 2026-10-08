import assert from 'node:assert/strict';
import { test } from 'node:test';
import { advanceMonth, createGame } from './legacyEngine';
import { aggregateFederationPopulation, calculateBirthRate, calculateDeathRate, calculateMigrationRate, createInitialPopulation, populationChange, speciesShare, updatePopulation, updateWorldPopulation } from '../src/game/population';
import { initialPopulationProfiles, speciesDefinitions } from '../src/game/populationConfig';
import { createSeededRandom } from '../src/game/random';
import { selectControlledRuntime } from '../src/game/world';
import type { PopulationState, WorldState } from '../src/game/types';

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const definition = speciesDefinitions[0];
const runtime = () => selectControlledRuntime(createGame('sparrow'));
const neutral = { growth: 2, unemployment: 5 };
function freeze<T>(value: T): T { if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze); } return value; }
function verifyPopulation(p: PopulationState) {
  const entries = Object.values(p.species);
  assert.equal(p.total, entries.reduce((sum, s) => sum + s.population, 0));
  assert.equal(p.birthsLastMonth, entries.reduce((sum, s) => sum + s.birthsLastMonth, 0));
  assert.equal(p.deathsLastMonth, entries.reduce((sum, s) => sum + s.deathsLastMonth, 0));
  assert.equal(p.netMigrationLastMonth, entries.reduce((sum, s) => sum + s.migrationLastMonth, 0));
  for (const s of entries) {
    assert.ok(Number.isSafeInteger(s.population) && s.population >= 0);
    for (const n of Object.values(s).filter(v => typeof v === 'number')) assert.ok(Number.isFinite(n));
    assert.ok(s.migrationRate >= -2 && s.migrationRate <= 2);
  }
  if (p.total > 0) near(entries.reduce((sum, s) => sum + speciesShare(s, p), 0), 100);
}
function verifyWorld(w: WorldState) {
  for (const r of [...Object.values(w.countries), ...Object.values(w.regions)]) verifyPopulation(r.population);
  assert.deepEqual(w.countries.pigeon.population, aggregateFederationPopulation(Object.values(w.regions).filter(r => r.ownerCountryId === 'pigeon').map(r => r.population)));
}

test('종족 정의 8개의 연간 비율·민감도·이름·코드는 지정값', () => {
  assert.equal(speciesDefinitions.length, 8);
  assert.deepEqual(speciesDefinitions.map(d => [d.baseAnnualBirthRate, d.baseAnnualDeathRate, d.baseAnnualMigrationRate, d.economicSensitivity]), [[1.8, 1, 0, 1], [1.3, .8, .1, .8], [1.6, .9, .2, 1.2], [1.5, .9, .1, 1], [1.7, 1, .1, 1], [1.1, .7, -.1, .7], [1.2, .7, .1, .8], [1.8, 1, 0, 1]]);
  assert.equal(new Set(speciesDefinitions.map(d => d.id)).size, 8);
});
for (const [id, profile, total] of [
  ['sparrow', { sparrow: 26400000, crow: 8640000, swallow: 7200000, magpie: 5760000 }, 48000000],
  ['pigeon-state', { pigeon: 12600000, eagle: 900000, owl: 1800000, duck: 2700000 }, 18000000],
  ['eagle-state', { eagle: 8450000, pigeon: 1950000, owl: 1300000, duck: 1300000 }, 13000000],
  ['owl-state', { owl: 6000000, pigeon: 2000000, eagle: 500000, duck: 1500000 }, 10000000],
  ['duck-state', { duck: 7700000, pigeon: 1650000, eagle: 550000, owl: 1100000 }, 11000000],
] as const) test(`${id} 초기 종족 인구·총합·월 흐름0`, () => {
  const w = createGame('sparrow').world; const p = id === 'sparrow' ? w.countries.sparrow.population : w.regions[id].population;
  assert.equal(p.total, total); assert.deepEqual(Object.fromEntries(Object.entries(p.species).map(([id, s]) => [id, s.population])), profile);
  assert.equal(populationChange(p), 0); verifyPopulation(p);
});
test('연방 초기 총52M·종족별 집계는 네 주 합계이며 별도 객체', () => {
  const w = createGame('sparrow').world; const p = w.countries.pigeon.population;
  assert.equal(p.total, 52000000);
  assert.deepEqual(Object.fromEntries(Object.entries(p.species).map(([id, s]) => [id, s.population])), { pigeon: 18200000, eagle: 10400000, owl: 10200000, duck: 13200000 });
  for (const r of Object.values(w.regions)) assert.notEqual(p.species.pigeon, r.population.species.pigeon);
  verifyWorld(w);
});
test('초기 인구와 정적 정의는 정부·게임 간 공유되지 않음', () => {
  const a = createGame('sparrow'); const b = createGame('sparrow'); a.world.regions['eagle-state'].population.species.eagle!.population = 0;
  assert.equal(b.world.regions['eagle-state'].population.species.eagle!.population, 8450000); assert.equal(a.world.countries.pigeon.population.total, 52000000);
  assert.equal(initialPopulationProfiles['eagle-state'].eagle, 8450000);
});
test('중립 경제에서 출생·사망·이동 연율/12 반올림과 인구 증감 정확', () => {
  const r = runtime(); const p = createInitialPopulation({ sparrow: 120000 }); const next = updatePopulation(p, neutral, r.fiscal); const s = next.species.sparrow!;
  assert.equal(s.birthRate, 1.8); assert.equal(s.deathRate, 1); assert.equal(s.migrationRate, 0);
  assert.equal(s.birthsLastMonth, 180); assert.equal(s.deathsLastMonth, 100); assert.equal(s.migrationLastMonth, 0); assert.equal(s.population, 120080);
  assert.equal(next.total - p.total, populationChange(next));
});
test('기본 양·음 순이동 기록과 인구 회계가 일치', () => {
  const r = runtime(); const p = createInitialPopulation({ swallow: 120000, eagle: 120000 }); const next = updatePopulation(p, neutral, r.fiscal);
  assert.equal(next.species.swallow!.migrationLastMonth, 20); assert.equal(next.species.eagle!.migrationLastMonth, -10);
  assert.equal(next.total - p.total, populationChange(next)); verifyPopulation(next);
});
test('작은 인구의 정수 반올림·0 인구·빈 인구에서 음수·비유한값 없음', () => {
  const r = runtime();
  for (const n of [0, 1, 2, 17]) { const p = createInitialPopulation({ sparrow: n }); const next = updatePopulation(p, { growth: -100, unemployment: 100 }, r.fiscal); verifyPopulation(next); assert.equal(next.total - p.total, populationChange(next)); }
  const empty = createInitialPopulation({}); assert.deepEqual(updatePopulation(empty, neutral, r.fiscal), empty); assert.equal(speciesShare(createInitialPopulation({ sparrow: 0 }).species.sparrow!, empty), 0);
  assert.throws(() => createInitialPopulation({ sparrow: -1 })); assert.throws(() => createInitialPopulation({ sparrow: 1.5 }));
});
test('월 진행은 현재 구성만 갱신하며 없는 종족을 생성하지 않음', () => {
  const r = runtime(); const next = updatePopulation(r.population, neutral, r.fiscal);
  assert.deepEqual(Object.keys(next.species), Object.keys(r.population.species)); assert.equal(next.species.pigeon, undefined);
  assert.equal('share' in next.species.sparrow!, false);
});
test('인구·세계 함수는 동결된 입력과 정적 정의를 변경하지 않고 결정론적', () => {
  const w = freeze(createGame('sparrow').world); const snapshot = structuredClone(w); const next = updateWorldPopulation(w);
  assert.deepEqual(w, snapshot); assert.deepEqual(next, updateWorldPopulation(w)); assert.notEqual(next.countries.sparrow.population.species.sparrow, w.countries.sparrow.population.species.sparrow);
});
test('호황·저실업은 출생 보정 상승, 침체·고실업은 감소', () => {
  const f = runtime().fiscal; assert.ok(calculateBirthRate(definition, { growth: 6, unemployment: 2 }, f) > definition.baseAnnualBirthRate);
  assert.ok(calculateBirthRate(definition, { growth: -5, unemployment: 20 }, f) < definition.baseAnnualBirthRate);
});
test('경제 출생 배율은 극단 조건에서도0.85~1.10', () => {
  const f = runtime().fiscal;
  for (const d of speciesDefinitions) for (const economic of [{ growth: -10000, unemployment: 10000 }, { growth: 10000, unemployment: -10000 }]) {
    const ratio = calculateBirthRate(d, economic, f) / d.baseAnnualBirthRate; assert.ok(ratio >= .85 - 1e-12 && ratio <= 1.10 + 1e-12);
  }
});
test('성장과 실업이 순이동에 반영되고 -2~+2% 상한 유지', () => {
  assert.ok(calculateMigrationRate(definition, { growth: 4, unemployment: 2 }) > calculateMigrationRate(definition, { growth: 4, unemployment: 12 }));
  assert.ok(calculateMigrationRate(definition, { growth: 5, unemployment: 5 }) > calculateMigrationRate(definition, { growth: -5, unemployment: 5 }));
  assert.equal(calculateMigrationRate(definition, { growth: -1000, unemployment: 1000 }), -2); assert.equal(calculateMigrationRate(definition, { growth: 1000, unemployment: -1000 }), 2);
});
test('민감도 차이가 실제 순이동 반응의 차이로 나타남', () => {
  const e = { growth: 0, unemployment: 8 }; const high = { ...definition, economicSensitivity: 1.2 }; const low = { ...definition, economicSensitivity: .7 };
  assert.ok(Math.abs(calculateMigrationRate(high, e)) > Math.abs(calculateMigrationRate(low, e)));
});
test('보건수준50은 중립이고 +10포인트 자연사망률은 상대1% 감소', () => {
  assert.equal(calculateDeathRate(definition, { healthcare: 50 }), 1);
  near(calculateDeathRate(definition, { healthcare: 60 }), .99);
  near(calculateDeathRate(definition, { healthcare: 40 }), 1.01);
});
test('복지 기준은 중립이고 +1%p 출생률은 상대1% 증가', () => {
  const f = runtime().fiscal; near(calculateBirthRate(definition, neutral, f), 1.8);
  near(calculateBirthRate(definition, neutral, { ...f, budgetPolicy: { ...f.budgetPolicy, welfare: f.budgetPolicy.welfare + 1 } }), 1.818);
});
test('예산 보정은 최대±10%로 작게 제한, 교육은 인구 직접효과 없음', () => {
  const f = runtime().fiscal; const education = { ...f, budgetPolicy: { ...f.budgetPolicy, education: 8 } };
  assert.equal(calculateBirthRate(definition, neutral, education), calculateBirthRate(definition, neutral, f)); const r = runtime(); assert.deepEqual(updatePopulation(r.population, neutral, education, r.social), updatePopulation(r.population, neutral, f, r.social));
  for (const extreme of [-1000, 1000]) { const changed = { ...f, budgetPolicy: { ...f.budgetPolicy, healthcare: extreme, welfare: extreme } }; const b = calculateBirthRate(definition, neutral, changed) / 1.8; const d = calculateDeathRate(definition, { healthcare: extreme }); assert.ok(b >= .9 && b <= 1.1 + 1e-12 && d >= .9 && d <= 1.1); }
});
for (const mode of ['sparrow', 'eagle'] as const) test(`${mode} 플레이에서도 모든 독립 인구주체 및 연방 집계 갱신`, () => {
  const g = mode === 'sparrow' ? createGame('sparrow') : createGame('pigeon', 'eagle-state'); const next = advanceMonth(g, { eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: () => .5, electionRandom:()=>0, mortalityRandom: () => .99 });
  assert.notEqual(next.world.countries.sparrow.population.total, g.world.countries.sparrow.population.total);
  for (const id of Object.keys(g.world.regions)) assert.notEqual(next.world.regions[id].population.total, g.world.regions[id].population.total);
  verifyWorld(next.world);
});
test('연방은 별도 계산 없이 종족·월 흐름·가중 연율을 집계', () => {
  const a = createInitialPopulation({ pigeon: 100 }); const b = createInitialPopulation({ pigeon: 300 }); a.species.pigeon!.birthRate = 1; b.species.pigeon!.birthRate = 2;
  const result = aggregateFederationPopulation([a, b]); assert.equal(result.total, 400); near(result.species.pigeon!.birthRate, 1.75);
  verifyPopulation(aggregateFederationPopulation([])); verifyPopulation(aggregateFederationPopulation([createInitialPopulation({ pigeon: 0 })]));
});
test('ownerCountryId로 인구 집계 대상을 결정', () => {
  const w = createGame('sparrow').world; w.countries.other = { ...w.countries.pigeon, id: 'other' }; for (const r of Object.values(w.regions)) r.ownerCountryId = 'other';
  const next = updateWorldPopulation(w); assert.equal(next.countries.other.population.total, Object.values(next.regions).reduce((sum, r) => sum + r.population.total, 0));
});
test('새 경제 결과로 인구 계산, 경제·재정·개인 사망에 인구 역효과 없음', () => {
  const g = createGame('sparrow'); const next = advanceMonth(g, { eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: () => .5, electionRandom:()=>0, mortalityRandom: () => .99 });
  const r = next.world.countries.sparrow; assert.deepEqual(r.population, updatePopulation(g.world.countries.sparrow.population, r.economy, r.fiscal, g.world.countries.sparrow.social));
  const altered = structuredClone(g); altered.world.countries.sparrow.population = createInitialPopulation({ sparrow: 1 });
  const other = advanceMonth(altered, { eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: () => .5, electionRandom:()=>0, mortalityRandom: () => .99 });
  assert.deepEqual(r.economy, other.world.countries.sparrow.economy); assert.deepEqual(r.fiscal, other.world.countries.sparrow.fiscal); assert.deepEqual({...next.player,career:undefined}, {...other.player,career:undefined});
  assert.notDeepEqual(r.governance, g.world.countries.sparrow.governance);
});
test('인구 계산은 RNG를 소비하지 않고 월 로그를 추가하지 않음', () => {
  let economic = 0; let death = 0; const g = createGame('sparrow'); const next = advanceMonth(g, { eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: () => { economic++; return .5; }, electionRandom:()=>0, mortalityRandom: () => { death++; return .99; } });
  assert.equal(economic, 30); assert.equal(death, 1); assert.equal(next.logs.length, 2);
  const opts = () => ({ eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: createSeededRandom(22), electionRandom:()=>0, mortalityRandom: () => .99 }); assert.deepEqual(advanceMonth(g, opts()), advanceMonth(g, opts()));
});
test('사망 월 인구 계산을 완료하며 사망 후 월 진행 차단', () => {
  const g = createGame('sparrow'); const dead = advanceMonth(g, { eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: () => .5, electionRandom:()=>0, mortalityRandom: () => .5, mortalityRiskOverride: 1 });
  assert.notEqual(dead.world.countries.sparrow.population.total, g.world.countries.sparrow.population.total); assert.equal(dead.player.alive, false); assert.equal(advanceMonth(dead), dead);
});
test('600개월 정상 세계의 인구 정수·비율·합계·연방 집계와 완만한 성장', () => {
  let g = createGame('sparrow'); const rng = createSeededRandom(2030); const initial = g.world;
  for (let month = 0; month < 600; month++) { const previous = g; g = advanceMonth(g, { eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: rng, electionRandom:()=>0, mortalityRandom: () => .99 }); verifyWorld(g.world);
    for (const kind of ['countries', 'regions'] as const) for (const id of Object.keys(g.world[kind])) { const p = g.world[kind][id].population; assert.equal(p.total - previous.world[kind][id].population.total, populationChange(p)); }
  }
  for (const kind of ['countries', 'regions'] as const) for (const id of Object.keys(g.world[kind])) assert.ok(g.world[kind][id].population.total < initial[kind][id].population.total * 3);
});
test('120개월 고정 침체·고실업은 순유출과 안정적인 인구 감소', () => {
  const r = runtime(); let p = r.population;
  for (let month = 0; month < 120; month++) { p = updatePopulation(p, { growth: -5, unemployment: 25 }, r.fiscal); verifyPopulation(p); assert.ok(p.netMigrationLastMonth < 0); }
  assert.ok(p.total < r.population.total);
});
