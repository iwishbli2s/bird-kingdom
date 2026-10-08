import type { GameDate } from './types';
export type ConflictStatus = 'political_standoff' | 'armed_conflict' | 'ceasefire' | 'negotiation' | 'resolved';
export type ConflictResolution = 'independence_recognized' | 'independence_defended' | 'negotiated_reintegration' | 'forced_reintegration';
export type ConflictAction = 'administrative_shift' | 'supply' | 'public_opinion' | 'pressure' | 'blockade' | 'escalate' | 'ceasefire' | 'negotiate' | 'fail_negotiation' | 'recognize' | 'accept_autonomy' | 'force_reintegrate' | 'defend_independence';
export interface InternalConflictState {
  id:string; parentCountryId:string; breakawayCountryId:string;
  parentName:string; breakawayName:string; regionIds:string[];
  status:ConflictStatus; startedDate:GameDate; resolvedDate:GameDate|null;
  territorialControl:number; tension:number;
  parentWarSupport:number; breakawayWarSupport:number;
  parentCapability:number; breakawayCapability:number;
  parentLogistics:number; breakawayLogistics:number;
  parentFatigue:number; breakawayFatigue:number;
  monthsInConflict:number; monthsInStatus:number; stalemateMonths:number;
  parentDominanceMonths:number; breakawayDominanceMonths:number;
  foundingIndependence:number; economicShare:number;
  lastHardlineTurn:number|null; lastEventTurn:number|null;
  resolution:ConflictResolution|null;
}
