import type { EventContext, Jurisdiction } from './eventTypes';
import type { GameState, SpeciesId } from './types';
export const scaleAbove=(value:number,threshold:number,span=50)=>Math.min(1,Math.max(0,(value-threshold)/span));
export const scaleBelow=(value:number,threshold:number,span=50)=>scaleAbove(threshold-value,0,span);
export const isMigrationSeason=(month:number)=>[3,4,5,9,10,11].includes(month);
export const jurisdictionKey=(j:Jurisdiction)=>`${j.kind}:${j.id}`;
export const cooldownKey=(j:Jurisdiction,id:string)=>`${jurisdictionKey(j)}:${id}`;
export function hasRecentEvent(game:GameState,j:Jurisdiction,id:string,months=12):boolean {
  return game.events.history.some(e=>e.eventId===id&&jurisdictionKey(e.jurisdiction)===jurisdictionKey(j)&&game.turn-e.turn>=0&&game.turn-e.turn<=months);
}
export const speciesMetric=(c:EventContext,id:SpeciesId,key:'satisfaction'|'autonomyDemand'|'independenceSentiment'|'politicalInfluence')=>c.runtime.speciesPolitics[id]?.[key]??0;
export const populationShare=(c:EventContext,id:SpeciesId)=>c.runtime.population.total>0?(c.runtime.population.species[id]?.population??0)/c.runtime.population.total:0;
export const migrantSpecies=(c:EventContext):SpeciesId=>c.runtime.population.species.swallow?'swallow':c.runtime.population.species.duck?'duck':Object.values(c.runtime.population.species)[0].speciesId;
export const majoritySpecies=(c:EventContext):SpeciesId=>Object.values(c.runtime.population.species).sort((a,b)=>b.population-a.population||a.speciesId.localeCompare(b.speciesId))[0].speciesId;
export const growthPressure=(c:EventContext)=>c.runtime.population.total>0?scaleAbove((c.runtime.population.birthsLastMonth-c.runtime.population.deathsLastMonth+c.runtime.population.netMigrationLastMonth)/c.runtime.population.total*1200,.8,2):0;

export const minoritySpecies=(c:EventContext):SpeciesId=>Object.values(c.runtime.population.species).filter(p=>p.speciesId!==majoritySpecies(c)).sort((a,b)=>speciesMetric(c,a.speciesId,'satisfaction')-speciesMetric(c,b.speciesId,'satisfaction')||a.speciesId.localeCompare(b.speciesId))[0]?.speciesId??majoritySpecies(c);
