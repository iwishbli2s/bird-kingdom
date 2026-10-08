import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGame } from './legacyEngine';
import { calculateBaseMonthlyMortalityRisk, calculateMonthlyMortalityRisk, rollPlayerDeath } from '../src/game/mortality';

test('어린 시기의 위험과 증가폭은 매우 낮고 고령의 위험은 체감 가능', () => {
  const at = (years: number) => calculateBaseMonthlyMortalityRisk(years * 12);
  assert.ok(at(1) < 0.00002);
  assert.ok(at(5) < 0.00002);
  assert.ok(at(20) < 0.001);
  assert.ok(at(60) > 0.01);
  assert.ok(at(80) > 0.1);
  assert.ok(at(100) > 0.8);
  const earlyIncrease = calculateBaseMonthlyMortalityRisk(13) - at(1);
  const oldIncrease = calculateBaseMonthlyMortalityRisk(80 * 12 + 1) - at(80);
  assert.ok(oldIncrease > earlyIncrease * 1000);
});

test('자연 위험은 월마다 감소하지 않으며 모든 나이에 100% 미만', () => {
  let previous = 0;
  for (let age = 12; age <= 12000; age++) {
    const risk = calculateBaseMonthlyMortalityRisk(age);
    assert.ok(risk >= previous);
    assert.ok(risk > 0 && risk < 1);
    previous = risk;
  }
  for (const age of [1200, 12000, Number.MAX_SAFE_INTEGER, Number.MAX_VALUE]) {
    const risk = calculateBaseMonthlyMortalityRisk(age);
    assert.ok(risk < 1);
    assert.equal(rollPlayerDeath(risk, () => 0.9999999), false);
  }
});

test('자연 위험과 주입 가능한 상황 배율이 분리되고 원본은 불변', () => {
  const game = createGame('sparrow');
  const snapshot = structuredClone(game);
  const base = calculateBaseMonthlyMortalityRisk(game.player.ageMonths);
  assert.equal(calculateMonthlyMortalityRisk(game), base);
  assert.equal(calculateMonthlyMortalityRisk(game, { multiplier: 2 }), base * 2);
  assert.equal(calculateMonthlyMortalityRisk(game, { multiplier: 0 }), 0);
  assert.equal(calculateMonthlyMortalityRisk(game, { multiplier: 1e9 }), 1);
  assert.deepEqual(game, snapshot);
  for (const multiplier of [-1, NaN, Infinity]) assert.throws(() => calculateMonthlyMortalityRisk(game, { multiplier }));
  for (const age of [-1, NaN, Infinity]) assert.throws(() => calculateBaseMonthlyMortalityRisk(age));
});
