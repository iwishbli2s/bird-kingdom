import type {GameState, RegionRuntimeState, WorldState} from './types';

// Simulation membership and sovereign ownership are different: absorbed districts
// still belong to a country even when their assets are simulated by its government.
export const directCoreId=(id:string)=>`country-core:${id}`;
export function sovereignTerritories(world:WorldState,id:string):string[] {
  const ids=Object.values(world.regions).filter(r=>r.ownerCountryId===id).map(r=>r.id);
  if(world.countries[id]?.simulationMode==='direct'&&!world.regions[directCoreId(id)])ids.push(directCoreId(id));
  return ids;
}
export function materializeDirectCore(game:GameState,id:string):GameState {
  const c=game.world.countries[id],key=directCoreId(id);
  if(!c||c.simulationMode!=='direct'||game.world.regions[key])return game;
  const r=structuredClone(c) as unknown as RegionRuntimeState;
  r.id=key;r.ownerCountryId=id;r.simulationRole='administrative';
  const districts=Object.values(game.world.regions).filter(r=>r.ownerCountryId===id);
  // Older saves have no district ledger. Give their unknown shares the same
  // fallback weight as the heartland, without inventing or duplicating assets.
  const known=districts.reduce((s,r)=>s+(r.directAssetWeight??0),0),unknown=districts.filter(r=>r.directAssetWeight===undefined).length;
  r.directAssetWeight=Math.max(0,c.economy.gdp-known)/(unknown+1);
  r.regionIdentity={id:key,name:`${c.identity?.name??id} 본토`,primarySpeciesId:c.identity!.primarySpeciesId,createdDate:{...game.date},isDynamic:false};
  r.economy.gdp=0;for(const i of Object.values(r.economy.industries))i.output=0;
  r.population={species:{},total:0,birthsLastMonth:0,deathsLastMonth:0,netMigrationLastMonth:0};
  r.secession={};
  r.fiscal={...r.fiscal,treasury:0,debt:0,monthlyBalance:0,revenue:{incomeTax:0,corporateTax:0,consumptionTax:0,total:0},expenditure:{...r.fiscal.expenditure,emergency:0,programTotal:0,interest:0,total:0,categories:Object.fromEntries(Object.keys(r.fiscal.expenditure.categories).map(k=>[k,0])) as typeof r.fiscal.expenditure.categories}};
  return {...game,world:{...game.world,regions:{...game.world.regions,[key]:r}}};
}
export function directTerritoryShare(world:WorldState,r:RegionRuntimeState):number {
  const ids=sovereignTerritories(world,r.ownerCountryId),fallback=world.regions[directCoreId(r.ownerCountryId)]?.directAssetWeight??1;
  const weight=(id:string)=>world.regions[id]?.directAssetWeight??fallback;
  const total=ids.reduce((s,id)=>s+weight(id),0);
  return total>0?weight(r.id)/total:1/ids.length;
}
/** Asset shares are applied only at legal territorial transfer; they never
 * introduce a second monthly economy or change the direct growth formula. */
export function extractDirectTerritory(world:WorldState,r:RegionRuntimeState):{world:WorldState;region:RegionRuntimeState} {
  const c=world.countries[r.ownerCountryId];
  if(r.simulationRole!=='administrative'||c.simulationMode!=='direct')return {world,region:r};
  const share=directTerritoryShare(world,r);
  const remaining=structuredClone(c),incoming=structuredClone(c) as unknown as RegionRuntimeState;
  incoming.id=r.id;incoming.ownerCountryId=c.id;incoming.regionIdentity=r.regionIdentity;incoming.simulationRole='active';incoming.secession={};
  for(const k of Object.keys(c.economy.industries) as (keyof typeof c.economy.industries)[]){incoming.economy.industries[k].output=c.economy.industries[k].output*share;remaining.economy.industries[k].output-=incoming.economy.industries[k].output;}
  for(const x of [incoming,remaining])x.economy.gdp=Object.values(x.economy.industries).reduce((s,i)=>s+i.output,0);
  for(const id of Object.keys(c.population.species) as (keyof typeof c.population.species)[]){const a=incoming.population.species[id]!,b=remaining.population.species[id]!;for(const k of ['population','birthsLastMonth','deathsLastMonth','migrationLastMonth'] as const){a[k]=Math.round(c.population.species[id]![k]*share);b[k]-=a[k];}}
  for(const x of [incoming,remaining]){const p=Object.values(x.population.species);x.population.total=p.reduce((s,p)=>s+p.population,0);x.population.birthsLastMonth=p.reduce((s,p)=>s+p.birthsLastMonth,0);x.population.deathsLastMonth=p.reduce((s,p)=>s+p.deathsLastMonth,0);x.population.netMigrationLastMonth=p.reduce((s,p)=>s+p.migrationLastMonth,0);}
  for(const k of ['treasury','debt','monthlyBalance'] as const){incoming.fiscal[k]=c.fiscal[k]*share;remaining.fiscal[k]-=incoming.fiscal[k];}
  for(const k of Object.keys(c.fiscal.revenue) as (keyof typeof c.fiscal.revenue)[]){incoming.fiscal.revenue[k]=c.fiscal.revenue[k]*share;remaining.fiscal.revenue[k]-=incoming.fiscal.revenue[k];}
  for(const k of ['programTotal','interest','total','emergency'] as const){if(c.fiscal.expenditure[k]!==undefined){incoming.fiscal.expenditure[k]=c.fiscal.expenditure[k]!*share;remaining.fiscal.expenditure[k]!-=incoming.fiscal.expenditure[k]!;}}
  for(const k of Object.keys(c.fiscal.expenditure.categories) as (keyof typeof c.fiscal.expenditure.categories)[]){incoming.fiscal.expenditure.categories[k]=c.fiscal.expenditure.categories[k]*share;remaining.fiscal.expenditure.categories[k]-=incoming.fiscal.expenditure.categories[k];}
  return {world:{...world,countries:{...world.countries,[c.id]:remaining}},region:incoming};
}
