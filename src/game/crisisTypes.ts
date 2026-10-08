import type { GameDate, Jurisdiction } from './types';
export type CrisisCategory = 'disaster' | 'disease';
export type CrisisType = 'great_storm'|'hail_damage'|'wetland_drought'|'reed_fire'|'nest_cliff_failure'|'corridor_icing'|'seed_blight'|'respiratory_outbreak'|'feather_mite_outbreak'|'wetland_contamination';
export interface ActiveCrisisState {
 id:string; type:CrisisType; category:CrisisCategory; jurisdictionId:string; jurisdictionKind:Jurisdiction['kind'];
 severity:number; intensity:number; phase:'active'|'recovery'; elapsedMonths:number; remainingMonths:number; recoveryProgress:number;
 sourceEventId:string|null; originJurisdictionId?:string; totalPopulationImpact:number; totalFiscalCost:number;
 isContained:boolean; spreadPressure:number; responseProtection:number; activityReduction:number;
 startedTurn:number;
}
export interface CrisisHistoryEntry { id:string; crisisId:string; type:CrisisType; date:GameDate; turn:number; jurisdictionName:string; jurisdiction:Jurisdiction; action:'start'|'complete'|'aid'|'transfer'|'retired'; summary:string; populationImpact:number; fiscalCost:number; elapsedMonths:number }
export interface CrisisSystemState { activeCrises:Record<string,ActiveCrisisState>; history:CrisisHistoryEntry[]; nextId:number }
export interface CrisisResilience { infrastructure:number; medical:number; emergencyResponse:number; foodSecurity:number; information:number }
export interface TemporaryLeaderRiskModifier { id:string; value:number; expiresTurn:number; jurisdiction:Jurisdiction }
export interface LeaderRiskState { situationalRisk:number; disasterExposure:number; diseaseExposure:number; conflictExposure:number; politicalRisk:number; mortalityModifierLastMonth:number; factors:string[] }
export interface CrisisImpact { damage:number; mortalityMultiplier:number; migrationAdjustment:number; social:Partial<Record<'livingStandard'|'publicSafety'|'healthcare'|'inequality',number>>; duckSatisfaction:number; logisticsPenalty:number }
