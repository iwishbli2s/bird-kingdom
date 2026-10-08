import type { DiplomaticAction, GameDate, WarResolution } from './types';
export type ForeignPolicyPosture='cooperative'|'commercial'|'cautious'|'defensive'|'assertive'|'survival';
export type WarStrategy='press_advantage'|'hold'|'seek_ceasefire'|'seek_peace'|'survival';
export interface StrategicAssessment {targetCountryId:string;affinity:number;threat:number;economicValue:number;allianceValue:number;conflictRisk:number;territorialInterest:number;recognitionInterest:number;overallPriority:number}
export interface DiplomaticActionScore {security:number;economic:number;trust:number;domesticCost:number;escalationRisk:number;total:number}
export interface AIStrategicDecisionRecord {date:GameDate;turn:number;countryId:string;category:'diplomacy'|'secession'|'conflict'|'war'|'peace';action:string;summary:string;targetCountryId?:string;targetName?:string;reasonCodes:string[]}
export interface StrategicAIState {foreignPolicy:ForeignPolicyPosture;postureSinceTurn:number;targetAssessments:Record<string,StrategicAssessment>;diplomaticCooldowns:Record<string,number>;lastStrategicEvaluationTurn:number;lastMajorActionTurn:number;lastMobilizationTurn:number;currentWarStrategy:Record<string,WarStrategy>;recentStrategicDecisions:AIStrategicDecisionRecord[]}
export interface ForeignProposal {id:string;actorId:string;targetId:string;createdTurn:number;date:GameDate;kind:'treaty'|'peace'|'conflict';action?:DiplomaticAction;warId?:string;resolution?:WarResolution;conflictId?:string;conflictResolution?:'independence_recognized'|'negotiated_reintegration';summary:string}
