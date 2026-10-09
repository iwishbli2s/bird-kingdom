import {createHash} from 'node:crypto';
import {writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createGame,advanceMonth} from '../src/game/engine';
const baselineDirectory=resolve('.test-output/ux-baseline');
// Restore the committed 5.1 reference on a fresh checkout; never alter the working tree.
if(!existsSync(resolve(baselineDirectory,'game/engine.ts'))){
 const revision='f67322d1e72aaca4ac7d841cd40b4a6e73a07370';
 const paths=execFileSync('git',['ls-tree','-r','--name-only',revision,'src/game'],{encoding:'utf8',windowsHide:true}).trim().split(/\r?\n/);
 for(const path of paths){if(!path.startsWith('src/game/')||path.includes('..'))throw Error('Unsafe reference path');const target=resolve(baselineDirectory,path.slice(4));mkdirSync(dirname(target),{recursive:true});writeFileSync(target,execFileSync('git',['show',revision+':'+path],{windowsHide:true}));}
}
const baseline=await import(pathToFileURL(resolve(baselineDirectory,'game/engine.ts')).href);
import {createSaveData,serializeSave} from '../src/game/save';
const oldSave=await import(pathToFileURL(resolve(baselineDirectory,'game/save.ts')).href);
const hash=(g:any)=>{const {annual,...rest}=g;return createHash('sha256').update(JSON.stringify(rest)).digest('hex');};
const options={autonomousWorld:true,mortalityRiskOverride:0,electionRandom:()=>0};
const seed=1001;let before=baseline.createGame('sparrow',null,seed),after=createGame('sparrow',null,seed),baselineMs=0,reportMs=0;const checkpoints:any[]=[];
for(let i=0;i<2400;i++){
 let start=performance.now();before=baseline.advanceMonth(before,options);baselineMs+=performance.now()-start;
 start=performance.now();after=advanceMonth(after,options);reportMs+=performance.now()-start;
 if(before.turn!==i+2||after.turn!==i+2)throw Error('blocked at '+i);
 if(hash(before)!==hash(after))throw Error('simulation divergence month '+(i+1));
 if((i+1)%600===0){const old=oldSave.serializeSave(oldSave.createSaveData(before,'benchmark')),current=serializeSave(createSaveData(after,'benchmark'));checkpoints.push({months:i+1,reports:after.annual!.summaries.length,baselineBytes:Buffer.byteLength(old),saveBytes:Buffer.byteLength(current),annualBytes:Buffer.byteLength(JSON.stringify(after.annual)),identicalSimulation:true,identicalRNG:JSON.stringify(before.random)===JSON.stringify(after.random)});console.log('ANNUAL_REGRESSION',checkpoints.at(-1));}
}
writeFileSync('.test-output/annual-regression-final.json',JSON.stringify({seed,months:2400,baselineMs,reportMs,overheadPercent:(reportMs/baselineMs-1)*100,checkpoints},null,2));
