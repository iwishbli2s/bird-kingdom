import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game/engine';
import { campaignTimeDisplay } from '../src/components/timeDisplay';

test('display age and reign follow calendar months without mutating mortality age', () => {
  const game = createGame('sparrow', null, 2030);
  game.date = { year: 2038, month: 7 };
  game.turn = 103;
  const before = JSON.stringify(game);
  assert.deepEqual(campaignTimeDisplay(game), { age: '9세 6개월', reign: '통치 8년 6개월째' });
  assert.equal(JSON.stringify(game), before);
});

test('December to January crosses both age and reign year boundaries', () => {
  const game = createGame('sparrow', null, 2030);
  game.date = { year: 2030, month: 12 }; game.turn = 12;
  assert.deepEqual(campaignTimeDisplay(game), { age: '1세 11개월', reign: '통치 0년 11개월째' });
  game.date = { year: 2031, month: 1 }; game.turn = 13;
  assert.deepEqual(campaignTimeDisplay(game), { age: '2세 0개월', reign: '통치 1년 0개월째' });
});

test('legacy late or absent history does not reset campaign age or total reign', () => {
  const game = createGame('sparrow', null, 2030);
  game.date = { year: 2038, month: 7 }; game.turn = 103;
  game.history!.career.startDate = { year: 2038, month: 7 };
  const expected = { age: '9세 6개월', reign: '통치 8년 6개월째' };
  assert.deepEqual(campaignTimeDisplay(game), expected);
  delete game.history;
  assert.deepEqual(campaignTimeDisplay(game), expected);
});

test('changing jurisdiction or office does not reset total campaign time', () => {
  const game = createGame('pigeon', 'eagle-state', 2030);
  game.date = { year: 2034, month: 1 }; game.turn = 49;
  const expected = campaignTimeDisplay(game);
  game.player.controlledCountryId = 'sparrow'; game.player.controlledRegionId = null;
  game.history!.career.officesHeld.push({ countryId: 'sparrow', countryName: '참새자유공화국', regionId: null, office: 'president', startDate: game.date, endDate: null });
  assert.deepEqual(campaignTimeDisplay(game), expected);
  assert.equal(expected.reign, '통치 4년 0개월째');
});
