import type { SpeciesDefinition, SpeciesId } from './types';

export const speciesDefinitions: readonly SpeciesDefinition[] = [
  { id: 'sparrow', name: '참새', code: 'SP', baseAnnualBirthRate: 1.8, baseAnnualDeathRate: 1, baseAnnualMigrationRate: 0, economicSensitivity: 1 },
  { id: 'crow', name: '까마귀', code: 'CR', baseAnnualBirthRate: 1.3, baseAnnualDeathRate: .8, baseAnnualMigrationRate: .1, economicSensitivity: .8 },
  { id: 'swallow', name: '제비', code: 'SW', baseAnnualBirthRate: 1.6, baseAnnualDeathRate: .9, baseAnnualMigrationRate: .2, economicSensitivity: 1.2 },
  { id: 'magpie', name: '까치', code: 'MG', baseAnnualBirthRate: 1.5, baseAnnualDeathRate: .9, baseAnnualMigrationRate: .1, economicSensitivity: 1 },
  { id: 'pigeon', name: '비둘기', code: 'PG', baseAnnualBirthRate: 1.7, baseAnnualDeathRate: 1, baseAnnualMigrationRate: .1, economicSensitivity: 1 },
  { id: 'eagle', name: '독수리', code: 'EG', baseAnnualBirthRate: 1.1, baseAnnualDeathRate: .7, baseAnnualMigrationRate: -.1, economicSensitivity: .7 },
  { id: 'owl', name: '부엉이', code: 'OW', baseAnnualBirthRate: 1.2, baseAnnualDeathRate: .7, baseAnnualMigrationRate: .1, economicSensitivity: .8 },
  { id: 'duck', name: '오리', code: 'DK', baseAnnualBirthRate: 1.8, baseAnnualDeathRate: 1, baseAnnualMigrationRate: 0, economicSensitivity: 1 },
];
export const populationConfig = {
  neutralGrowth: 2, neutralUnemployment: 5,
  birthGrowthResponse: .01, birthUnemploymentResponse: .015,
  birthEconomicMin: .85, birthEconomicMax: 1.10,
  migrationGrowthResponse: .08, migrationUnemploymentResponse: .12,
  migrationMin: -2, migrationMax: 2,
  neutralSocial: 50, healthcareDeathResponse: -.001, livingMigrationResponse: .002, welfareBirthResponse: .01,
  budgetMultiplierMin: .90, budgetMultiplierMax: 1.10,
  monthsPerYear: 12,
} as const;
export const initialPopulationProfiles: Readonly<Record<string, Partial<Record<SpeciesId, number>>>> = {
  sparrow: { sparrow: 26400000, crow: 8640000, swallow: 7200000, magpie: 5760000 },
  'pigeon-state': { pigeon: 12600000, eagle: 900000, owl: 1800000, duck: 2700000 },
  'eagle-state': { eagle: 8450000, pigeon: 1950000, owl: 1300000, duck: 1300000 },
  'owl-state': { owl: 6000000, pigeon: 2000000, eagle: 500000, duck: 1500000 },
  'duck-state': { duck: 7700000, pigeon: 1650000, eagle: 550000, owl: 1100000 },
};
