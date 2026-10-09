import type { CountryId, GameDate, RegionId } from './types';
export interface MilitaryState {
  readiness:number; mobilization:number; mobilizationTarget:number; logistics:number; warSupport:number; fatigue:number;
  capability:number; effectiveDefenseBudget:number; activeWars:string[]; readinessDeltaLastMonth:number;
}
export type WarGoal='border_claim'|'reunification'|'defense'|'punitive'|'recognition';
export type CasusBelliType='territorial_dispute'|'breakaway_claim'|'sanctions_escalation'|'border_incident'|'ally_attacked';
export interface CasusBelliState {
  id:string; holderCountryId:CountryId; targetCountryId:CountryId; type:CasusBelliType; createdDate:GameDate;
  expiresInMonths:number|null; targetRegionId:RegionId|null; consumed:boolean;
}
export interface WarParticipantState {countryId:CountryId; side:'attacker'|'defender'; warSupport:number; fatigue:number; contribution:number}
export interface WarFrontState {regionId:RegionId; originalOwnerCountryId:CountryId; controllerCountryId:CountryId; control:number; decisiveMonths:number}
export type WarResolution='status_quo'|'territory_transfer'|'recognition'|'abandon_reunification'|'reparations'|'defense_success';
export type WarLegitimacy='justified'|'unjustified';
export interface AggressionRecord {warId:string;attackerCountryId:CountryId;defenderCountryId:CountryId;startedDate:GameDate;legitimacy:WarLegitimacy;elapsedMonths:number}
export interface InterstateWarState {
  legitimacy:WarLegitimacy; casusBelliType?:CasusBelliType;
  capabilityAtStart?:Record<string,number>;
  id:string; attackers:CountryId[]; defenders:CountryId[]; primaryAttacker:CountryId; primaryDefender:CountryId;
  countryNames:Record<string,string>; status:'active'|'ceasefire'|'peace_negotiation'|'resolved'; warGoal:WarGoal;
  startedDate:GameDate; resolvedDate:GameDate|null; fronts:WarFrontState[]; participants:Record<string,WarParticipantState>;
  monthsAtWar:number; monthsInStatus:number; strategicControl:number; resolution:WarResolution|null;
}
export interface TruceState {countryA:CountryId;countryB:CountryId;remainingMonths:number}
export interface AllyRequest {id:string;warId:string;requesterCountryId:CountryId;allyCountryId:CountryId;status:'pending'|'accepted'|'declined'}
export interface WarfareHistoryEntry {id:string;date:GameDate;turn:number;warId:string|null;summary:string;countryNames:Record<string,string>}
export interface WarfareState {aggressionHistory?:AggressionRecord[];wars:Record<string,InterstateWarState>;casusBelli:Record<string,CasusBelliState>;truces:Record<string,TruceState>;allyRequests:AllyRequest[];history:WarfareHistoryEntry[]}
export type WarAction='ceasefire'|'negotiate'|'resume'|'supply'|'protest'|'tailwind'|'headwind';
