import { initialAutonomy } from './secessionConfig';
import type { PopulationState, SecessionState } from './types';
export function createSecessionState(id:string,parentCountryId:string,population:PopulationState):SecessionState {
  return Object.fromEntries(Object.values(population.species).map(p=>[p.speciesId,{speciesId:p.speciesId,phase:'inactive',grantedAutonomy:initialAutonomy[id]?.[p.speciesId]??25,
    monthsInPhase:0,monthsActive:0,referendumScheduledInMonths:null,lastReferendumResult:null,parentCountryId,jurisdictionId:id,lastRefusalTurn:null,lastNegotiationTurn:null,createdCountryId:null}]));
}
