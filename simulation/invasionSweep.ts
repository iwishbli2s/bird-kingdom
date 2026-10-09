import {spawn} from 'node:child_process';import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {runSimulation} from './harness';import {pathToFileURL} from 'node:url';import {resolve} from 'node:path';
const candidates={A:{minimumRatio:1.22,threshold:66},B:{minimumRatio:1.20,threshold:65},C:{minimumRatio:1.18,threshold:64},
 D:{minimumRatio:1.20,threshold:65},E:{minimumRatio:1.18,threshold:64},F:{minimumRatio:1.22,threshold:66},G:{minimumRatio:1.22,threshold:65},H:{minimumRatio:1.22,threshold:65},I:{minimumRatio:1.21,threshold:65},J:{minimumRatio:1.20,threshold:66}};
const dir=process.env.BIRD_INVASION_OUTPUT??'.test-output/invasion-sweep-current';mkdirSync(dir,{recursive:true});
const [mode,label,index]=process.argv.slice(2);
if(mode==='worker'){
 const source=process.env.BIRD_INVASION_SOURCE??'src';
 const {invasionConfig}=await import(pathToFileURL(resolve(source,'game/strategicInvasion.ts')).href);
 Object.assign(invasionConfig,candidates[label as keyof typeof candidates]);
 const result=await runSimulation(1001+(+index)*7919,600,source,'normal','normal','ai');
 // Optional frozen source permits historical comparisons; defaults to the current game.
 writeFileSync(`${dir}/${label}-${index}.json`,JSON.stringify({label,index:+index,config:candidates[label as keyof typeof candidates],...result}));
}else{
 const jobs=(mode?mode.split(','):['A','B','C']).flatMap(candidate=>Array.from({length:Number(label)||6},(_,i)=>({label:candidate,index:i+(Number(index)||0)})));let cursor=0;
 await Promise.all(Array.from({length:2},async()=>{while(cursor<jobs.length){const j=jobs[cursor++];await new Promise<void>((ok,bad)=>{const p=spawn(process.execPath,['--import','tsx','simulation/invasionSweep.ts','worker',j.label,String(j.index)],{stdio:'inherit',windowsHide:true});p.on('error',bad);p.on('exit',code=>code===0?ok():bad(new Error('sweep failed')));});console.log('SWEEP',j);}}));
 writeFileSync(`${dir}/aggregate-${mode??'ABC'}.json`,JSON.stringify(jobs.map(j=>JSON.parse(readFileSync(`${dir}/${j.label}-${j.index}.json`,'utf8'))),null,2));
}
