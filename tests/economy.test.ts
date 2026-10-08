import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aggregateFederationEconomy, annualizedGrowth, annualToMonthlyRate, createInitialEconomy, sumIndustryOutput, updateEconomy, updateWorldEconomy } from '../src/game/economy';
import { economyConfig, industryIds, initialEconomyProfiles } from '../src/game/economyConfig';
import { advanceMonth, createGame } from './legacyEngine';
import { createSeededRandom } from '../src/game/random';
import { createInitialWorldState } from '../src/game/world';
import type { EconomyState, WorldState } from '../src/game/types';

const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) <= Math.max(1e-8, Math.abs(expected) * 1e-12), `${actual} != ${expected}`);
const members = (world: WorldState) => Object.values(world.regions).filter(region => region.ownerCountryId === 'pigeon').map(region => region.economy);
function verify(world: WorldState): void {
  for (const runtime of [...Object.values(world.countries), ...Object.values(world.regions)]) {
    const e = runtime.economy;
    for (const value of [e.gdp, e.growth, e.unemployment, e.inflation, runtime.fiscal.treasury, runtime.fiscal.debt, e.cycle]) assert.ok(Number.isFinite(value));
    assert.ok(e.gdp >= 0);
    assert.ok(e.cycle >= -1 && e.cycle <= 1);
    assert.ok(e.unemployment >= economyConfig.unemploymentMin && e.unemployment <= economyConfig.unemploymentMax);
    assert.ok(e.inflation >= economyConfig.inflationMin && e.inflation <= economyConfig.inflationMax);
    near(e.gdp, sumIndustryOutput(e.industries));
    for (const industry of Object.values(e.industries)) {
      assert.ok(Number.isFinite(industry.output) && industry.output >= 0);
      assert.ok(Number.isFinite(industry.productivity) && industry.productivity > 0);
    }
  }
  near(world.countries.pigeon.economy.gdp, members(world).reduce((sum, e) => sum + e.gdp, 0));
}
function freezeDeep<T>(value: T): T {
  if (value && typeof value === 'object') { Object.freeze(value); for (const child of Object.values(value)) freezeDeep(child); }
  return value;
}

