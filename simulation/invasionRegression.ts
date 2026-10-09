import {spawn} from 'node:child_process';import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {runSimulation} from './harness';import type {InvasionAuditRecord} from '../src/game/strategicInvasion';
import {pathToFileURL} from 'node:url';import {resolve} from 'node:path';
import {strategyObserver} from './strategyRun';
import type {GameState} from '../src/game/types';
const dir=process.env.BIRD_INVASION_OUTPUT??'.test-output/invasion-final';mkdirSync(dir,{recursive:true});const [mode,index,monthsArg]=process.argv.slice(2);
if(mode==='worker'){
 const source=process.env.BIRD_INVASION_SOURCE??'src';
 const {observeInvasionEvaluations}=await import(pathToFileURL(resolve(source,'game/strategicInvasion.ts')).href);
 const seed=1001+(+index)*7919,months=+monthsArg,audit=strategyObserver(),funnel:Record<string,number>={potential:0,legal:0,military:0,fiscal:0,eligible:0,threshold:0,declared:0},blocks:Record<string,number>={},components:Record<string,{sum:number;count:number}>={};
 const seen=new Set<string>(),declarations:any[]=[],cbSeen=new Set<string>();let elections=0;let recent:InvasionAuditRecord[]=[];
 let previousGame:GameState|undefined;
 const stop=observeInvasionEvaluations(row=>{
  if(row.turn>months+1)return; // Exclude the harness's separate post-load 120-month compatibility smoke.
  recent=recent.filter(r=>r.turn===row.turn);recent.push(row);funnel.potential++;
  for(const code of row.blockCodes)blocks[code]=(blocks[code]??0)+1;
  for(const [key,value] of Object.entries(row.contributions)){const c=components[key]??={sum:0,count:0};c.sum+=value;c.count++;}
  if(row.blockCodes.includes('LEGAL'))return;funnel.legal++;
  if(row.blockCodes.some(x=>['MILITARY','READINESS','SUPPORT','FATIGUE'].includes(x)))return;funnel.military++;
  if(row.blockCodes.includes('FISCAL'))return;funnel.fiscal++;
  if(row.blockCodes.length)return;funnel.eligible++;
  if(row.sampledScore>=row.threshold)funnel.threshold++;
 });
 const start=Date.now();
 const result=await runSimulation(seed,months,source,'normal','normal','ai',g=>{
  audit.observe(g);for(const id of Object.keys(g.world.warfare!.casusBelli))cbSeen.add(id);
  elections=g.player.career.electionsWon;
  for(const w of Object.values(g.world.warfare!.wars))if(!seen.has(w.id)){
   if(seen.size===0&&previousGame)writeFileSync(`${dir}/natural-before-${index}-${months}.json`,JSON.stringify(previousGame));
   seen.add(w.id);funnel.declared++;const detail=recent.find(r=>r.turn===g.turn&&r.actor===w.primaryAttacker&&r.target===w.primaryDefender);
   declarations.push({warId:w.id,turn:g.turn,date:{...g.date},actor:w.primaryAttacker,target:w.primaryDefender,legitimacy:w.legitimacy,...detail});
  }
  previousGame=g;
 });stop();
 writeFileSync(`${dir}/run-${index}-${months}.json`,JSON.stringify({index:+index,elapsedMs:Date.now()-start,...result,strategyAudit:audit.result(),funnel,blocks,components,declarations,cbGenerated:cbSeen.size,elections}));
}else{
 const count=mode==='pilot'?20:50,longCount=mode==='pilot'?0:10;
 const jobs=[...Array.from({length:count},(_,i)=>({index:i,months:600})),...Array.from({length:longCount},(_,i)=>({index:i,months:2400}))];let cursor=0;
 await Promise.all(Array.from({length:3},async()=>{while(cursor<jobs.length){const j=jobs[cursor++];await new Promise<void>((ok,bad)=>{const p=spawn(process.execPath,['--import','tsx','simulation/invasionRegression.ts','worker',String(j.index),String(j.months)],{stdio:'inherit',windowsHide:true});p.on('error',bad);p.on('exit',code=>code===0?ok():bad(new Error('regression failed '+j.index)));});console.log('REGRESSION',j);}}));
 writeFileSync(`${dir}/aggregate-${mode??'final'}.json`,JSON.stringify(jobs.map(j=>JSON.parse(readFileSync(`${dir}/run-${j.index}-${j.months}.json`,'utf8'))),null,2));
}
