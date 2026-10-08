import {createGame,advanceMonth,advanceGameDate,updatePlayerAge} from '../src/game/engine';
import {createBreakawayCountry} from '../src/game/secession';
import {addCasusBelli} from '../src/game/casusBelli';
import {declareWar,updateWorldWars,applyWarAction} from '../src/game/warfare';
import {resolvePeace,getPeaceBlock} from '../src/game/peace';
import {sovereignTerritories} from '../src/game/territory';
import type {GameState} from '../src/game/types';
export const quietMonth={mortalityRiskOverride:0,electionRandom:()=>0,eventOccurrenceRandom:()=>.999999,crisisRandom:()=>.999999,domesticAI:false,strategicAI:false,autonomousWorld:true};
export function independentScenario(regionId='eagle-state') {
  let g=createGame('pigeon',regionId,2030);const r=g.world.regions[regionId],sp=r.regionIdentity!.primarySpeciesId;
  Object.assign(r.secession![sp]!,{phase:'transition',monthsInPhase:6,monthsActive:30,lastReferendumResult:{date:{...g.date},passed:true,yesShare:90}});
  return createBreakawayCountry(g,{kind:'region',id:regionId},sp);
}
/** Only pre-war military conditions are controlled. Fronts, occupation and decisive
 * months are produced by the real monthly war API; no award evaluator is called. */
export function occupiedWar(game:GameState,actor:string,target:string,regionId:string) {
  let g=game;
  const truce=()=>Object.values(g.world.warfare!.truces).find(t=>[t.countryA,t.countryB].includes(actor)&&[t.countryA,t.countryB].includes(target))?.remainingMonths??0;
  while(truce()>0)g=advanceMonth(g,quietMonth);
  g=addCasusBelli(g,actor,target,'territorial_dispute',regionId);
  const cb=Object.values(g.world.warfare!.casusBelli).find(b=>b.holderCountryId===actor&&b.targetCountryId===target&&!b.consumed&&b.targetRegionId===regionId)!;
  g=declareWar(g,actor,cb.id,'border_claim',true,true);
  Object.assign(g.world.countries[actor].military!,{capability:100,logistics:100,mobilization:15});
  Object.assign(g.world.countries[target].military!,{capability:1,logistics:100,mobilization:15});
  const id=Object.values(g.world.warfare!.wars).at(-1)!.id;
  for(let i=0;i<100;i++){
    g=advanceGameDate(g);g={...g,player:updatePlayerAge(g.player)};
    g=updateWorldWars(g,()=>.5);
    if(g.world.warfare!.wars[id].fronts.every(f=>f.decisiveMonths>=3))break;
  }
  g=applyWarAction(g,id,'negotiate');
  if(getPeaceBlock(g,id,'territory_transfer'))throw new Error('Occupation scenario did not earn a valid settlement');
  return {game:g,warId:id};
}
export function conquer(game:GameState,actor:string,target:string,regionId:string){const s=occupiedWar(game,actor,target,regionId);return resolvePeace(s.game,s.warId,'territory_transfer');}
export function reverseScenario(regionId='eagle-state'){
  let g=independentScenario(regionId);const actor=g.player.controlledCountryId;
  for(const r of sovereignTerritories(g.world,'pigeon'))g=conquer(g,actor,'pigeon',r);
  return g;
}
export function unifiedScenario(){let g=createGame('sparrow',null,2030);for(const r of sovereignTerritories(g.world,'pigeon'))g=conquer(g,'sparrow','pigeon',r);return g;}
