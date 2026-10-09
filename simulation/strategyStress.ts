import {advanceMonth} from '../src/game/engine';import {federalStrategyFixture} from '../tests/strategyFixtures';import {refreshCountryAggregates} from '../src/game/runtime';import {strategyObserver} from './strategyRun';import {assertWorld} from './harness';import {writeFileSync} from 'node:fs';
const results=[];for(let seed=0;seed<3;seed++){
 let g=federalStrategyFixture(41001+seed);g.turn=5;g.date={year:2030,month:5};
 for(const [id,r] of Object.entries(g.world.regions))if(id!=='eagle-state'){Object.assign(r.governance,{approval:58,stability:52,integration:55});for(const p of Object.values(r.speciesPolitics))Object.assign(p,{autonomyDemand:70,independenceSentiment:65,satisfaction:45});}
 const r=g.world.regions['eagle-state'];r.governance.integration=15;Object.assign(r.secession!.eagle!,{phase:'autonomy_campaign',monthsActive:30,monthsInPhase:12});
 const h=g.world.federalPolitics!['eagle-state'].history[0];Object.assign(h,{turn:4,date:{year:2030,month:4}});g.world.federalPolitics!['eagle-state'].history.push({...h,id:'prior-rejection-2',turn:5,date:g.date});g.world=refreshCountryAggregates(g.world);
 const observer=strategyObserver(),start=Date.now();for(let month=0;month<600;month++){const before=g.turn;g=advanceMonth(g,{autonomousWorld:true,mortalityRiskOverride:0,electionRandom:()=>0});if(g.turn===before)throw new Error('stress observer blocked: '+g.gameOverReason);assertWorld(g);observer.observe(g);}
 results.push({seed:41001+seed,elapsedMs:Date.now()-start,...observer.result()});console.log('STRESS',results.at(-1));
}writeFileSync('.test-output/strategy-stress.json',JSON.stringify(results,null,2));
