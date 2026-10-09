import type { CountryId, GameDate, SpeciesId } from './types';
export type SecessionPhase = 'inactive' | 'organizing' | 'autonomy_campaign' | 'referendum_campaign' | 'referendum_scheduled' | 'transition' | 'unilateral_crisis' | 'completed';
export type TerritorialDisputeStatus = 'none' | 'negotiating' | 'parent_claims_reunification';
export interface ReferendumResult { date: GameDate; yesShare: number; passed: boolean }
export interface SecessionMovementState {
  speciesId: SpeciesId; phase: SecessionPhase; grantedAutonomy: number;
  monthsInPhase: number; monthsActive: number;
  referendumScheduledInMonths: number | null; lastReferendumResult: ReferendumResult | null;
  parentCountryId: CountryId; jurisdictionId: string;
  lastRefusalTurn: number | null; lastNegotiationTurn: number | null;
  createdCountryId: CountryId | null;
}
export type SecessionState = Partial<Record<SpeciesId, SecessionMovementState>>;
export type SecessionAction = 'governor_request' | 'governor_declare' | 'organize' | 'charter' | 'expand' | 'concede' | 'refuse' | 'request' | 'approve' | 'withdraw' | 'vote' | 'agreement' | 'found' | 'declare' | 'celebrate';
export interface CountryRuntimeIdentity {
  id: CountryId; name: string; governmentLabel: string; primarySpeciesId: SpeciesId;
  foundedDate: GameDate; originCountryId: CountryId | null;
  status: 'established' | 'disputed_breakaway'; isDynamic: boolean;
  territorialDispute: TerritorialDisputeStatus;
}
export interface RegionRuntimeIdentity { id: string; name: string; primarySpeciesId: SpeciesId; createdDate: GameDate; isDynamic: boolean }
export type CountrySimulationMode = 'direct' | 'aggregate_regions';
