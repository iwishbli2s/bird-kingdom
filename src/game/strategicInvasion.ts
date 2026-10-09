import {strategicConflictProfile,conflictSample,type StrategicConflictProfile} from './strategicConflictProfile';
import {assessConflictPressure} from './conflictPressure';
import {getBilateralRelation,hasSanctions} from './diplomacy';
import {getWarDeclarationBlock} from './casusBelli';
import {activeWars} from './military';
import {derivedCountryRuntime} from './runtime';
import {recentAggressions,aggressionThreat} from './aggression';
import {strategicConfig} from './strategicConfig';
import type {GameState} from './types';
export const invasionConfig={threshold:66,minimumRatio:1.20,minimumReadiness:50,sampleRange:12,
 severeDisadvantageRatio:1.02,militaryCurve:60,nearParityCost:160,pressureWeight:.35,debtCost:36,neutralThreat:45,neutralCost:2,warRecoveryMonths:120,warRecoveryCost:30};
export interface InvasionAuditRecord {
 actor:string;target:string;turn:number;ratio:number;treasuryRatio:number;warSupport:number;
 relations:number;trust:number;threat:number;cb:boolean;score:number;sampledScore:number;
 threshold:number;blockCodes:string[];legalBlock:string|null;contributions:Record<string,number>;reasonCodes:string[];
}
let auditObserver:((record:InvasionAuditRecord)=>void)|undefined;
/** Optional external simulation observer; never persisted or consulted by gameplay decisions. */
export function observeInvasionEvaluations(observer:(record:InvasionAuditRecord)=>void){
 const previous=auditObserver;auditObserver=observer;return ()=>{auditObserver=previous;};
}
export function evaluateInvasion(g:GameState,actor:string,target:string,p:StrategicConflictProfile=strategicConflictProfile(g,actor)){
 const a=derivedCountryRuntime(g.world,actor),m=g.world.countries[actor].military!,n=g.world.countries[target].military!;
 const r=getBilateralRelation(g.world,actor,target)!,third=Object.keys(g.world.countries).filter(id=>id!==actor&&id!==target);
 const alliance=third.filter(id=>getBilateralRelation(g.world,id,target)?.defensePact).reduce((s,id)=>s+g.world.countries[id].military!.capability,0);
 const ratio=m.capability/Math.max(1,n.capability+alliance),wars=activeWars(g.world).filter(w=>w.participants[actor]);
 const sanctions=Object.values(g.world.diplomacy!.relations).filter(b=>[b.countryA,b.countryB].includes(actor)&&hasSanctions(b)).length;
 const isolation=third.reduce((s,id)=>{const b=getBilateralRelation(g.world,actor,id)!;return s+Math.max(0,50-b.trust)*.07+aggressionThreat(g.world,id,actor)*.12;},0);
 const thirdRisk=third.reduce((s,id)=>s+Math.max(0,g.world.countries[id].military!.capability/Math.max(1,m.capability)-1)*5,0);
 const fiscal=a.fiscal.treasury/Math.max(1,a.economy.gdp),debt=a.fiscal.debt/Math.max(1,a.economy.gdp);
 const conflictPressure=assessConflictPressure(g,{kind:'country',id:actor}),pressure=conflictPressure.diplomaticPressure;
 const cb=Object.values(g.world.warfare!.casusBelli).some(b=>b.holderCountryId===actor&&b.targetCountryId===target&&!b.consumed&&b.expiresInMonths!==0);
 const cbWait=cb?0:pressure*.12*p.caution/100*(1-p.opportunism/150)*(1-p.aggression/180);
 const sanctionRisk=sanctions*9+isolation+recentAggressions(g,actor).length*6+thirdRisk;
 // Reuse resolved enemy wars: a decaying cost, never a mandatory peace lock.
 const recentWarRecovery=Object.values(g.world.warfare!.wars).filter(w=>w.status==='resolved'&&((w.attackers.includes(actor)&&w.defenders.includes(target))||(w.defenders.includes(actor)&&w.attackers.includes(target)))).reduce((sum,w)=>{const d=w.resolvedDate??w.startedDate;const elapsed=(g.date.year-d.year)*12+g.date.month-d.month;return sum+Math.max(0,1-elapsed/invasionConfig.warRecoveryMonths)*invasionConfig.warRecoveryCost;},0);
 const contributions={neutralDiplomacy:!cb&&r.relations>=0?-Math.max(0,invasionConfig.neutralThreat-r.threat)*invasionConfig.neutralCost:0,recentWarRecovery:-recentWarRecovery,military:Math.min(65,Math.sqrt(Math.max(0,ratio-1))*invasionConfig.militaryCurve),nearParity:-Math.max(0,invasionConfig.minimumRatio-ratio)*invasionConfig.nearParityCost,
  diplomaticPressure:pressure*invasionConfig.pressureWeight,internalUnrest:-Math.max(0,conflictPressure.separatistPressure-65)*.4,
  friendship:-Math.max(0,r.relations-50)*.35-Math.max(0,r.trust-65)*.25,aggression:p.aggression*.32,opportunism:p.opportunism*.2,riskTolerance:p.diplomaticRiskTolerance*.12,
  approval:a.governance!.approval*.18,warSupport:m.warSupport*.12,relations:Math.max(0,-r.relations)*.15,trust:(100-r.trust)*.08,cb:cb?22:0,
  caution:-p.caution*.28,sanctions:-sanctionRisk*(1-p.diplomaticRiskTolerance/180),alliance:-Math.min(35,alliance/Math.max(1,m.capability)*30),
  fatigue:-m.fatigue*.65,stability:-Math.max(0,60-a.governance!.stability)*.65,lowApproval:-Math.max(0,55-a.governance!.approval)*.45,
  debt:-Math.max(0,debt-1)*invasionConfig.debtCost,cash:-Math.max(0,.02-fiscal)*1000,ongoingWars:-wars.length*35,cbWait:-cbWait,trade:-r.tradeLevel*.18};
 const score=Object.values(contributions).reduce((sum,value)=>sum+value,0);
 const legalBlock=getWarDeclarationBlock(g,actor,target,'punitive',true);
 const treatyBreak=g.world.diplomacy!.history.find(h=>h.actorId===actor&&h.targetId===target&&h.action==='break_non_aggression');
 const blockCodes=[...(legalBlock?['LEGAL']:[]),...(ratio<invasionConfig.severeDisadvantageRatio?['MILITARY']:[]),...(m.readiness<invasionConfig.minimumReadiness?['READINESS']:[]),...(m.warSupport<35?['SUPPORT']:[]),...(fiscal<.005?['FISCAL']:[]),...(a.governance!.stability<30?['STABILITY']:[]),...(wars.length>0?['ONGOING_WAR']:[]),...(m.fatigue>55?['FATIGUE']:[]),...(!cb&&r.relations>=80&&r.trust>=80&&r.threat<25?['FRIENDSHIP']:[]),...(treatyBreak&&g.turn-treatyBreak.turn<strategicConfig.postTreatyWarDelay?['TREATY_RECOVERY']:[])];
 const blocked=blockCodes.length>0;
 const reasons=[...(ratio>1.8?['TARGET_WEAK']:[]),...(ratio>=invasionConfig.minimumRatio?['MILITARY_ADVANTAGE']:[]),...(r.relations<=0?['HOSTILE_RELATIONS']:[]),...(p.aggression>=65?['HIGH_AGGRESSION']:[]),...(p.opportunism>=65?['OPPORTUNISM']:[]),...(pressure>=35?['DIPLOMATIC_CONFLICT']:[]),...(alliance===0?['LOW_ALLIANCE_RISK']:[]),...(a.governance!.approval>=65?['HIGH_DOMESTIC_SUPPORT']:[]),...(sanctionRisk>15?['SANCTION_RISK']:[]),...(alliance?['ALLIANCE_RISK']:[]),...(fiscal<.02?['LOW_TREASURY']:[]),...(cbWait>4?['WAIT_FOR_CB']:[]),...(cb?['JUSTIFIED_CB']:[])];
 const sampledUtility=score+(conflictSample(g,actor,'invasion:'+target)-.5)*invasionConfig.sampleRange;
 auditObserver?.({actor,target,turn:g.turn,ratio,treasuryRatio:fiscal,warSupport:m.warSupport,relations:r.relations,trust:r.trust,threat:r.threat,cb,score,sampledScore:sampledUtility,threshold:invasionConfig.threshold,blockCodes:[...blockCodes],legalBlock,contributions:{...contributions},reasonCodes:[...reasons]});
 return {utility:blocked?-Infinity:score,sampledUtility:blocked?-Infinity:sampledUtility,ratio,sanctionRisk,allianceRisk:alliance,cbWait,reasonCodes:reasons,
  diagnostics:{score,sampledUtility,contributions,blockCodes,legalBlock,pressure,relations:r.relations,trust:r.trust,threat:r.threat,fiscal,warSupport:m.warSupport,readiness:m.readiness,cb}};
}
