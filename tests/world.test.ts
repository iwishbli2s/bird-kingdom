import assert from 'node:assert/strict';
import { test } from 'node:test';
import { advanceMonth, createGame } from './legacyEngine';
import { countries, initialGovernance, regions } from '../src/game/data';
import { initialEconomyProfiles } from '../src/game/economyConfig';
import { createInitialPopulation } from '../src/game/population';
import { initialPopulationProfiles } from '../src/game/populationConfig';
import { createInitialFiscal } from '../src/game/fiscal';
import { countryFiscalProfiles } from '../src/game/fiscalConfig';
import { createInitialEconomy } from '../src/game/economy';
import { appendGameLog } from '../src/game/logs';
import { createInitialWorldState, selectControlledRuntime } from '../src/game/world';
import type { CountryId, CountryRuntimeState } from '../src/game/types';

function freezeDeep<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value)) freezeDeep(child);
  }
  return value;
}

test('모든 운영 대상에서 두 국가와 네 주의 전체 세계를 생성한다', () => {
  for (const game of [createGame('sparrow'), ...regions.map(region => createGame('pigeon', region.id))]) {
    assert.deepEqual(Object.keys(game.world.countries).sort(), countries.map(country => country.id).sort());
    assert.deepEqual(Object.keys(game.world.regions).sort(), regions.map(region => region.id).sort());
    for (const region of regions) {
      const runtime = game.world.regions[region.id];
      assert.equal(runtime.ownerCountryId, 'pigeon');
      assert.equal(runtime.id, region.id);
      assert.deepEqual(runtime.economy, createInitialEconomy(initialEconomyProfiles[region.id]));
      assert.deepEqual(runtime.governance, initialGovernance);
    }
    for (const country of countries) assert.equal(game.world.countries[country.id].id, country.id);
  }
});

test('운영 대상만 다르고 세계 초기값은 동일하며 플레이어 상태에 모인다', () => {
  const republic = createGame('sparrow');
  const eagle = createGame('pigeon', 'eagle-state');
  assert.deepEqual(republic.world, eagle.world);
  assert.equal(republic.player.controlledCountryId, 'sparrow');
  assert.equal(republic.player.controlledRegionId, null);
  assert.equal(eagle.player.controlledCountryId, 'pigeon');
  assert.equal(eagle.player.controlledRegionId, 'eagle-state');
  assert.equal(selectControlledRuntime(republic), republic.world.countries.sparrow);
  assert.equal(selectControlledRuntime(eagle), eagle.world.regions['eagle-state']);
  assert.equal('indicators' in republic, false);
  assert.equal('countryId' in republic, false);
});

test('국가·주·별도 게임·정적 초기값 사이 런타임 객체를 공유하지 않는다', () => {
  const first = createInitialWorldState();
  const second = createInitialWorldState();
  const runtimes = [...Object.values(first.countries), ...Object.values(first.regions)];
  assert.equal(new Set(runtimes.map(runtime => runtime.economy)).size, 6);
  assert.equal(new Set(runtimes.flatMap(runtime => runtime.governance ? [runtime.governance] : [])).size, 5); assert.equal('governance' in first.countries.pigeon, false);
  first.regions['eagle-state'].economy.gdp = 0;
  first.countries.sparrow.governance.approval = 0;
  assert.equal(first.countries.pigeon.economy.gdp, 1900);
  assert.equal(first.regions['owl-state'].economy.gdp, 430);
  assert.equal(first.regions['eagle-state'].governance.approval, 64);
  assert.equal(second.regions['eagle-state'].economy.gdp, 520);
  assert.equal(initialEconomyProfiles.sparrow.gdp, 1600);
  assert.equal(initialGovernance.approval, 64);
});

test('동적 국가 ID 및 소유권은 시작 선택 union에 묶이지 않는다', () => {
  const world = createInitialWorldState();
  const id: CountryId = 'eagle-republic';
  const runtime: CountryRuntimeState = { id, population: createInitialPopulation(initialPopulationProfiles.sparrow), fiscal: createInitialFiscal(countryFiscalProfiles['centralized-presidential-republic'], createInitialEconomy(initialEconomyProfiles.sparrow)), economy: createInitialEconomy(initialEconomyProfiles.sparrow), governance: { ...initialGovernance } };
  // 타입의 확장성을 검사하는 fixture입니다. 게임에는 국가 생성 기능을 추가하지 않습니다.
  world.countries[id] = runtime;
  world.regions['eagle-state'].ownerCountryId = id;
  assert.equal(world.countries[id].id, id);
  assert.equal(world.regions['eagle-state'].ownerCountryId, id);
  assert.equal(regions.find(region => region.id === 'eagle-state')!.initialOwnerCountryId, 'pigeon');
});

test('같은 턴에 여러 로그를 추가해도 고유 ID와 최신순 및 날짜를 유지', () => {
  const before = freezeDeep(createGame('sparrow'));
  let game = appendGameLog(before, { message: '첫 번째 테스트 기록', category: 'economic', type: 'event' });
  game = appendGameLog(game, { message: '두 번째 테스트 기록', category: 'social', type: 'event' });
  assert.equal(new Set(game.logs.map(log => log.id)).size, 3);
  assert.deepEqual(game.logs.map(log => log.turn), [1, 1, 1]);
  assert.equal(game.logs[0].message, '두 번째 테스트 기록');
  assert.deepEqual(game.logs[0].date, game.date);
  assert.notEqual(game.logs[0].date, game.date);
  assert.equal(before.logs.length, 1);
  game = advanceMonth(game, { eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: () => 0.5, electionRandom:()=>0, mortalityRandom: () => 0.99 });
  assert.equal(game.logs[0].turn, 2);
  assert.equal(game.logs[0].category, 'system');
  assert.equal(new Set(game.logs.map(log => log.id)).size, 4);
});

test('깊게 동결된 입력 상태에서 월 진행해도 세계·정적 정의를 변경하지 않는다', () => {
  const before = freezeDeep(createGame('pigeon', 'eagle-state'));
  const snapshot = structuredClone(before);
  const after = advanceMonth(before, { eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: () => 0.5, electionRandom:()=>0, mortalityRandom: () => 0.99 });
  assert.deepEqual(before, snapshot);
  assert.notEqual(after.world, before.world);
  assert.notEqual(after.player, before.player);
  assert.notEqual(after.date, before.date);
  assert.notEqual(after.logs, before.logs);
  assert.equal(after.player.ageMonths, 13);
  assert.equal(after.turn, 2);
});

test('선택한 주의 지표를 읽고 연방 전체 지표와 섞지 않는다', () => {
  const game = createGame('pigeon', 'eagle-state');
  game.world.regions['eagle-state'].economy.gdp = 999;
  assert.equal(selectControlledRuntime(game).economy.gdp, 999);
  assert.equal(game.world.countries.pigeon.economy.gdp, 1900);
});

test('존재하지 않는 운영 대상 및 잘못된 주 선택을 거부', () => {
  assert.throws(() => createGame('pigeon', 'missing-region'));
  // @ts-expect-error 시작 선택은 두 시작 국가로 제한됩니다.
  assert.throws(() => createGame('eagle-republic'));
  const game = createGame('sparrow');
  game.player.controlledCountryId = 'missing-country';
  assert.throws(() => selectControlledRuntime(game));
});


