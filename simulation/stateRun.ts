import {runSimulation,mean} from './harness';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
const dir='.test-output/state-long';mkdirSync(dir,{recursive:true});
const args=process.argv.slice(2);
if(args[0]==='worker'){const [,seed,months,file]=args;let minRelation=100,maxRivalry=0,minCooperation=100,maxBlocs=0,maxBlocAge=0,allHostileMonths=0,actionCount=0;const actionIds=new Set<string>(),mediationIds=new Set<string>(),favorites:Record<string,number>={};const output=await runSimulation(+seed,+months,'src','normal','normal','ai',g=>{const p=g.world.statePolitics!,pairs=Object.values(p.relations).filter(r=>r.active),blocs=p.blocs.filter(b=>b.active);minRelation=Math.min(minRelation,...pairs.map(r=>r.relations));maxRivalry=Math.max(maxRivalry,...pairs.map(r=>r.rivalry));minCooperation=Math.min(minCooperation,...pairs.map(r=>r.cooperation));maxBlocs=Math.max(maxBlocs,blocs.length);maxBlocAge=Math.max(maxBlocAge,...blocs.map(b=>g.turn-b.createdTurn));allHostileMonths+=Number(pairs.length>0&&pairs.every(r=>r.relations<5));for(const r of pairs){for(const h of r.history)actionIds.add(h.id);for(const m of r.mediations)if(!mediationIds.has(m.id)){mediationIds.add(m.id);if(m.favoredStateId)favorites[m.favoredStateId]=(favorites[m.favoredStateId]??0)+1;}}});writeFileSync(file,JSON.stringify({...output,stateAudit:{minRelation,maxRivalry,minCooperation,maxBlocs,maxBlocAge,allHostileMonths,actionCount:actionIds.size,mediationCount:mediationIds.size,favorites}}));}
else {
  const jobs=[...Array.from({length:20},(_,i)=>({seed:1001+i*7919,months:600})),...Array.from({length:5},(_,i)=>({seed:1001+i*7919,months:2400}))];
  let index=0;const results:any[]=[];
  await Promise.all(Array.from({length:3},async()=>{while(index<jobs.length){const n=index++,j=jobs[n],file=`${dir}/run-${n}.json`;
    await new Promise<void>((ok,bad)=>{const p=spawn(process.execPath,['--import','tsx','simulation/stateRun.ts','worker',String(j.seed),String(j.months),file],{stdio:'inherit',windowsHide:true});p.on('error',bad);p.on('exit',c=>c===0?ok():bad(new Error('worker failed '+n)));});
    results.push(JSON.parse(readFileSync(file,'utf8')));console.log('COMPLETE',n,j.months);
  }}));
  const summaries=[600,2400].map(months=>{const r=results.filter(x=>x.months===months);return {months,seeds:r.length,initialDissolutions:r.reduce((s,x)=>s+x.initialDissolved,0),totalDissolutions:r.reduce((s,x)=>s+x.dissolved,0),singleCountryRuns:r.filter(x=>x.singleCountryMonths>0).length,meanActiveCountries:mean(r.map(x=>x.meanActiveCountries))};});
  writeFileSync(`${dir}/aggregate.json`,JSON.stringify({summaries,results},null,2));console.log(JSON.stringify(summaries));
}
