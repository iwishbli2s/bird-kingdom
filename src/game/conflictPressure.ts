import {getStateRelation,getStateConflictEventMultiplier,commonStateRival} from './stateRelations';
import {isActiveFederalState,federalStateIds} from './stateRelationsModel';
import {derivedCountryRuntime} from './runtime';
import type {GameState,Jurisdiction,EventContext,GameEventDefinition} from './types';
export type ConflictEventFamily='autonomy'|'separatism'|'federal'|'state_rivalry'|'species'|'domestic_unrest'|'diplomatic'|'casus_belli';
export interface ConflictPressureAssessment {separatistPressure:number;federalPressure:number;interstatePressure:number;speciesPressure:number;domesticPressure:number;diplomaticPressure:number}
export const conflictPressureConfig={threshold:25,exponent:2.2,maxBoost:7,memoryMonths:12,memoryBoost:1.35,relief:.7,ceiling:.4} as const;
const clamp=(n:number)=>Math.max(0,Math.min(100,n));
export function conflictFamily(e:GameEventDefinition):ConflictEventFamily|undefined {
 if(e.conflictFamily)return e.conflictFamily;
 if(e.id.startsWith('secession-'))return /organize|charter|negotiation/.test(e.id)?'autonomy':'separatism';
 if(['crow-petition','eagle-petition','eagle-assembly','duck-protest'].includes(e.id))return 'autonomy';
 if(e.id==='nest-conflict')return 'species';
 if(['diplomacy-boundary','diplomacy-retaliation'].includes(e.id))return 'casus_belli';
 if(['diplomacy-protest','diplomacy-trade-dispute'].includes(e.id))return 'diplomatic';
 return undefined;
}
export function assessConflictPressure(g:GameState,j:Jurisdiction):ConflictPressureAssessment {
 return calculateConflictPressure(g,j);
}
function calculateConflictPressure(g:GameState,j:Jurisdiction):ConflictPressureAssessment {
 const r=j.kind==='region'?g.world.regions[j.id]:g.world.countries[j.id]?derivedCountryRuntime(g.world,j.id):undefined;
 if(!r?.speciesPolitics||!r.governance||!r.social)return {separatistPressure:0,federalPressure:0,interstatePressure:0,speciesPressure:0,domesticPressure:0,diplomaticPressure:0};
 const recent=g.events.history.filter(e=>e.jurisdiction.kind===j.kind&&e.jurisdiction.id===j.id&&g.turn-e.turn<=12);
 const rejection=(g.world.federalPolitics?.[j.id]?.history??[]).filter(h=>g.turn-h.turn<=12&&['hardline_rejection','political_pressure','economic_pressure'].includes(h.response)).length;
 const crackdown=recent.some(e=>e.choiceId==='restrict'&&/protest|petition|unrest/.test(e.eventId));
 const relief=recent.some(e=>e.choiceId==='invest'&&/protest|petition|unrest/.test(e.eventId));
 let separatistPressure=0,speciesPressure=0,autonomy=0;
 for(const [id,p] of Object.entries(r.speciesPolitics)){const m=r.secession?.[id as keyof typeof r.secession],share=(r.population.species[id as keyof typeof r.population.species]?.population??0)/Math.max(1,r.population.total);
 const memory=m?.lastRefusalTurn!=null&&g.turn-m.lastRefusalTurn<=24?10:0;
 const phase=m&&!['inactive','completed'].includes(m.phase)?6:0;
 separatistPressure=Math.max(separatistPressure,clamp(p.independenceSentiment*.42+p.autonomyDemand*.18+(100-r.governance.integration)*.12+(100-p.satisfaction)*.12+(100-r.governance.stability)*.08+(100-r.governance.approval)*.04+phase+memory+Math.min(12,rejection*6)+(crackdown?8:0)-(relief?8:0)+(m?.lastReferendumResult&&!m.lastReferendumResult.passed?3:0)));
 autonomy=Math.max(autonomy,p.autonomyDemand);
 speciesPressure=Math.max(speciesPressure,clamp((100-p.satisfaction)*.45+p.autonomyDemand*.2+p.independenceSentiment*.15+p.politicalInfluence*.1+share*10+Math.max(0,-r.social.livingStandardDeltaLastMonth)*2));}
 const pairs=j.kind==='region'&&isActiveFederalState(g.world,j.id)?federalStateIds.filter(id=>id!==j.id&&isActiveFederalState(g.world,id)).map(id=>getStateRelation(g,j.id,id)):[];
 const biased=pairs.flatMap(p=>p.mediations).filter(m=>g.turn-m.turn<=12&&m.favoredStateId&&m.favoredStateId!==j.id).length;
 const bloc=g.world.statePolitics?.blocs.some(b=>b.active&&b.memberStateIds.includes(j.id))??false;
 const interstatePressure=Math.max(0,...pairs.map(p=>clamp(p.rivalry*.55+(100-p.relations)*.25+(100-p.cooperation)*.1+Math.min(18,p.history.filter(h=>g.turn-h.turn<=24&&['criticize','counter_policy'].includes(h.action)).length*5)+(p.mediations.some(m=>g.turn-m.turn<=12&&m.favoredStateId)?5:0)+(bloc?4:0)+(commonStateRival(g,p.stateAId,p.stateBId)?5:0))));
 const parent=g.world.countries.pigeon;
 const federalPressure=pairs.length?clamp(separatistPressure*.55+autonomy*.15+Math.min(20,rejection*7+biased*6)+(bloc?6:0)+(100-(parent?.governance?.stability??70))*.1+r.governance.approval*.04+Math.min(10,(g.world.federalPolitics?.[j.id]?.history??[]).filter(h=>g.turn-h.turn<=12).length*2)):0;
 const owner=j.kind==='region'?g.world.regions[j.id].ownerCountryId:j.id;
 const crises=Object.values(g.world.crises?.activeCrises??{}).filter(c=>c.jurisdictionId===j.id||c.jurisdictionId===owner).length;
 const domesticPressure=clamp((100-r.governance.approval)*.25+(100-r.governance.stability)*.3+(100-r.social.livingStandard)*.12+Math.max(0,r.economy.unemployment-5)*.8+Math.max(0,r.economy.inflation-3)*1.2+Math.max(0,r.social.inequality-35)*.3+Math.min(12,crises*4)+Math.min(10,r.fiscal.debt/Math.max(1,r.economy.gdp)*5));
 const diplomaticPressure=Math.max(0,...Object.values(g.world.diplomacy?.relations??{}).filter(p=>p.countryA===owner||p.countryB===owner).map(p=>clamp(Math.max(0,30-p.relations)*.3+(100-p.trust)*.25+p.threat*.3+(p.sanctionsAtoB||p.sanctionsBtoA?10:0)+(p.threatShockMonths>0?8:0)+Math.min(12,(g.world.warfare?.aggressionHistory??[]).filter(a=>a.elapsedMonths<=24&&[p.countryA,p.countryB].includes(a.attackerCountryId)&&a.legitimacy==='unjustified').length*6)+Math.min(10,(g.world.diplomacy?.history??[]).filter(h=>g.turn-h.turn<=12&&[p.countryA,p.countryB].includes(h.actorId)&&[p.countryA,p.countryB].includes(h.targetId)&&['break_non_aggression','break_defense'].includes(h.action)).length*5)+(g.world.countries[p.countryA]?.identity?.territorialDispute!=='none'&&g.world.countries[p.countryA]?.identity?.originCountryId===p.countryB?10:0))));
 return {separatistPressure,federalPressure,interstatePressure,speciesPressure,domesticPressure,diplomaticPressure};
}
export function nonlinearConflictMultiplier(pressure:number){return 1+conflictPressureConfig.maxBoost*Math.pow(Math.max(0,(pressure-conflictPressureConfig.threshold)/(100-conflictPressureConfig.threshold)),conflictPressureConfig.exponent);}
export function getConflictEventFamilyMultiplier(g:GameState,j:Jurisdiction,family:ConflictEventFamily,assessment?:ConflictPressureAssessment){
 const p=assessment??assessConflictPressure(g,j),risk=family==='autonomy'?Math.max(p.separatistPressure,p.federalPressure):family==='separatism'?p.separatistPressure:family==='federal'?p.federalPressure:family==='state_rivalry'?p.interstatePressure:family==='species'?p.speciesPressure:family==='domestic_unrest'?p.domesticPressure:p.diplomaticPressure;
 const recent=g.events.history.filter(e=>e.jurisdiction.id===j.id&&e.jurisdiction.kind===j.kind&&g.turn-e.turn<=12);
 const related=recent.filter(e=>e.eventId.startsWith('secession-')||/protest|petition|state-dispute|federal-grievance|domestic-unrest/.test(e.eventId));
 const memory=related.some(e=>e.choiceId==='restrict')?1.35:related.some(e=>e.choiceId==='invest')?.7:related.length?1.1:1;
 const stateFactor=['autonomy','separatism','federal','state_rivalry'].includes(family)&&j.kind==='region'&&isActiveFederalState(g.world,j.id)?Math.max(1,...federalStateIds.filter(id=>id!==j.id&&isActiveFederalState(g.world,id)).map(id=>getStateConflictEventMultiplier(g,j.id,id))):1;
 return Math.min(12,nonlinearConflictMultiplier(risk)*memory*stateFactor);
}
export function conflictOpportunity(c:EventContext){const p=assessConflictPressure(c.game,c.jurisdiction);return {pressure:p,escalationOpportunity:Math.max(p.separatistPressure,p.interstatePressure,p.domesticPressure),deEscalationUtility:(100-c.runtime.governance.stability)*.5+(100-c.runtime.governance.approval)*.3,separatistProgressionRisk:p.separatistPressure,diplomaticProvocationUtility:p.diplomaticPressure};}
