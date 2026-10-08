import type {GameDate,GameOverReason} from './types';
export type EndingAlignment='good'|'bad';
export type RuleGrade='D'|'C'|'B'|'A'|'S'|'SS'|'SSS';
export interface EndingDefinition {id:string;alignment:EndingAlignment;title:string;description:string}
export interface AchievementDefinition {id:string;name:string;description:string;score:number;hidden:boolean;family?:string}
export interface AchievementUnlock {achievementId:string;unlockedAt:GameDate;score:number;metadata?:Record<string,string|number|boolean>}
export interface PlayerOrigin {startingCountryId:string;startingStateId?:string;startedAsFederationState:boolean;federationRegionIds:string[];verified:boolean}
export interface AchievementState {
  unlocked:AchievementUnlock[];
  progress:{lastMonthTurn:number;lastYear:number;peaceMonths:number;economicYears:number;technologyYears:number;goldenYears:number;cohesionYears:number;fiscalYears:number;independentCountryId:string|null;absorbedFederationRegionIds:string[]};
}
export interface EndingResult extends EndingDefinition {
  score:number;grade:RuleGrade;achievements:AchievementUnlock[];reignMonths:number;finalAge:number;
  gameOverReason:GameOverReason;date:GameDate;countryId:string;countryName:string;regionName:string|null;electionsWon:number;
  summary:{wars:number;victories:number;countriesFounded:number;majorCrises:number};
}
