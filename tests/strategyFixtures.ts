import {createGame} from '../src/game/engine';
import {getBilateralRelation} from '../src/game/diplomacy';
import {pressureFixture} from './pressureFixtures';
import {refreshCountryAggregates} from '../src/game/runtime';
export function invasionFixture(seed=1001){const g=createGame('sparrow',null,seed);g.turn=30;g.date={year:2032,month:6};
 for(const id of ['sparrow','pigeon']){const c=g.world.countries[id];Object.assign(c.military!,{capability:id==='pigeon'?160:35,readiness:85,warSupport:85,fatigue:0});c.fiscal.treasury=c.economy.gdp*.2;}
 for(const r of Object.values(g.world.regions))Object.assign(r.governance,{approval:85,stability:85});
 Object.assign(g.world.countries.sparrow.governance!,{approval:80,stability:85});
 Object.assign(getBilateralRelation(g.world,'pigeon','sparrow')!,{relations:-55,trust:15,tradeLevel:0,nonAggressionPact:false,defensePact:false});
 g.world.governmentAI!['country:pigeon'].profile='security';g.world=refreshCountryAggregates(g.world);return g;
}
export function federalStrategyFixture(seed=1001){const g=pressureFixture('unstable',seed);g.player.controlledCountryId='sparrow';g.player.controlledRegionId=null;g.turn=30;g.date={year:2032,month:6};
 const r=g.world.regions['eagle-state'];Object.assign(r.governance,{approval:85,stability:75});r.fiscal.treasury=r.economy.gdp*.2;
 for(const p of Object.values(r.speciesPolitics))Object.assign(p,{independenceSentiment:92,autonomyDemand:92,satisfaction:18});
 g.world=refreshCountryAggregates(g.world);return g;
}
