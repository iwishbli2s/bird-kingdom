import type { GameState } from '../game/types';
import { STARTING_AGE_MONTHS, formatAge, formatDuration } from '../game/mortality';

/** Display only: legacy saves can begin their history archive after the campaign began. */
export function campaignTimeDisplay(game: GameState) {
  const start = game.history?.career.startDate;
  const archivedMonths = start
    ? (game.date.year - start.year) * 12 + game.date.month - start.month
    : 0;
  const reignMonths = Math.max(0, archivedMonths, game.turn - 1);
  return {
    age: formatAge(STARTING_AGE_MONTHS + reignMonths),
    reign: `통치 ${formatDuration(reignMonths)}째`,
  };
}
