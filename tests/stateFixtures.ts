import {createGame} from '../src/game/engine';
import {statePairKey} from '../src/game/stateRelationsModel';
import {refreshCountryAggregates} from '../src/game/runtime';
export function stateFixture(kind:'friend'|'hostile'|'biased'='friend'){
 const g=createGame('pigeon','eagle-state',73103),r=g.world.statePolitics!.relations[statePairKey('eagle-state','duck-state')];
 Object.assign(r,kind==='hostile'?{relations:15,rivalry:90,cooperation:5}:{relations:82,rivalry:15,cooperation:72});
 if(kind==='biased'){const pair=g.world.statePolitics!.relations[statePairKey('eagle-state','pigeon-state')];Object.assign(pair,{relations:35,rivalry:70,cooperation:12});const budget=g.world.countries.pigeon.fiscal.budgetPolicy;for(const key of Object.keys(budget))budget[key as keyof typeof budget]=0;budget.infrastructure=15;budget.industrySupport=10;for(const p of Object.values(g.world.regions['eagle-state'].speciesPolitics))p.satisfaction=30;}
 for(const id of ['eagle-state','duck-state']){const x=g.world.regions[id];for(const p of Object.values(x.speciesPolitics)){p.autonomyDemand=80;p.independenceSentiment=55;}x.governance.approval=70;}
 g.world=refreshCountryAggregates(g.world);return g;
}
