import type { CountryId, GameDate } from './types';
export type DiplomaticAction = 'improve'|'trade'|'non_aggression'|'defense'|'recognize'|'withdraw_recognition'|'sanction'|'lift_sanctions'|'break_non_aggression'|'break_defense'|'passage'|'support_parent';
export interface BilateralRelationState {
  countryA: CountryId; countryB: CountryId;
  relations:number; trust:number; threat:number; threatAtoB:number; threatBtoA:number;
  tradeLevel:number; baselineTradeLevel:number; nonAggressionPact:boolean; defensePact:boolean; migratoryPassageAgreement:boolean;
  sanctionsAtoB:boolean; sanctionsBtoA:boolean; recognizedAbyB:boolean; recognizedBbyA:boolean;
  monthsSinceMajorDiplomaticAction:number; relationsDeltaLastMonth:number;
  lastActionTurnA:number|null; lastActionTurnB:number|null;
  disruptionMonths:number; disruptionExposure:number; threatShockMonths:number;
}
export interface DiplomaticHistoryEntry {
  id:string; date:GameDate; turn:number; actorId:CountryId; targetId:CountryId;
  actorName:string; targetName:string; action:DiplomaticAction|'country_removed'; accepted:boolean;
  summary:string; relationSnapshots?:BilateralRelationState[];
}
export interface DiplomacyState { relations:Record<string,BilateralRelationState>; history:DiplomaticHistoryEntry[] }
