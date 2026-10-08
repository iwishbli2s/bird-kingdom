import { governmentDescriptors } from './government';
import { synchronizeStrategicAI } from './strategicState';
import { aiConfig } from './aiConfig';
import type { AIGovernmentProfile, GovernmentDescriptor, GovernmentAIState, WorldState } from './types';
const starting:Record<string,AIGovernmentProfile>={'country:sparrow':'industrial','country:pigeon':'balanced','region:pigeon-state':'social','region:eagle-state':'security','region:owl-state':'research','region:duck-state':'agricultural'};
export function inferGovernmentProfile(world:WorldState,g:GovernmentDescriptor):AIGovernmentProfile {
 if(starting[g.id]&&!world.countries[g.countryId].identity?.isDynamic)return starting[g.id];
 const r=g.jurisdiction.kind==='region'?world.regions[g.jurisdiction.id]:world.countries[g.countryId],c=world.countries[g.countryId];
 const primary=g.id.startsWith('country:')?c.identity?.primarySpeciesId:world.regions[g.jurisdiction.id].regionIdentity?.primarySpeciesId;
 if(primary==='eagle')return 'security';if(primary==='owl')return 'research';if(primary==='duck')return 'agricultural';
 const e=r.economy,total=Math.max(1,e.gdp);if(e.industries.agriculture.output/total>.3)return 'agricultural';if(e.industries.advanced.output/total>.3)return 'research';if(e.industries.manufacturing.output/total>.25)return 'industrial';
 return world.governmentAI?.['country:'+(c.identity?.originCountryId??'')]?.profile??'balanced';
}
export function createGovernmentAI(profile:AIGovernmentProfile):GovernmentAIState {return {profile,currentStrategy:'normal',strategyMonths:0,policyCooldowns:{taxes:0,budget:0,research:0},lastDecisionMonth:0,recentDecisions:[],economicHistory:[]};}
export function synchronizeGovernmentAI(world:WorldState):WorldState {
 return synchronizeStrategicAI({...world,governmentAI:Object.fromEntries(governmentDescriptors(world).map(g=>{const old=world.governmentAI?.[g.id]??createGovernmentAI(inferGovernmentProfile(world,g));return [g.id,{...old,recentDecisions:old.recentDecisions.slice(0,aiConfig.recordLimit)}];}))});
}
