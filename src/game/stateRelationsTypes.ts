import type {GameDate} from './types';
export type StateAction='criticize'|'counter_policy'|'mediate'|'statement'|'joint_autonomy'|'cooperate'|'negotiate';
export type StateResponse='ignore'|'rebut'|'counterattack'|'mediation'|'cooperation'|'de_escalation';
export type BlocPurpose='autonomy'|'fiscal'|'security'|'economic'|'anti_rival';
export type FederalMediation='neutral_mediation'|'favor_state_a'|'favor_state_b'|'ignore'|'compromise';
export interface StateActionRecord {id:string;turn:number;date:GameDate;actorId:string;targetId:string;action:StateAction;response:StateResponse;accepted:boolean;reasonCodes:string[]}
export interface StateMediationRecord {id:string;turn:number;date:GameDate;outcome:FederalMediation;favoredStateId:string|null}
export interface InterstateFederalRelation {
 stateAId:string;stateBId:string;active:boolean;relations:number;rivalry:number;cooperation:number;
 history:StateActionRecord[];mediations:StateMediationRecord[];actionCooldownUntilTurn:number;
}
export interface FederalStateBloc {id:string;memberStateIds:string[];originalMemberStateIds:string[];purpose:BlocPurpose;rivalStateId:string|null;createdTurn:number;expiresTurn:number;cohesion:number;active:boolean;endReason:string|null}
export interface FederalStatePolitics {relations:Record<string,InterstateFederalRelation>;blocs:FederalStateBloc[];actionCooldowns:Record<string,number>}
export interface StateInterestConflictAssessment {fiscalConflict:number;economicCompetition:number;politicalCompetition:number;autonomyConflict:number;speciesConflict:number;overallConflict:number;reasonCodes:string[]}
