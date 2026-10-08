// Controlled verification scenarios only. Production rules are never changed.
import {createGame,advanceMonth} from '../src/game/engine';
import {createBreakawayCountry} from '../src/game/secession';
import {addCasusBelli} from '../src/game/casusBelli';
import {declareWar} from '../src/game/warfare';
import {resolvePeace} from '../src/game/peace';
import {synchronizeDiplomacy} from '../src/game/diplomacy';
import {collectHistory} from '../src/game/history';
import {evaluateAchievements} from '../src/game/achievements';
import type {GameState,SpeciesId} from '../src/game/types';
export function independentFixture(regionId='eagle-state'):GameState {
 let g=createGame('pigeon',regionId,2030),r=g.world.regions[regionId],sp=r.regionIdentity!.primarySpeciesId;
 Object.assign(r.secession![sp]!,{phase:'transition',monthsInPhase:6,monthsActive:30,lastReferendumResult:{date:{...g.date},passed:true,yesShare:90}});
 return createBreakawayCountry(g,{kind:'region',id:regionId},sp as SpeciesId);
}
export function federationWarFixture(regionId='eagle-state'):GameState {
 let g=independentFixture(regionId),actor=g.player.controlledCountryId;
 // Existing peace rules protect the initial federation's last territory. This fixture
 // treats its identity as dynamic solely to exercise the already-supported absorption API.
 g.world.countries.pigeon.identity!.isDynamic=true;
 const target=Object.values(g.world.regions).find(r=>r.ownerCountryId==='pigeon')!.id;
 g=addCasusBelli(g,actor,'pigeon','territorial_dispute',target);
 const belli=Object.values(g.world.warfare!.casusBelli).find(b=>b.holderCountryId===actor&&!b.consumed)!;
 g=declareWar(g,actor,belli.id,'border_claim',true,true);
 const war=Object.values(g.world.warfare!.wars).at(-1)!;
 war.status='peace_negotiation';war.monthsAtWar=24;war.strategicControl=95;
 war.fronts=Object.values(g.world.regions).filter(r=>r.ownerCountryId==='pigeon').map(r=>({regionId:r.id,originalOwnerCountryId:'pigeon',controllerCountryId:actor,control:95,decisiveMonths:3}));
 return g;
}
export function reverseFederationFixture(regionId='eagle-state'){const g=federationWarFixture(regionId);return resolvePeace(g,Object.values(g.world.warfare!.wars).at(-1)!.id,'territory_transfer');}
export function unifiedFixture(){const g=reverseFederationFixture(),next=structuredClone(g);delete next.world.countries.sparrow;next.world=synchronizeDiplomacy(next.world);return collectHistory(g,next);}
export function deathFixture(){return advanceMonth(createGame('sparrow',null,2030),{mortalityRiskOverride:1,crisisRandom:()=>.99,eventOccurrenceRandom:()=>.99});}
export function stateDefeatWarFixture(){
 let g=independentFixture(),target=g.player.controlledCountryId;
 g=addCasusBelli(g,'pigeon',target,'territorial_dispute','eagle-state');
 g=declareWar(g,'pigeon',Object.values(g.world.warfare!.casusBelli).find(b=>b.holderCountryId==='pigeon')!.id,'border_claim',true,true);
 const w=Object.values(g.world.warfare!.wars).at(-1)!;w.status='peace_negotiation';w.strategicControl=95;w.monthsAtWar=18;w.fronts=w.fronts.map(f=>({...f,controllerCountryId:'pigeon',control:95,decisiveMonths:3}));return g;
}
export function electionDefeatFixture(){let g=createGame('sparrow',null,2030);g.turn=1201;g.date={year:2130,month:1};g.player.career.electionsWon=20;g=evaluateAchievements(g,g);g.gameOverReason='election_defeat';return collectHistory({...g,gameOverReason:null},g);}
