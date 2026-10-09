import {createGame,advanceMonth} from '../src/game/engine';
import {createBreakawayCountry} from '../src/game/secession';
import {declareWar} from '../src/game/warfare';
import {aggressionThreat,defenderRally} from '../src/game/aggression';
import {getBilateralRelation} from '../src/game/diplomacy';
import {assertWorld} from './harness';
import {createSaveData,deserializeSave,serializeSave} from '../src/game/save';
import {writeFileSync} from 'node:fs';
const results=[];
for(const seed of [1001,8920,16839]){
 let g=createGame('sparrow',undefined,seed),r=g.world.regions['owl-state'];Object.assign(r.speciesPolitics.owl!,{satisfaction:10,autonomyDemand:95,independenceSentiment:95});r.governance.integration=20;Object.assign(r.secession!.owl!,{phase:'transition',monthsActive:30,monthsInPhase:6,lastRefusalTurn:g.turn,lastReferendumResult:{date:g.date,passed:true,yesShare:90}});g=createBreakawayCountry(g,{kind:'region',id:r.id},'owl',false);
 const third='owl-republic-1',before={...getBilateralRelation(g.world,third,'sparrow')!};g=declareWar(g,'sparrow','pigeon','punitive',false,true);const after={...getBilateralRelation(g.world,third,'sparrow')!};
 if(Object.values(g.world.diplomacy!.relations).some(r=>r.sanctionsAtoB||r.sanctionsBtoA||r.defensePact))throw new Error('Automatic response');
 let supportPeak=0;const checkpoints=[];
 for(let i=0;i<600;i++){
  g=advanceMonth(g,{autonomousWorld:true,mortalityRiskOverride:0,electionRandom:()=>0});const w=g.world.warfare!.wars['war-1'];supportPeak=Math.max(supportPeak,w.participants.pigeon.warSupport);
  if(w.monthsAtWar>=9&&defenderRally(w)!==0)throw new Error('Permanent rally');
  if((i+1)%120===0){assertWorld(g);g=deserializeSave(serializeSave(createSaveData(g,'stress'))).game;checkpoints.push({month:i+1,extraThreat:aggressionThreat(g.world,third,'sparrow'),thirdRelation:getBilateralRelation(g.world,third,'sparrow'),warMonths:w.monthsAtWar,warStatus:w.status,warSupport:w.participants.pigeon.warSupport});}
 }
 const decisions=g.world.strategicAI?.[third]?.recentStrategicDecisions??[];
 results.push({seed,before,after,supportPeak,records:g.world.warfare!.aggressionHistory!.length,war:g.history!.wars['war-1'],checkpoints,thirdFinalChoices:decisions.map(d=>d.action)});console.log('INVASION STRESS COMPLETE',seed);
}
writeFileSync('.test-output/conflict-invasion-stress.json',JSON.stringify(results,null,2));
