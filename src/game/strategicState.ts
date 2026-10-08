import { strategicConfig } from './strategicConfig';
import type { WorldState } from './types';
import type { StrategicAIState } from './strategicTypes';
export function createStrategicAI():StrategicAIState{return {foreignPolicy:'cautious',postureSinceTurn:0,targetAssessments:{},diplomaticCooldowns:{},lastStrategicEvaluationTurn:0,lastMajorActionTurn:0,lastMobilizationTurn:0,currentWarStrategy:{},recentStrategicDecisions:[]};}
export function synchronizeStrategicAI(world:WorldState):WorldState {
 const exists=(id:string)=>!!world.countries[id];
 const states=Object.fromEntries(Object.keys(world.countries).sort().map(id=>{const old=world.strategicAI?.[id]??createStrategicAI();return [id,{...old,targetAssessments:Object.fromEntries(Object.entries(old.targetAssessments).filter(([t])=>exists(t)&&t!==id)),diplomaticCooldowns:Object.fromEntries(Object.entries(old.diplomaticCooldowns).filter(([t])=>exists(t)&&t!==id)),currentWarStrategy:Object.fromEntries(Object.entries(old.currentWarStrategy).filter(([w])=>world.warfare?.wars[w]?.status!=='resolved'&&world.warfare?.wars[w]?.participants[id])),recentStrategicDecisions:old.recentStrategicDecisions.slice(0,strategicConfig.recordLimit).map(r=>r.targetCountryId&&!exists(r.targetCountryId)?{...r,targetCountryId:undefined}:r)}];}));
 return {...world,strategicAI:states,foreignProposals:(world.foreignProposals??[]).filter(p=>exists(p.actorId)&&exists(p.targetId)&&(!p.warId||world.warfare?.wars[p.warId]?.status==='peace_negotiation')&&(!p.conflictId||world.internalConflicts?.[p.conflictId]?.status!=='resolved'))};
}
