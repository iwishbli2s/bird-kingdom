import assert from 'node:assert/strict';
import { test } from 'node:test';
import { advanceMonth, createGame, nextMonth } from './legacyEngine';
import { countries, regions, species } from '../src/game/data';
import { calculateMonthlyMortalityRisk, formatAge, formatDuration, rollPlayerDeath } from '../src/game/mortality';

test('공화국 시작 상태와 초기 기록', () => {
  const game = createGame('sparrow');
  assert.equal(game.player.controlledRegionId, null);
  assert.deepEqual(game.date, { year: 2030, month: 1 });
  assert.equal(game.logs[0].message, '새로운 정부 운영이 시작되었습니다.');
  assert.equal(game.player.ageMonths, 12);
  assert.equal(game.player.alive, true);
  assert.equal(game.player.deathDate, null);
  assert.equal(game.player.currentMortalityRisk, game.player.baseMonthlyMortalityRisk);
});
test('연방은 유효한 주를 선택해야 하며 네 주 모두 시작 가능', () => {
  assert.throws(() => createGame('pigeon'));
  assert.throws(() => createGame('sparrow', 'eagle-state'));
  for (const region of regions) assert.equal(createGame('pigeon', region.id).player.controlledRegionId, region.id);
});
test('월 진행은 경제·나이·위험·로그를 갱신하고 거버넌스를 갱신하고 원본 상태를 보존', () => {
  const before = createGame('sparrow');
  const after = advanceMonth(before, { eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: () => 0.5, electionRandom:()=>0, mortalityRandom: () => 0.99 });
  assert.deepEqual(after.date, { year: 2030, month: 2 });
  assert.deepEqual(before.date, { year: 2030, month: 1 });
  assert.notDeepEqual(after.world, before.world); assert.notDeepEqual(after.world.countries.sparrow.governance, before.world.countries.sparrow.governance);
  assert.equal(before.logs.length, 1);
  assert.equal(after.logs.length, 2);
  assert.equal(after.logs[0].message, '한 달이 경과했습니다.');
  assert.deepEqual(after.logs[0].date, after.date);
  assert.equal(before.player.ageMonths, 12);
  assert.equal(after.player.ageMonths, 13);
  assert.ok(after.player.baseMonthlyMortalityRisk > before.player.baseMonthlyMortalityRisk);
});
test('12월에서 다음 해 1월 전환 및 장기간 진행', () => {
  assert.deepEqual(nextMonth({ year: 2030, month: 12 }), { year: 2031, month: 1 });
  let game = createGame('pigeon', 'owl-state');
  for (let month = 0; month < 36; month++) game = advanceMonth(game, { eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: () => 0.5, electionRandom:()=>0, mortalityRandom: () => 0.99 });
  assert.deepEqual(game.date, { year: 2033, month: 1 });
  assert.equal(game.turn, 37);
  assert.equal(game.logs.length, 37);
  assert.equal(new Set(game.logs.map(log => log.id)).size, 37);
  assert.deepEqual(game.logs[1].date, { year: 2032, month: 12 });
  assert.equal(game.player.ageMonths, 48);
});
test('새 게임마다 지표가 독립적이며 모든 국가 참조 데이터가 존재', () => {
  const game = createGame('sparrow');
  game.world.countries.sparrow.economy.gdp = 0;
  assert.equal(createGame('sparrow').world.countries.sparrow.economy.gdp, 1600);
  for (const country of countries) {
    assert.equal(country.speciesIds.length, 4);
    for (const id of country.speciesIds) assert.ok(species.some(item => item.id === id));
    for (const id of country.regionIds) assert.ok(regions.some(item => item.id === id && item.initialOwnerCountryId === country.id));
  }
});

