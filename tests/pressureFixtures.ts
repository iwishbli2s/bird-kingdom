import {createGame} from '../src/game/engine';
import {refreshCountryAggregates} from '../src/game/runtime';
import {statePairKey} from '../src/game/stateRelationsModel';
import type {GameState} from '../src/game/types';
export function pressureFixture(level:'stable'|'moderate'|'unstable'='unstable',seed=1001):GameState {
 const g=createGame('pigeon','eagle-state',seed),v=level==='stable'?[85,85,90,80,15,10]:level==='moderate'?[58,52,55,45,70,65]:[28,25,25,18,92,90];
 for(const r of Object.values(g.world.regions)){Object.assign(r.governance,{approval:v[0],stability:v[1],integration:v[2]});for(const p of Object.values(r.speciesPolitics))Object.assign(p,{satisfaction:v[3],autonomyDemand:v[4],independenceSentiment:v[5]});if(level==='unstable'){r.economy.unemployment=18;r.economy.inflation=9;r.social.livingStandard=32;r.social.inequality=65;}}
 for(const r of Object.values(g.world.statePolitics!.relations))Object.assign(r,{relations:level==='stable'?75:level==='moderate'?48:30,rivalry:level==='stable'?10:level==='moderate'?52:82,cooperation:level==='stable'?60:level==='moderate'?42:30});
 // Shared grievance can unite two otherwise friendly states; the rest remain tense.
 if(level!=='stable')Object.assign(g.world.statePolitics!.relations[statePairKey('eagle-state','duck-state')],{relations:64,rivalry:32,cooperation:56});
 if(level==='unstable')for(const id of ['eagle-state','duck-state'])g.world.federalPolitics![id]={nextActionTurn:1,history:[{id:'fixture-rejection:'+id,stateId:id,parentCountryId:'pigeon',action:'autonomy',level:'maximum',response:'hardline_rejection',turn:1,date:g.date}]};
 g.world=refreshCountryAggregates(g.world);return g;
}
