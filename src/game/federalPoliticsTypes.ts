import type {GameDate} from './types';
export type FederalAction='criticize'|'autonomy'|'defy'|'renegotiate'|'referendum'|'confront'|'declare';
export type AutonomyDemandLevel='limited'|'substantial'|'maximum';
export type FederalResponse='ignore'|'negotiate'|'partial_concession'|'accept'|'political_pressure'|'economic_pressure'|'hardline_rejection';
export interface FederalConfrontationAssessment {
 politicalBacking:number; economicBacking:number; institutionalBacking:number; independenceBacking:number; overallViability:number; reasonCodes:string[];
}
export interface FederalActionRecord {
 id:string; stateId:string; parentCountryId:string; date:GameDate; turn:number; action:FederalAction; level:AutonomyDemandLevel; response:FederalResponse;
}
export interface FederalPoliticalState {nextActionTurn:number; history:FederalActionRecord[]}
