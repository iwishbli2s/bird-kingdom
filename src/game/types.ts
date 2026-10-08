import type {Difficulty} from './difficulty';
import type { GameRandomState } from './randomState';
import type { PolicyScheduleState } from './policySchedule';
import type { HistoryState } from './historyTypes';
import type { GovernmentAIState } from './aiTypes';
import type { StrategicAIState, ForeignProposal } from './strategicTypes';
export type * from './aiTypes';
import type { CrisisSystemState, LeaderRiskState, TemporaryLeaderRiskModifier } from './crisisTypes';
export type * from './crisisTypes';
import type { TechnologyState, TechnologyHistoryEntry } from './technologyTypes';
export type * from './technologyTypes';
import type { MilitaryState, WarfareState } from './warfareTypes';
export type * from './warfareTypes';
import type { DiplomacyState } from './diplomacyTypes';
export type * from './diplomacyTypes';
import type { EventState } from './eventTypes';
import type { InternalConflictState } from './conflictTypes';
export type * from './conflictTypes';
import type { CountryRuntimeIdentity, CountrySimulationMode, RegionRuntimeIdentity, SecessionState } from './secessionTypes';
export type * from './secessionTypes';
export type * from './eventTypes';
export type StartingCountryId = 'sparrow' | 'pigeon';
export type CountryId = string;
export type RegionId = string;
export type SpeciesId = 'sparrow' | 'crow' | 'swallow' | 'magpie' | 'pigeon' | 'eagle' | 'owl' | 'duck';
export interface SpeciesDefinition {
  id: SpeciesId; name: string; code: string;
  baseAnnualBirthRate: number;
  baseAnnualDeathRate: number;
  baseAnnualMigrationRate: number;
  economicSensitivity: number;
}
export interface SpeciesPopulationState {
  speciesId: SpeciesId;
  population: number;
  birthRate: number; deathRate: number; migrationRate: number;
  birthsLastMonth: number; deathsLastMonth: number; migrationLastMonth: number;
}
export interface PopulationState {
  total: number;
  species: Partial<Record<SpeciesId, SpeciesPopulationState>>;
  birthsLastMonth: number; deathsLastMonth: number; netMigrationLastMonth: number;
}
export interface SpeciesPoliticalState {
  speciesId: SpeciesId;
  satisfaction: number; politicalInfluence: number; autonomyDemand: number; independenceSentiment: number;
  satisfactionDeltaLastMonth: number; influenceDeltaLastMonth: number;
  autonomyDeltaLastMonth: number; independenceDeltaLastMonth: number;
}
export type SpeciesPoliticsState = Partial<Record<SpeciesId, SpeciesPoliticalState>>;
export interface SpeciesPoliticalBaseline {
  satisfaction: number; influenceBias: number; autonomyDemand: number; independenceSentiment: number;
}
export interface CountryDefinition {
  id: CountryId;
  name: string;
  englishName: string;
  governmentType: 'centralized-presidential-republic' | 'federation';
  governmentLabel: string;
  description: string;
  playScope: string;
  speciesIds: readonly SpeciesId[];
  regionIds: readonly RegionId[];
}
export interface RegionDefinition {
  id: RegionId;
  initialOwnerCountryId: StartingCountryId;
  name: string;
  englishName: string;
  specialty: string;
  description: string;
  isCapital: boolean;
}
export interface GameDate { year: number; month: number }
export type LogCategory = 'system' | 'political' | 'economic' | 'social' | 'event';
export interface GameLog {
  id: number;
  turn: number;
  date: GameDate;
  message: string;
  category: LogCategory;
  type: 'start' | 'month' | 'death' | 'event';
}
export type GameOverReason = 'death' | 'election_defeat' | 'state_defeat';
export interface MonthlyElectionMetrics { growth: number; unemployment: number; inflation: number; approval: number }
export interface ElectionSnapshot extends MonthlyElectionMetrics {
  stability: number; integration: number; livingStandard: number; weightedSpeciesSatisfaction: number;
  averageGrowth: number; averageUnemployment: number; averageInflation: number; averageApproval: number;
  minorityCrisisPressure: number; score: number; reelectionChance: number;
}
export interface ElectionResult { date: GameDate; turn: number; termNumber: number; won: boolean; snapshot: ElectionSnapshot }
export interface PoliticalCareerState {
  office: 'president' | 'governor'; termNumber: number; monthsInCurrentTerm: number; termLengthMonths: number;
  electionsWon: number; electionsLost: number; history: MonthlyElectionMetrics[]; lastElection: ElectionResult | null;
}
export interface PlayerState {
  origin?:import('./achievementTypes').PlayerOrigin;
  leaderRisk?:LeaderRiskState;
  temporaryLeaderRiskModifiers?:TemporaryLeaderRiskModifier[];
  defeatedCountryId?: CountryId;
  career: PoliticalCareerState;
  controlledCountryId: CountryId;
  controlledRegionId: RegionId | null;
  ageMonths: number;
  baseMonthlyMortalityRisk: number;
  currentMortalityRisk: number;
  alive: boolean;
  deathDate: GameDate | null;
}
export type IndustryId = 'agriculture' | 'manufacturing' | 'services' | 'advanced' | 'defense';
export interface IndustryState { output: number; productivity: number }
export interface EconomyState {
  gdp: number;
  growth: number;
  unemployment: number;
  inflation: number;
  industries: Record<IndustryId, IndustryState>;
  cycle: number;
}
export interface SocialState {
  livingStandard: number; education: number; healthcare: number; publicSafety: number; inequality: number;
  livingStandardDeltaLastMonth: number; educationDeltaLastMonth: number; healthcareDeltaLastMonth: number; publicSafetyDeltaLastMonth: number; inequalityDeltaLastMonth: number;
}
export interface GovernanceState {
  approval: number;
  stability: number;
  integration: number;
  approvalDeltaLastMonth: number; stabilityDeltaLastMonth: number; integrationDeltaLastMonth: number;
}
export interface TaxPolicy { incomeTaxRate: number; corporateTaxRate: number; consumptionTaxRate: number }
export interface FiscalRevenue { incomeTax: number; corporateTax: number; consumptionTax: number; total: number }
export type BudgetCategoryId = 'defense' | 'education' | 'healthcare' | 'welfare' | 'security' | 'industrySupport' | 'infrastructure' | 'research';
/** 연간 GDP 대비 퍼센트 값: 2.5는 GDP의 2.5%. */
export type BudgetPolicy = Record<BudgetCategoryId, number>;
export interface FiscalExpenditure {
  emergency?:number;
  categories: Record<BudgetCategoryId, number>;
  programTotal: number;
  interest: number;
  total: number;
}
export interface FiscalState {
  treasury: number;
  debt: number;
  taxPolicy: TaxPolicy;
  baselineTaxPolicy: TaxPolicy;
  budgetPolicy: BudgetPolicy;
  baselineBudgetPolicy: BudgetPolicy;
  revenue: FiscalRevenue;
  expenditure: FiscalExpenditure;
  monthlyBalance: number;
  annualInterestRate: number;
  hasIssuedDebt: boolean;
}
export interface CountryRuntimeState {
  technology?:TechnologyState;
  military?: MilitaryState;
  id: CountryId;
  identity?: CountryRuntimeIdentity;
  simulationMode?: CountrySimulationMode;
  secession?: SecessionState;
  economy: EconomyState;
  fiscal: FiscalState;
  /** 소속 주가 있는 국가는 거버넌스도 저장하지 않고 주에서 집계합니다. */
  governance?: GovernanceState;
  population: PopulationState;
  /** 주를 집계하는 연방은 별도 정치 상태를 저장하지 않습니다. */
  /** 소속 주가 있는 국가는 사회값을 저장하지 않고 인구 가중 집계합니다. */
  social?: SocialState;
  speciesPolitics?: SpeciesPoliticsState;
}
export interface RegionRuntimeState {
  technology?:TechnologyState;
  id: RegionId;
  /** 직접 계산 국가에 합쳐진 영토는 행정 메타데이터만 보존합니다. */
  simulationRole?: 'active' | 'administrative';
  /** Relative asset share of a district merged into a directly simulated ledger. */
  directAssetWeight?: number;
  regionIdentity?: RegionRuntimeIdentity;
  secession?: SecessionState;
  ownerCountryId: CountryId;
  economy: EconomyState;
  fiscal: FiscalState;
  governance: GovernanceState;
  population: PopulationState;
  social: SocialState;
  speciesPolitics: SpeciesPoliticsState;
}
export interface WorldState {
  governmentAI?:Record<string,GovernmentAIState>;
  strategicAI?:Record<string,StrategicAIState>;
  foreignProposals?:ForeignProposal[];
  crises?:CrisisSystemState;
  technologyHistory?:TechnologyHistoryEntry[];
  warfare?: WarfareState;
  diplomacy?: DiplomacyState;
  internalConflicts?: Record<string,InternalConflictState>;
  retiredCountryIdentities?: Record<string,CountryRuntimeIdentity>;
  countries: Record<CountryId, CountryRuntimeState>;
  regions: Record<RegionId, RegionRuntimeState>;
}
export interface GameState {
  achievements?:import('./achievementTypes').AchievementState;
  endingResult?:import('./achievementTypes').EndingResult;
  tutorial?:import('./tutorialTypes').TutorialState;
  difficulty?:Difficulty;
  random?:GameRandomState;
  policySchedules?:Record<string,PolicyScheduleState>;
  /** Only earlier-stage isolated regression fixtures may disable cadence. Saves reject this mode. */
  policyScheduleEnabled?:boolean;
  history?: HistoryState;
  date: GameDate;
  turn: number;
  gameOverReason: GameOverReason | null;
  player: PlayerState;
  world: WorldState;
  logs: GameLog[];
  events: EventState;
}



