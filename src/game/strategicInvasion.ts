import {strategicConflictProfile,conflictSample,type StrategicConflictProfile} from './strategicConflictProfile';
import {assessConflictPressure} from './conflictPressure';
import {getBilateralRelation,hasSanctions} from './diplomacy';
import {getWarDeclarationBlock} from './casusBelli';
import {activeWars} from './military';
import {derivedCountryRuntime} from './runtime';
import {recentAggressions,aggressionThreat} from './aggression';
import type {GameState} from './types';
export const invasionConfig={threshold:67,minimumRatio:1.25,minimumReadiness:50,sampleRange:12};
export function evaluateInvasion(g:GameState,actor:string,target:string,p:StrategicConflictProfile=strategicConflictProfile(g,actor)){
 const a=derivedCountryRuntime(g.world,actor),m=g.world.countries[actor].military!,n=g.world.countries[target].military!;
 const r=getBilateralRelation(g.world,actor,target)!,third=Object.keys(g.world.countries).filter(id=>id!==actor&&id!==target);
 const alliance=third.filter(id=>getBilateralRelation(g.world,id,target)?.defensePact).reduce((s,id)=>s+g.world.countries[id].military!.capability,0);
 const ratio=m.capability/Math.max(1,n.capability+alliance),wars=activeWars(g.world).filter(w=>w.participants[actor]);
 const sanctions=Object.values(g.world.diplomacy!.relations).filter(b=>[b.countryA,b.countryB].includes(actor)&&hasSanctions(b)).length;
 const isolation=third.reduce((s,id)=>{const b=getBilateralRelation(g.world,actor,id)!;return s+Math.max(0,50-b.trust)*.07+aggressionThreat(g.world,id,actor)*.12;},0);
 const thirdRisk=third.reduce((s,id)=>s+Math.max(0,g.world.countries[id].military!.capability/Math.max(1,m.capability)-1)*5,0);
 const fiscal=a.fiscal.treasury/Math.max(1,a.economy.gdp),debt=a.fiscal.debt/Math.max(1,a.economy.gdp);
 const pressure=assessConflictPressure(g,{kind:'country',id:actor}).diplomaticPressure;
 const cb=Object.values(g.world.warfare!.casusBelli).some(b=>b.holderCountryId===actor&&b.targetCountryId===target&&!b.consumed&&b.expiresInMonths!==0);
 const cbWait=cb?0:pressure*.12*p.caution/100*(1-p.opportunism/150);
 const sanctionRisk=sanctions*9+isolation+recentAggressions(g,actor).length*6+thirdRisk;
 const score=Math.min(65,Math.max(0,ratio-1)*30)+p.aggression*.32+p.opportunism*.2+p.diplomaticRiskTolerance*.12
  +a.governance!.approval*.18+m.warSupport*.12+Math.max(0,-r.relations)*.15+(100-r.trust)*.08+(cb?22:0)
  -p.caution*.28-sanctionRisk*(1-p.diplomaticRiskTolerance/180)-Math.min(35,alliance/Math.max(1,m.capability)*30)
  -m.fatigue*.65-Math.max(0,60-a.governance!.stability)*.65-Math.max(0,55-a.governance!.approval)*.45
  -Math.max(0,debt-1)*12-Math.max(0,.02-fiscal)*1000-wars.length*35-cbWait-r.tradeLevel*.18;
 const blocked=getWarDeclarationBlock(g,actor,target,'punitive',true)||ratio<invasionConfig.minimumRatio||m.readiness<50||m.warSupport<35||fiscal<.005||a.governance!.stability<30||wars.length>0;
 const reasons=[...(ratio>1.8?['TARGET_WEAK']:[]),...(a.governance!.approval>=65?['HIGH_DOMESTIC_SUPPORT']:[]),...(sanctionRisk>15?['SANCTION_RISK']:[]),...(alliance?['ALLIANCE_RISK']:[]),...(fiscal<.02?['LOW_TREASURY']:[]),...(cbWait>4?['WAIT_FOR_CB']:[]),...(cb?['JUSTIFIED_CB']:[])];
 const sampledUtility=score+(conflictSample(g,actor,'invasion:'+target)-.5)*invasionConfig.sampleRange;
 return {utility:blocked?-Infinity:score,sampledUtility:blocked?-Infinity:sampledUtility,ratio,sanctionRisk,allianceRisk:alliance,cbWait,reasonCodes:reasons};
}
