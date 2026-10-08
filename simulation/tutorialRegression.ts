import {runSimulation} from './harness';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const before=JSON.parse(readFileSync('simulation/results/convergence/aggregate.json','utf8')).results.find((r:any)=>r.seed===1001&&r.months===600&&r.scenario==='normal');
// Compare in the same serialized representation as the preserved 10B-1.5 results.
const after=JSON.parse(JSON.stringify(await runSimulation(1001,600)));
assert.deepEqual(after,before);
mkdirSync('simulation/results/tutorial',{recursive:true});
writeFileSync('simulation/results/tutorial/regression-600.json',JSON.stringify({seed:1001,months:600,beforeGDP:before.gdpRatio,afterGDP:after.gdpRatio,identical:true,result:after},null,2));
console.log('PASS 600-month historical 10B-1.5 baseline: every serialized metric/checkpoint identical',after.gdpRatio);
