import {advanceMonth} from '../src/game/engine';import {pressureFixture} from '../tests/pressureFixtures';
import {invasionFixture} from '../tests/strategyFixtures';import {strategyObserver} from './strategyRun';
import {assertWorld} from './harness';import {writeFileSync} from 'node:fs';
const results=[];
for(const level of ['stable','moderate','unstable','aggressive','cautious'] as const)for(let seed=0;seed<3;seed++){
 let g=level==='aggressive'||level==='cautious'?invasionFixture(8001+seed*7919):pressureFixture(level,8001+seed*7919);
 if(level==='aggressive'){Object.assign(g.world.countries.sparrow.military!,{readiness:10,mobilization:0,mobilizationTarget:0,effectiveDefenseBudget:0,fatigue:80});Object.assign(g.world.countries.pigeon.military!,{readiness:90,mobilization:60,mobilizationTarget:60,fatigue:0});}
 if(level==='cautious'){g.world.governmentAI!['country:pigeon'].profile='social';Object.assign(g.world.countries.pigeon.military!,{readiness:20,fatigue:70});g.world.countries.pigeon.fiscal.treasury=0;}
 const observer=strategyObserver(),start=Date.now();for(let month=0;month<240;month++){g=advanceMonth(g,{autonomousWorld:true,mortalityRiskOverride:0,electionRandom:()=>0});observer.observe(g);assertWorld(g);}
 results.push({level,seed,elapsedMs:Date.now()-start,...observer.result()});console.log('CONDITIONAL',level,seed,results.at(-1));
}
writeFileSync('.test-output/strategy-conditional.json',JSON.stringify(results,null,2));
