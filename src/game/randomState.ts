import { createRandomSeed } from './random';
import type { GameState } from './types';
export const randomStreamNames = ['economy', 'mortality', 'election', 'eventOccurrence', 'eventOutcome', 'secession', 'conflict', 'war', 'crisis'] as const;
export type RandomStreamName = typeof randomStreamNames[number];
export interface RandomStreamState {
    seed: number;
    state: number;
}
export type GameRandomState = Record<RandomStreamName, RandomStreamState>;
export function createGameRandom(seed = createRandomSeed()): GameRandomState { return Object.fromEntries(randomStreamNames.map((name, i) => { const n = (seed + Math.imul(i + 1, 2654435761)) >>> 0; return [name, { seed: n, state: n }]; })) as GameRandomState; }
/** Local operation copy: closures are never saved, and injected streams never advance persisted state. */
export function withGameRandom(game: GameState, operation: (game: GameState, random: (name: RandomStreamName) => () => number) => GameState): GameState {
    const streams = structuredClone(game.random ?? createGameRandom()), working = { ...game, random: streams };
    const random = (name: RandomStreamName) => () => { const s = streams[name]; s.state = (Math.imul(s.state, 1664525) + 1013904223) >>> 0; return s.state / 4294967296; };
    const result = operation(working, random);
    return { ...result, random: streams };
}
