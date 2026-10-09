import {runSimulation,distribution} from './harness';
import {evaluateInvasion} from '../src/game/strategicInvasion';
import {writeFileSync} from 'node:fs';
const results=[];
for(let index=0;index<6;index++){
 const rows:any[]=[],blocks:Record<string,number>={};let candidates=0,legal=0,military=0,fiscal=0,passed=0;
 const result=await runSimulation(1001+index*7919,600,'src','normal','normal','ai',g=>{
  if(g.turn%3!==0)return;
  for(const actor of Object.keys(g.world.countries))for(const target of Object.keys(g.world.countries))if(actor!==target){
   const e=evaluateInvasion(g,actor,target),d=e.diagnostics;candidates++;
   for(const code of d.blockCodes)blocks[code]=(blocks[code]??0)+1;
   if(!d.blockCodes.includes('LEGAL'))legal++;if(!d.blockCodes.includes('MILITARY'))military++;if(!d.blockCodes.includes('FISCAL'))fiscal++;
   passed+=Number(e.sampledUtility>=67);
   rows.push({turn:g.turn,actor,target,ratio:e.ratio,...d});
  }
 });
 results.push({index,result,candidates,legal,military,fiscal,passed,blocks,rows});
 console.log('AUDIT',index,{candidates,legal,military,fiscal,passed,blocks,ratio:distribution(rows.filter(r=>r.actor==='pigeon').map(r=>r.ratio)),score:distribution(rows.filter(r=>r.actor==='pigeon').map(r=>r.score)),max:rows.sort((a,b)=>b.score-a.score).slice(0,2)});
 writeFileSync('.test-output/invasion-baseline-audit.json',JSON.stringify(results,null,2));
}