test('나이 1세 11개월 → 2세 0개월과 집권 기간 계산', () => {
  let game = createGame('sparrow');
  for (let i = 0; i < 11; i++) game = advanceMonth(game, { eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: () => 0.5, electionRandom:()=>0, mortalityRandom: () => 0.99 });
  assert.equal(formatAge(game.player.ageMonths), '1세 11개월');
  game = advanceMonth(game, { eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: () => 0.5, electionRandom:()=>0, mortalityRandom: () => 0.99 });
  assert.equal(formatAge(game.player.ageMonths), '2세 0개월');
  assert.equal(formatDuration(game.turn - 1), '1년 0개월');
});

test('기초 위험은 매달 아주 조금 증가하며 매월 정확히 한 번 판정', () => {
  let game = createGame('sparrow');
  let calls = 0;
  for (let i = 0; i < 120; i++) {
    const before = game.player.currentMortalityRisk;
    game = advanceMonth(game, { eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: () => 0.5, electionRandom:()=>0, mortalityRandom: () => { calls++; return 0.99; } });
    assert.ok(game.player.currentMortalityRisk > before);
    assert.ok(game.player.currentMortalityRisk - before < 0.000001);
    assert.equal(game.player.currentMortalityRisk, calculateMonthlyMortalityRisk(game));
    assert.equal(game.player.baseMonthlyMortalityRisk, game.player.currentMortalityRisk);
  }
  assert.equal(calls, 120);
  assert.ok(game.player.currentMortalityRisk < 0.001);
});

test('사망 확률의 경계와 잘못된 입력 검증', () => {
  assert.equal(rollPlayerDeath(0, () => 0), false);
  assert.equal(rollPlayerDeath(1, () => 0.999999), true);
  assert.equal(rollPlayerDeath(0.5, () => 0.49), true);
  assert.equal(rollPlayerDeath(0.5, () => 0.5), false);
  for (const risk of [-1, 1.01, NaN, Infinity]) assert.throws(() => rollPlayerDeath(risk));
  for (const sample of [-1, 1, NaN, Infinity]) assert.throws(() => rollPlayerDeath(0.5, () => sample));
});

test('사망 월의 날짜·나이·로그 보존 및 사망 후 시간 진행과 재판정 차단', () => {
  const before = createGame('pigeon', 'eagle-state');
  const dead = advanceMonth(before, { mortalityRiskOverride: 1, eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: () => 0.5, electionRandom:()=>0, mortalityRandom: () => 0.99 });
  assert.equal(dead.player.alive, false);
  assert.equal(dead.player.ageMonths, 13);
  assert.deepEqual(dead.player.deathDate, { year: 2030, month: 2 });
  assert.deepEqual(dead.date, dead.player.deathDate);
  assert.equal(dead.player.currentMortalityRisk, 1);
  assert.ok(dead.player.baseMonthlyMortalityRisk < 0.001);
  assert.equal(dead.logs[0].type, 'death');
  assert.equal(formatDuration(dead.turn - 1), '0년 1개월');
  assert.equal(before.player.alive, true);
  assert.equal(before.player.deathDate, null);
  assert.deepEqual(dead.world.countries.pigeon.governance, before.world.countries.pigeon.governance);
  assert.equal(advanceMonth(dead, { eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: () => 0.5, electionRandom:()=>0, mortalityRandom: () => { throw new Error('사망 후 재판정 금지'); } }), dead);
});

test('디버그 위험 해제 후 자연 위험 계산으로 복귀', () => {
  const overridden = advanceMonth(createGame('sparrow'), { mortalityRiskOverride: 0.5, eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: () => 0.5, electionRandom:()=>0, mortalityRandom: () => 0.99 });
  const normal = advanceMonth(overridden, { eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom: () => 0.5, electionRandom:()=>0, mortalityRandom: () => 0.99 });
  assert.equal(normal.player.currentMortalityRisk, calculateMonthlyMortalityRisk(normal));
  assert.equal(normal.player.currentMortalityRisk, normal.player.baseMonthlyMortalityRisk);
  assert.ok(normal.player.currentMortalityRisk < 0.001);
});
