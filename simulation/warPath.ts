import {createGame,advanceMonth} from '../src/game/engine';
import {scenario,modules} from './harness';
import {writeFileSync,mkdirSync} from 'node:fs';
const m=await modules(),results=[];
for(const name of ['war','asymmetric']){let g=await scenario(createGame('sparrow',undefined,2030),name,m);const rows=[];for(let i=0;i<36;i++){g=advanceMonth(g,{autonomousWorld:true,mortalityRiskOverride:0,electionRandom:()=>0});if([1,6,12,24,30,36].includes(i+1))rows.push({month:i+1,military:Object.values(g.world.countries).map(c=>({id:c.id,capability:c.military!.capability,readiness:c.military!.readiness})),wars:Object.values(g.world.warfare!.wars).map(w=>({status:w.status,control:w.strategicControl,resolution:w.resolution}))});}results.push({scenario:name,rows});}
mkdirSync('simulation/results/war-path',{recursive:true});writeFileSync('simulation/results/war-path/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
