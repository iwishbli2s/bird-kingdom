import {createGame} from '../src/game/engine';
import {refreshCountryAggregates} from '../src/game/runtime';
import type {GameState} from '../src/game/types';
export const stateId='eagle-state';
export function federalFixture(kind:'weak'|'strong'|'partial'='weak'):GameState {
 const g=createGame('pigeon',stateId,40302),r=g.world.regions[stateId],strong=kind!=='weak';
 Object.assign(r.governance,{approval:strong?88:35,stability:strong?85:38,integration:strong?30:90});
 for(const p of Object.values(r.speciesPolitics))Object.assign(p,{satisfaction:strong?35:75,autonomyDemand:strong?85:15,independenceSentiment:strong?85:15});
 Object.assign(r.social,{publicSafety:strong?88:40});
 if(strong){r.fiscal.treasury=r.economy.gdp*.3;r.fiscal.debt=r.economy.gdp*.1;}
 for(const x of Object.values(g.world.regions).filter(x=>x.id!==stateId)){x.governance.stability=kind==='strong'?12:90;}
 if(kind==='partial'){r.economy.growth=-4;r.economy.unemployment=15;r.governance.approval=70;r.governance.stability=78;for(const p of Object.values(r.speciesPolitics)){p.autonomyDemand=75;p.independenceSentiment=65;}}
 g.world=refreshCountryAggregates(g.world);return g;
}
export function clock(g:GameState,months=3):GameState {const d=g.date.year*12+g.date.month-1+months;return {...g,turn:g.turn+months,date:{year:Math.floor(d/12),month:d%12+1}};}
