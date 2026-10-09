import {createSeededRandom} from './random';
import {derivedCountryRuntime} from './runtime';
import type {GameState} from './types';
import type {AIGovernmentProfile} from './aiTypes';

export interface StrategicConflictProfile {
 aggression:number;caution:number;opportunism:number;escalationBias:number;
 deescalationBias:number;autonomyTolerance:number;diplomaticRiskTolerance:number;
}
const clamp=(n:number)=>Math.max(0,Math.min(100,n));
const origins:Record<string,number[]>={sparrow:[28,76,48,30,70,65,28],pigeon:[46,58,54,50,57,40,43],
 'pigeon-state':[35,65,62,43,65,35,35],'eagle-state':[75,35,70,72,35,32,70],
 'owl-state':[40,70,78,45,63,70,40],'duck-state':[30,73,50,36,72,73,30]};
const fields=(['aggression','caution','opportunism','escalationBias','deescalationBias','autonomyTolerance','diplomaticRiskTolerance'] as const);
/** Seeded conflict substream: no UI/election RNG consumption or persistent personality state. */
export function conflictSample(g:GameState,id:string,purpose:string,turn=g.turn){
 let seed=(g.random?.conflict.seed??1)^Math.imul(turn,2654435761);
 for(const c of id+':'+purpose)seed=Math.imul(seed^c.charCodeAt(0),16777619);
 return createSeededRandom(seed>>>0)();
}
export function strategicConflictProfile(g:GameState,id:string):StrategicConflictProfile {
 const region=g.world.regions[id],country=region?g.world.countries[region.ownerCountryId]:g.world.countries[id];
 if(!country)throw new Error('AI 성향의 운영 대상이 존재하지 않습니다.');
 const identity=country.identity,origin=region?id:identity?.isDynamic?(origins[identity.primarySpeciesId+'-state']?identity.primarySpeciesId+'-state':identity.originCountryId??id):id;
 const base=origins[origin]??origins[id]??origins.pigeon;
 const dynamic=!region&&identity?.isDynamic;
 const values=base.map(n=>dynamic?n*.65+50*.35:n);
 const profile:AIGovernmentProfile=g.world.governmentAI?.[(region?'region:':'country:')+id]?.profile??'balanced';
 if(profile==='security'){values[0]+=7;values[3]+=5;}if(profile==='social'){values[4]+=6;values[5]+=6;}
 if(profile==='research'){values[1]+=5;values[2]+=5;}if(profile==='industrial')values[2]+=5;
 if(profile==='agricultural'){values[1]+=4;values[4]+=4;}
 const runtime=region??derivedCountryRuntime(g.world,id),military=country.military;
 const wars=Object.values(g.world.warfare?.wars??{}).filter(w=>w.status==='resolved'&&w.participants[country.id]);
 const recent=wars.filter(w=>{const date=w.resolvedDate??w.startedDate;return (g.date.year-date.year)*12+g.date.month-date.month<=120;});
 const success=recent.filter(w=>w.primaryAttacker===country.id&&w.legitimacy==='unjustified'&&w.strategicControl>=75).length;
 const failure=recent.filter(w=>w.primaryAttacker===country.id&&w.strategicControl<30).length;
 values[0]+=Math.min(10,success*3)-Math.min(15,failure*5);values[2]+=Math.min(8,success*2);
 values[1]+=Math.min(18,failure*6)+(military?.fatigue??0)*.1;
 if(dynamic){values[3]+=(100-runtime.governance!.integration)*.06;values[0]+=identity?.status==='disputed_breakaway'?5:0;}
 const fiscal=runtime.fiscal.treasury/Math.max(1,runtime.economy.gdp);
 values[1]+=fiscal<.005?8:0;values[4]+=(100-runtime.governance!.stability)*.08;
 return Object.fromEntries(fields.map((key,i)=>[key,clamp(values[i]+(conflictSample(g,id,'personality:'+key,0)-.5)*12)])) as unknown as StrategicConflictProfile;
}
