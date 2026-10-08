import type { GameLog, GameState, WorldState } from './types';
import { countries, regions } from './data';

export type LogEntry = Pick<GameLog, 'message' | 'category' | 'type'>;

export function appendGameLog(game: GameState, entry: LogEntry): GameState {
  // 턴 번호와 독립적인 게임 내 순번. 같은 달에 여러 기록을 추가해도 충돌하지 않습니다.
  const id = game.logs.reduce((highest, log) => Math.max(highest, log.id), 0) + 1;
  const log: GameLog = { ...entry, id, turn: game.turn, date: { ...game.date } };
  return { ...game, logs: [log, ...game.logs] };
}

export function appendFirstBorrowingLogs(game: GameState, previous: WorldState): GameState {
  let next = game;
  for (const kind of ['countries', 'regions'] as const) {
    for (const [id, runtime] of Object.entries(game.world[kind])) {
      if (!previous[kind][id].fiscal.hasIssuedDebt && runtime.fiscal.hasIssuedDebt) {
        const name = (kind === 'countries' ? countries : regions).find(item => item.id === id)?.name ?? id;
        const amount = runtime.fiscal.debt - previous[kind][id].fiscal.debt;
        next = appendGameLog(next, { category: 'economic', type: 'event', message: `${name} 정부가 국고 부족분 ${amount.toFixed(1)}십억 BK를 신규 부채로 충당했습니다. (최초 발생)` });
      }
    }
  }
  return next;
}
