import {createGame,advanceMonth} from '../src/game/engine';
import {getEventDefinition} from '../src/game/events';
import {assertWorld,distribution} from './harness';
import {balanceConfig} from '../src/game/balanceConfig';
import {difficultyConfig} from '../src/game/difficulty';
import {mkdirSync,writeFileSync} from 'node:fs';
let g=createGame('sparrow',undefined,2030),seenEvents=new Set<string>(),seenDiplomacy=new Set<string>();
const tones:Record<string,number>={},actions:Record<string,number>={},gaps:number[]=[],lastEvent:Record<string,number>={},observations:any[]=[];
for(let i=0;i<2400;i++){
 g=advanceMonth(g,{autonomousWorld:true,mortalityRiskOverride:0,electionRandom:()=>0});
 for(const e of g.events.history)if(!seenEvents.has(e.id)){seenEvents.add(e.id);const tone=getEventDefinition(e.eventId).tone;tones[tone]=(tones[tone]??0)+1;const key=e.jurisdiction.kind+':'+e.jurisdiction.id;if(lastEvent[key])gaps.push(e.turn-lastEvent[key]);lastEvent[key]=e.turn;}
 for(const e of g.world.diplomacy!.history)if(!seenDiplomacy.has(e.id)){seenDiplomacy.add(e.id);actions[e.action]=(actions[e.action]??0)+1;}
 if((i+1)%120===0){assertWorld(g);observations.push({months:i+1,profiles:[g.world.countries.sparrow,...Object.values(g.world.regions).filter(r=>r.simulationRole!=='administrative')].map(r=>({id:r.id,economy:{growth:r.economy.growth,unemployment:r.economy.unemployment,inflation:r.economy.inflation},population:{total:r.population.total,births:r.population.birthsLastMonth,deaths:r.population.deathsLastMonth,migration:r.population.netMigrationLastMonth,shares:Object.fromEntries(Object.entries(r.population.species).map(([id,s])=>[id,s!.population/r.population.total]))},social:r.social,governance:r.governance,speciesPolitics:r.speciesPolitics,treasuryRatio:r.fiscal.treasury/r.economy.gdp,debtRatio:r.fiscal.debt/r.economy.gdp,technology:r.technology}))});}
}
mkdirSync('simulation/results/audit',{recursive:true});writeFileSync('simulation/results/audit/results.json',JSON.stringify({seed:2030,months:2400,tones,eventGaps:distribution(gaps),diplomaticActions:actions,observations},null,2));writeFileSync('simulation/results/final/config.json',JSON.stringify({balanceConfig,difficultyConfig},null,2));console.log('COMPLETE audit',JSON.stringify({tones,eventGaps:distribution(gaps),actions}));
