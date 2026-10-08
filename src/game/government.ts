import { controlledRegionId, countryInfo, derivedCountryRuntime, ownedRegions, regionInfo } from './runtime';
import type { GameState, GovernmentDescriptor, Jurisdiction, WorldState } from './types';
export function governmentDescriptors(world:WorldState):GovernmentDescriptor[]{
 const countries=Object.values(world.countries).map(c=>{const members=ownedRegions(world,c.id),single=c.identity?.isDynamic&&members.length===1;
  return {id:'country:'+c.id,name:c.identity?.name??c.id,countryId:c.id,jurisdiction:single?{kind:'region' as const,id:members[0].id}:{kind:'country' as const,id:c.id},federal:c.simulationMode==='aggregate_regions'&&!single};});
 const regions=Object.values(world.regions).filter(r=>r.simulationRole!=='administrative'&&!(world.countries[r.ownerCountryId]?.identity?.isDynamic&&ownedRegions(world,r.ownerCountryId).length===1)).map(r=>({id:'region:'+r.id,name:r.regionIdentity?.name??r.id,countryId:r.ownerCountryId,jurisdiction:{kind:'region' as const,id:r.id},federal:false}));
 return [...countries,...regions].sort((a,b)=>a.id.localeCompare(b.id));
}
export function getGovernment(world:WorldState,id:string):GovernmentDescriptor {const g=governmentDescriptors(world).find(g=>g.id===id);if(!g)throw new Error('유효한 정부가 아닙니다.');return g;}
export function governmentRuntime(world:WorldState,g:GovernmentDescriptor){return g.jurisdiction.kind==='region'?world.regions[g.jurisdiction.id]:derivedCountryRuntime(world,g.countryId);}
export function controlledGovernmentId(game:GameState):string {
 const c=game.world.countries[game.player.controlledCountryId];if(c?.identity?.isDynamic)return 'country:'+c.id;
 const region=controlledRegionId(game);return region?'region:'+region:'country:'+game.player.controlledCountryId;
}
export function governmentForJurisdiction(game:GameState,j:Jurisdiction):GovernmentDescriptor|undefined {return governmentDescriptors(game.world).find(g=>g.jurisdiction.kind===j.kind&&g.jurisdiction.id===j.id);}
export function governmentName(game:GameState,g:GovernmentDescriptor){return g.id.startsWith('country:')?countryInfo(game,g.countryId).name:regionInfo(game,g.jurisdiction.id)?.name??g.name;}
