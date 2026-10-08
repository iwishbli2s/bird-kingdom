import {mortalityConfig} from './balanceConfig';
import {difficultyModifiers} from './difficulty';
import type { GameState } from './types';

export const STARTING_AGE_MONTHS = mortalityConfig.startingAgeMonths;
// 게임 밸런스용 가상 확률입니다. 실제 생물학적 수명 모델이 아닙니다.
const INITIAL_MONTHLY_RISK = mortalityConfig.initialMonthlyRisk;
const RISK_GROWTH_YEARS = mortalityConfig.riskGrowthYears;
const MAX_NATURAL_RISK = mortalityConfig.maxNaturalRisk;
const INITIAL_HAZARD = -Math.log1p(-INITIAL_MONTHLY_RISK);

export interface MortalityModifiers { multiplier?: number }

export function calculateBaseMonthlyMortalityRisk(ageMonths: number): number {
  if (!Number.isFinite(ageMonths) || ageMonths < 0) throw new RangeError('나이는 유한한 0 이상의 개월 수여야 합니다.');
  const elapsedYears = Math.max(0, ageMonths - STARTING_AGE_MONTHS) / 12;
  const hazard = INITIAL_HAZARD * Math.exp(elapsedYears / RISK_GROWTH_YEARS);
  // 지수형 노화 위험을 확률로 변환합니다. 어떤 나이에도 자연 위험이 100%가 되지 않습니다.
  return Math.min(MAX_NATURAL_RISK, -Math.expm1(-hazard));
}

export function calculateMonthlyMortalityRisk(game: GameState, modifiers: MortalityModifiers = {}): number {
  const multiplier = modifiers.multiplier ?? 1;
  if (!Number.isFinite(multiplier) || multiplier < 0) throw new RangeError('위험 배율은 유한한 0 이상의 값이어야 합니다.');
  // 월말 상황위험은 자연위험에 작은 가산값을 더합니다. 사망 판정은 기존 RNG 한 번입니다.
  return Math.min(1, calculateBaseMonthlyMortalityRisk(game.player.ageMonths) * multiplier + (game.player.leaderRisk?.mortalityModifierLastMonth??0)*difficultyModifiers(game).situationalMortality);
}

export function validateMortalityRisk(risk: number): number {
  if (!Number.isFinite(risk) || risk < 0 || risk > 1) throw new RangeError('사망확률은 0~1이어야 합니다.');
  return risk;
}

export function rollPlayerDeath(mortalityRisk: number, random: () => number = Math.random): boolean {
  validateMortalityRisk(mortalityRisk);
  const sample = random();
  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) throw new RangeError('난수는 0 이상 1 미만이어야 합니다.');
  return sample < mortalityRisk;
}

export function formatAge(totalMonths: number): string {
  return `${Math.floor(totalMonths / 12)}세 ${totalMonths % 12}개월`;
}

export function formatDuration(totalMonths: number): string {
  return `${Math.floor(totalMonths / 12)}년 ${totalMonths % 12}개월`;
}


