import {runSimulation,mean} from './harness';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
const dir='.test-output/sovereignty-long';mkdirSync(dir,{recursive:true});
const args=process.argv.slice(2);
if(args[0]==='worker'){const [,seed,months,file]=args;writeFileSync(file,JSON.stringify(await runSimulation(+seed,+months)));}
else {
  const jobs=[...Array.from({length:20},(_,i)=>({seed:1001+i*7919,months:600})),...Array.from({length:5},(_,i)=>({seed:1001+i*7919,months:2400}))];
  let index=0;const results:any[]=[];
  await Promise.all(Array.from({length:3},async()=>{while(index<jobs.length){const n=index++,j=jobs[n],file=`${dir}/run-${n}.json`;
    await new Promise<void>((ok,bad)=>{const p=spawn(process.execPath,['--import','tsx','simulation/sovereigntyRun.ts','worker',String(j.seed),String(j.months),file],{stdio:'inherit',windowsHide:true});p.on('error',bad);p.on('exit',c=>c===0?ok():bad(new Error('worker failed '+n)));});
    results.push(JSON.parse(readFileSync(file,'utf8')));console.log('COMPLETE',n,j.months);
  }}));
  const summaries=[600,2400].map(months=>{const r=results.filter(x=>x.months===months);return {months,seeds:r.length,initialDissolutions:r.reduce((s,x)=>s+x.initialDissolved,0),totalDissolutions:r.reduce((s,x)=>s+x.dissolved,0),singleCountryRuns:r.filter(x=>x.singleCountryMonths>0).length,meanActiveCountries:mean(r.map(x=>x.meanActiveCountries))};});
  writeFileSync(`${dir}/aggregate.json`,JSON.stringify({summaries,results},null,2));console.log(JSON.stringify(summaries));
}
