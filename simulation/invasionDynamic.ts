import {runSimulation} from './harness';import {writeFileSync} from 'node:fs';
const results=[];
for(const source of (process.argv[2]?[process.argv[2]]:['.test-output/strategy-5-baseline','src']))for(let i=0;i<3;i++){
 const start=Date.now(),result=await runSimulation(50001+i*7919,600,source,'separatism','normal','ai');
 results.push({...result,elapsedMs:Date.now()-start});console.log('DYNAMIC',source,i,{wars:result.wars,countries:result.finalCountryCount,created:result.independences,dissolved:result.initialDissolved});
 writeFileSync(`.test-output/invasion-dynamic${process.argv[3]?'-'+process.argv[3]:''}.json`,JSON.stringify(results,null,2));
}