test('지정된 초기 GDP와 재정·성장·고용·물가 및 서로 다른 지역 규모', () => {
  const world = createInitialWorldState();
  assert.equal(world.countries.sparrow.economy.gdp, 1600);
  assert.equal(new Set(Object.values(world.regions).map(region => region.economy.gdp)).size, 4);
  for (const [id, profile] of Object.entries(initialEconomyProfiles)) {
    const e = id === 'sparrow' ? world.countries[id].economy : world.regions[id].economy;
    for (const key of ['gdp', 'growth', 'unemployment', 'inflation'] as const) near(e[key], profile[key]);
  }
});
test('산업 생산 합계와 초기 산업 비중 및 생산성 100', () => {
  const world = createInitialWorldState();
  verify(world);
  for (const [id, profile] of Object.entries(initialEconomyProfiles)) {
    const e = id === 'sparrow' ? world.countries[id].economy : world.regions[id].economy;
    near(industryIds.reduce((sum, industry) => sum + e.industries[industry].output / e.gdp, 0), 1);
    for (const industry of industryIds) { near(e.industries[industry].output, profile.gdp * profile.shares[industry]); assert.equal(e.industries[industry].productivity, 100); }
  }
});
test('독수리주의 군수·제조 및 각 주의 고유 산업구조', () => {
  const world = createInitialWorldState();
  near(world.regions['eagle-state'].economy.industries.defense.output / 520, .30);
  near(world.regions['eagle-state'].economy.industries.manufacturing.output / 520, .31);
  near(world.regions['owl-state'].economy.industries.advanced.output / 430, .46);
  near(world.regions['duck-state'].economy.industries.agriculture.output / 330, .42);
});
test('참새 플레이 시에도 네 주 경제와 산업 생산이 모두 변화', () => {
  const game = createGame('sparrow');
  const next = advanceMonth(game, { eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: () => .5, electionRandom:()=>0, mortalityRandom: () => .99 });
  for (const region of Object.values(game.world.regions)) {
    assert.notEqual(next.world.regions[region.id].economy.gdp, region.economy.gdp);
    assert.notDeepEqual(next.world.regions[region.id].economy.industries, region.economy.industries);
  }
  assert.notEqual(next.world.countries.sparrow.economy.gdp, game.world.countries.sparrow.economy.gdp);
});
test('독수리주 플레이 시에도 공화국과 나머지 세 주가 계산', () => {
  const game = createGame('pigeon', 'eagle-state');
  const next = advanceMonth(game, { eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: () => .5, electionRandom:()=>0, mortalityRandom: () => .99 });
  assert.notEqual(next.world.countries.sparrow.economy.gdp, game.world.countries.sparrow.economy.gdp);
  for (const id of Object.keys(game.world.regions)) assert.notEqual(next.world.regions[id].economy.gdp, game.world.regions[id].economy.gdp);
});
test('월 계산의 연방 GDP 및 GDP 가중 실업·물가', () => {
  const next = updateWorldEconomy(createInitialWorldState(), { random: () => .9 });
  const federation = next.countries.pigeon.economy;
  const states = members(next);
  near(federation.gdp, states.reduce((sum, e) => sum + e.gdp, 0));
  for (const key of ['unemployment', 'inflation'] as const) near(federation[key], states.reduce((sum, e) => sum + e[key] * e.gdp, 0) / federation.gdp);
});
test('연방 초기 성장률은 GDP 가중평균, 이후 합산 GDP 변화로 연율화', () => {
  const world = createInitialWorldState();
  near(world.countries.pigeon.economy.growth, members(world).reduce((sum, e) => sum + e.growth * e.gdp, 0) / 1900);
  const next = updateWorldEconomy(world, { random: () => .5 });
  near(next.countries.pigeon.economy.growth, annualizedGrowth(next.countries.pigeon.economy.gdp, 1900));
});
test('연방 국고·부채는 주 재정 합계와 분리되고 모두 유지', () => {
  const world = createInitialWorldState();
  const next = updateWorldEconomy(world, { random: () => .5 });
  assert.equal(next.countries.pigeon.fiscal.treasury, 270);
  assert.equal(next.countries.pigeon.fiscal.debt, 720);
  assert.notEqual(270, Object.values(next.regions).reduce((sum, r) => sum + r.fiscal.treasury, 0));
  for (const id of Object.keys(world.regions)) {
    assert.equal(next.regions[id].fiscal.treasury, world.regions[id].fiscal.treasury);
    assert.equal(next.regions[id].fiscal.debt, world.regions[id].fiscal.debt);
  }
});
test('연방을 이중 시뮬레이션하지 않고 다섯 주체만 난수 소비', () => {
  let calls = 0;
  updateWorldEconomy(createInitialWorldState(), { random: () => { calls++; return .5; } });
  assert.equal(calls, 5 * 6);
});
test('고정 경제 RNG는 재현 가능하고 플레이 대상에 독립적', () => {
  const republic = advanceMonth(createGame('sparrow'), { eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: createSeededRandom(42), electionRandom:()=>0, mortalityRandom: () => .99 });
  const eagle = advanceMonth(createGame('pigeon', 'eagle-state'), { eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: createSeededRandom(42), electionRandom:()=>0, mortalityRandom: () => .99 });
  assert.deepEqual(republic.world, eagle.world);
  assert.deepEqual(updateWorldEconomy(createInitialWorldState(), { random: createSeededRandom(123) }), updateWorldEconomy(createInitialWorldState(), { random: createSeededRandom(123) }));
});
test('경제 RNG 소비 및 결과는 사망 판정 스트림에 영향을 주지 않는다', () => {
  let mortalityCalls = 0;
  const first = advanceMonth(createGame('sparrow'), { eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: () => 0, electionRandom:()=>0, mortalityRandom: () => { mortalityCalls++; return .49; }, mortalityRiskOverride: .5 });
  const second = advanceMonth(createGame('sparrow'), { eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: () => .999999, electionRandom:()=>0, mortalityRandom: () => { mortalityCalls++; return .49; }, mortalityRiskOverride: .5 });
  assert.equal(first.player.alive, false);
  assert.deepEqual({...first.player,career:undefined}, {...second.player,career:undefined});
  assert.equal(mortalityCalls, 2);
  assert.notDeepEqual(first.world, second.world);
});
test('기존 random API는 사망용으로만 사용되고 기본 경제 RNG와 분리', () => {
  let calls = 0;
  const result = advanceMonth(createGame('sparrow'), { random: () => { calls++; return .49; }, mortalityRiskOverride: .5 });
  assert.equal(calls, 1);
  assert.equal(result.player.alive, false);
});
test('입력 세계·산업·설정 불변성 및 새 산업 객체 생성', () => {
  const world = freezeDeep(createInitialWorldState());
  const snapshot = structuredClone(world);
  const next = updateWorldEconomy(world, { random: () => .5 });
  assert.deepEqual(world, snapshot);
  assert.notEqual(next.regions['eagle-state'].economy.industries, world.regions['eagle-state'].economy.industries);
  assert.equal(next.regions['eagle-state'].governance, world.regions['eagle-state'].governance);
});
test('연간→월간 복리 및 GDP 성장 연율화가 일관됨', () => {
  near(Math.pow(1 + annualToMonthlyRate(.024), 12) - 1, .024);
  const e = createInitialEconomy(initialEconomyProfiles.sparrow);
  const next = updateEconomy(e, { random: () => .5 });
  near(next.growth, (Math.pow(next.gdp / e.gdp, 12) - 1) * 100);
});
test('경기순환에 관성이 있고 작은 충격 및 안전 범위 유지', () => {
  const e = createInitialEconomy(initialEconomyProfiles.sparrow);
  e.cycle = .8;
  const next = updateEconomy(e, { random: () => .5 });
  near(next.cycle, .8 * .85);
  assert.ok(next.cycle > 0);
  assert.ok(Math.abs(updateEconomy(e, { random: () => 0 }).cycle - e.cycle) < .3);
});
test('침체는 성장·고용·물가를 낮추고 호황은 반대 압력', () => {
  const e = createInitialEconomy(initialEconomyProfiles.sparrow);
  const recession = updateEconomy({ ...e, cycle: -1 }, { random: () => 0 });
  const boom = updateEconomy({ ...e, cycle: 1 }, { random: () => .999999 });
  assert.ok(recession.growth < 0 && boom.growth > 0);
  assert.ok(recession.unemployment > e.unemployment && boom.unemployment < e.unemployment);
  assert.ok(recession.inflation < boom.inflation);
  for (const next of [recession, boom]) {
    assert.ok(Math.abs(next.unemployment - e.unemployment) <= .120001);
    assert.ok(Math.abs(next.inflation - e.inflation) <= .150001);
  }
});
test('생산성은 안정적으로 증가하며 첨단산업이 더 빠름', () => {
  const e = createInitialEconomy(initialEconomyProfiles.sparrow);
  const next = updateEconomy(e, { random: () => .5 });
  for (const id of industryIds) assert.ok(next.industries[id].productivity > 100 && next.industries[id].productivity < 100.1);
  assert.ok(next.industries.advanced.productivity > next.industries.agriculture.productivity);
});
test('미래 산업 modifier 입력은 분리되며 정책 시스템 없이 기본값 사용', () => {
  const e = createInitialEconomy(initialEconomyProfiles.sparrow);
  const normal = updateEconomy(e, { random: () => .5 });
  const adjusted = updateEconomy(e, { random: () => .5, industryModifiers: { advanced: { annualGrowthAdjustment: .01, productivityMultiplier: 2 } } });
  assert.ok(adjusted.industries.advanced.output > normal.industries.advanced.output);
  assert.equal(adjusted.industries.agriculture.output, normal.industries.agriculture.output);
  for (const random of [() => -1, () => 1, () => NaN]) assert.throws(() => updateEconomy(e, { random }));
});
test('동적 ownerCountryId를 기준으로 주 집계 대상 결정', () => {
  const world = createInitialWorldState();
  world.countries['test-federation'] = { ...world.countries.pigeon, id: 'test-federation' };
  for (const region of Object.values(world.regions)) region.ownerCountryId = 'test-federation';
  const next = updateWorldEconomy(world, { random: () => .5 });
  near(next.countries['test-federation'].economy.gdp, Object.values(next.regions).reduce((sum, r) => sum + r.economy.gdp, 0));
});
test('120개월 전체 턴 진행에서 경제·연방·나이·날짜 모두 정상', () => {
  let game = createGame('sparrow');
  const random = createSeededRandom(2026);
  for (let month = 0; month < 120; month++) { game = advanceMonth(game, { eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: random, electionRandom:()=>0, mortalityRandom: () => .99 }); verify(game.world); }
  assert.deepEqual(game.date, { year: 2040, month: 1 });
  assert.equal(game.player.ageMonths, 132);
  assert.equal(game.player.alive, true);
});
test('600개월 호황·침체·중립·변동 스트레스에서 유한값·범위·합계 유지', () => {
  for (const random of [() => 0, () => .5, () => .999999, createSeededRandom(123456)]) {
    let game = createGame('pigeon', 'eagle-state');
    for (let month = 0; month < 600; month++) { game = advanceMonth(game, { eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: random, electionRandom:()=>0, mortalityRandom: () => .99 }); verify(game.world); }
    assert.deepEqual(game.date, { year: 2080, month: 1 });
    assert.ok(game.world.countries.pigeon.fiscal.treasury >= 0);
    assert.ok(game.world.countries.pigeon.fiscal.debt >= 720);
  }
});

