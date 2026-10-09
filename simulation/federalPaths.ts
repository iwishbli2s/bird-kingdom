import {createGame,advanceMonth} from '../src/game/engine';
import {performFederalAction,federalActionBlock} from '../src/game/federalPolitics';
import {resolvePendingEvent} from '../src/game/events';
import {createElectionSnapshot} from '../src/game/election';
import {validateGameState,createSaveData,deserializeSave,serializeSave} from '../src/game/save';
import {collectHistory} from '../src/game/history';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {federalFixture} from '../tests/federalFixtures';
const paths=['moderate federalist','autonomy-focused','aggressive separatist'] as const,results=[];
for(const path of paths){
 // Scenario-specific political mandates are explicit; normal AI/world equations are unchanged.
 let g=path==='autonomy-focused'?federalFixture('partial'):createGame('pigeon','eagle-state',40302);
 g=collectHistory(g,g);const initial=structuredClone(g.world.regions['eagle-state']),initialChance=createElectionSnapshot(g).reelectionChance;
 for(let month=0;month<120&&!g.gameOverReason;month++){
  if(path==='moderate federalist'&&month%24===0&&!federalActionBlock(g,'eagle-state','renegotiate'))g=performFederalAction(g,'eagle-state','renegotiate');
  if(path==='autonomy-focused'&&month<24&&month%6===0&&!federalActionBlock(g,'eagle-state','autonomy'))g=performFederalAction(g,'eagle-state','autonomy','substantial');
  if(path==='aggressive separatist'&&month===0)g=performFederalAction(g,'eagle-state','declare');
  const before=g.turn;g=advanceMonth(g,{mortalityRiskOverride:0,electionRandom:()=>0,strategicAI:false,eventOccurrenceRandom:()=>.999999,crisisRandom:()=>.999999,secessionRandom:()=>.99});
  while(g.events.pendingEvent&&!g.gameOverReason)g=resolvePendingEvent(g,'balance',()=>.5,()=>.99);
  if(before===g.turn&&!g.gameOverReason)throw new Error('scripted player softlock');
  validateGameState(g);if(month%24===0)g=deserializeSave(serializeSave(createSaveData(g,'scenario'))).game;
 }
 const r=g.world.regions['eagle-state'];results.push({path,months:g.turn-1,owner:r.ownerCountryId,gameOver:g.gameOverReason,actions:g.world.federalPolitics?.['eagle-state']?.history.map(a=>({action:a.action,response:a.response})),initial:{approval:initial.governance.approval,stability:initial.governance.stability,autonomy:initial.secession!.eagle!.grantedAutonomy,reelectionChance:initialChance},final:{approval:r.governance.approval,stability:r.governance.stability,autonomy:r.secession!.eagle!.grantedAutonomy,independence:r.speciesPolitics.eagle!.independenceSentiment,reelectionChance:g.gameOverReason?null:createElectionSnapshot(g).reelectionChance},conflicts:Object.values(g.world.internalConflicts??{}).map(c=>({status:c.status,resolution:c.resolution,months:c.monthsInConflict}))});
}
assert.equal(results[0].owner,'pigeon');assert.equal(results[1].owner,'pigeon');assert.ok(results[1].final.autonomy>results[1].initial.autonomy);assert.ok(results[2].conflicts.length>0);
writeFileSync('.test-output/federal-paths.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
