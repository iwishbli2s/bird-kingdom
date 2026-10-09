import { aggressionThreat, defenderRally } from './aggression';
import {strategicConflictProfile} from './strategicConflictProfile';
import { calculateDiplomaticThreat, getBilateralRelation, isRecognized, hasSanctions, getDiplomaticActionBlock } from './diplomacy';
import { activeWars, militaryCommitments } from './military';
import { getWarDeclarationBlock } from './casusBelli';
import { derivedCountryRuntime } from './runtime';
import { getGovernment } from './government';
import { calculateAIUrgencies, clampAI } from './aiEvaluation';
import { strategicConfig } from './strategicConfig';
import type { DiplomaticAction, GameState, CasusBelliState, InterstateWarState, WarGoal, WarResolution } from './types';
import type { DiplomaticActionScore, StrategicAssessment, StrategicAIState, ForeignPolicyPosture, WarStrategy } from './strategicTypes';
export function domesticBurden(game:GameState,id:string){const g=getGovernment(game.world,'country:'+id),s=game.world.governmentAI![g.id];return calculateAIUrgencies(game,g,s);}
export function assessCountry(game:GameState,actor:string,target:string):StrategicAssessment {
 const world=game.world,r=getBilateralRelation(world,actor,target)!;const a=derivedCountryRuntime(world,actor),b=derivedCountryRuntime(world,target),m=world.countries[actor].military!,n=world.countries[target].military!;
 const child=world.countries[target].identity!,parent=child.originCountryId;
 const dispute=Object.values(world.internalConflicts??{}).some(c=>c.status!=='resolved'&&[c.parentCountryId,c.breakawayCountryId].includes(actor)&&[c.parentCountryId,c.breakawayCountryId].includes(target));
 const claim=child.territorialDispute!=='none'&&parent===actor;
 const belli=Object.values(world.warfare?.casusBelli??{}).some(c=>c.holderCountryId===actor&&c.targetCountryId===target&&!c.consumed&&c.expiresInMonths!==0&&!!c.targetRegionId);
 const war=activeWars(world).some(w=>w.participants[actor]&&w.participants[target]&&w.participants[actor].side!==w.participants[target].side);
 const allies=Object.keys(world.countries).filter(id=>id!==actor&&id!==target&&getBilateralRelation(world,id,target)?.defensePact);
 const history=world.diplomacy?.history.slice(0,40).filter(h=>h.turn>=game.turn-24&&[h.actorId,h.targetId].includes(actor)&&[h.actorId,h.targetId].includes(target))??[];
 const affinity=clampAI(40+r.relations*.35+r.trust*.3+(r.nonAggressionPact?8:0)+(r.defensePact?8:0)-(hasSanctions(r)?20:0)-(war?40:0)-history.filter(h=>h.action.startsWith('break_')).length*5);
 const threat=clampAI(Math.max(calculateDiplomaticThreat(world,actor,target,r),actor===r.countryA?r.threatAtoB:r.threatBtoA)+Math.max(0,n.capability-m.capability)*.3+Math.max(0,n.mobilization-25)*.2+allies.length*4+(war?40:0));
 const economicValue=clampAI(r.tradeLevel*.6+Math.min(30,Math.sqrt(b.economy.gdp/Math.max(1,a.economy.gdp))*20)+(r.migratoryPassageAgreement?8:0)-(hasSanctions(r)?20:0));
 const commonThreat=Object.keys(world.countries).some(id=>id!==actor&&id!==target&&((getBilateralRelation(world,actor,id)?.relations??0)<-30&&(getBilateralRelation(world,target,id)?.relations??0)<-30||aggressionThreat(world,actor,id)>=12&&aggressionThreat(world,target,id)>=12));
 const allianceValue=clampAI(r.relations*.2+r.trust*.3+n.capability*.25+(commonThreat?30:0)+(r.defensePact?5:0)-militaryCommitments(world,target)*12);
 const territorialInterest=clampAI((dispute?45:0)+(claim?40:0)+(belli?35:0));
 const foundingConflict=Object.values(world.internalConflicts??{}).find(c=>c.breakawayCountryId===target);
 const playerInitiative=Object.entries(world.federalPolitics??{}).some(([id,p])=>world.regions[id]?.ownerCountryId===target&&p.history.some(h=>h.action==='declare'));
 const governing=playerInitiative?derivedCountryRuntime(world,target).governance:undefined;
 const foundingLegitimacy=playerInitiative&&child.status==='disputed_breakaway'?((foundingConflict?.foundingIndependence??50)-50)*.15+((governing?.stability??50)-50)*.1:0;
 let recognitionInterest=0;if(child.isDynamic&&!isRecognized(r,actor)){const legal=child.status==='established',pr=parent&&parent!==actor&&world.countries[parent]?getBilateralRelation(world,actor,parent):undefined;recognitionInterest=clampAI((legal?60:15)+foundingLegitimacy+r.relations*.3+economicValue*.2+(pr&&pr.relations<-30?20:0)-(legal?0:pr?(pr.defensePact?45:Math.max(0,pr.relations)*.5):0)-(parent===actor&&!legal?35:0));}
 const conflictRisk=clampAI(threat*.6+territorialInterest*.3+Math.max(0,-r.relations)*.3+(hasSanctions(r)?10:0)-(r.nonAggressionPact?25:0));
 return {targetCountryId:target,affinity,threat,economicValue,allianceValue,territorialInterest,recognitionInterest,conflictRisk,overallPriority:clampAI(Math.max(threat,economicValue,territorialInterest,recognitionInterest)+(war?30:0)+(r.defensePact?8:0))};
}
export function chooseForeignPosture(game:GameState,id:string,state:StrategicAIState,assessments:StrategicAssessment[]):ForeignPolicyPosture {
 const u=domesticBurden(game,id),m=game.world.countries[id].military!,wars=activeWars(game.world).filter(w=>w.participants[id]);
 if(wars.some(w=>warStrategy(game,id,w)==='survival')||u.fiscal>85&&u.social>70||u.crisis>85)return 'survival';
 const high=Math.max(0,...assessments.map(a=>a.threat));
 if(wars.length&&['assertive','defensive'].includes(state.foreignPolicy)&&game.turn-state.postureSinceTurn<strategicConfig.postureHoldMonths)return state.foreignPolicy;
 if(wars.length)return m.capability>Math.max(0,...assessments.map(a=>game.world.countries[a.targetCountryId].military!.capability))&&m.fatigue<40?'assertive':'defensive';
 const profile=game.world.governmentAI?.['country:'+id]?.profile??'balanced';
 const scores:Record<ForeignPolicyPosture,number>={cautious:40,cooperative:assessments.some(a=>a.affinity>45)?45:30,commercial:assessments.some(a=>a.economicValue>40)?48:25,defensive:high,assertive:Math.max(0,...assessments.map(a=>a.territorialInterest))*.75,survival:0};
 if(profile==='security'){scores.defensive+=8;scores.assertive+=5;}if(['research','industrial','agricultural'].includes(profile))scores.commercial+=8;if(['social','research'].includes(profile))scores.cooperative+=8;
 const conflict=strategicConflictProfile(game,id);scores.assertive+=Math.max(0,conflict.aggression-50)*.3;scores.cautious+=Math.max(0,conflict.caution-50)*.2;scores.cooperative+=Math.max(0,conflict.deescalationBias-50)*.15;
 if(game.turn-state.postureSinceTurn<strategicConfig.postureHoldMonths)return state.foreignPolicy;
 const winner=(Object.keys(scores) as ForeignPolicyPosture[]).sort((a,b)=>scores[b]-scores[a]||a.localeCompare(b))[0];return scores[winner]>scores[state.foreignPolicy]+strategicConfig.postureMargin?winner:state.foreignPolicy;
}
export function scoreDiplomaticAction(game:GameState,actor:string,target:string,action:DiplomaticAction,assessment=assessCountry(game,actor,target)):DiplomaticActionScore {
 const r=getBilateralRelation(game.world,actor,target)!,u=domesticBurden(game,actor),a=assessment,posture=game.world.strategicAI?.[actor]?.foreignPolicy??'cautious';
 let security=0,economic=0,trust=0,domesticCost=0,escalationRisk=0;
 if(action==='improve'){economic=a.economicValue*.3;security=a.threat*.15;trust=Math.max(0,50-r.relations)*.5;domesticCost=8+u.fiscal*.15;const recovery=Object.values(game.world.warfare?.wars??{}).some(w=>w.status==='resolved'&&w.participants[actor]&&w.participants[target])&&a.territorialInterest===0;if(r.relations>=55||r.relations<-55&&!recovery)trust-=100;}
 if(action==='trade'){economic=a.economicValue*.65+8;trust=5;domesticCost=5;if(r.tradeLevel>=70||r.relations<10||r.trust<30)economic-=100;}
 if(action==='non_aggression'){security=a.threat*.65;trust=8;domesticCost=4;}
 if(action==='defense'){security=a.allianceValue*.7;trust=8;domesticCost=Object.values(game.world.diplomacy!.relations).filter(p=>[p.countryA,p.countryB].includes(actor)&&p.defensePact).length*25+militaryCommitments(game.world,actor)*15;const common=Object.keys(game.world.countries).some(id=>id!==actor&&id!==target&&((getBilateralRelation(game.world,actor,id)?.relations??0)<-30&&(getBilateralRelation(game.world,target,id)?.relations??0)<-30||aggressionThreat(game.world,actor,id)>=12&&aggressionThreat(game.world,target,id)>=12));if(!common||r.trust<75||r.relations<65)security-=100;}
 if(action==='passage'){economic=r.tradeLevel*.55;trust=5;domesticCost=3;if(r.tradeLevel<50||r.relations<25)economic-=100;}
 if(action==='recognize'){security=a.recognitionInterest;economic=a.economicValue*.1;escalationRisk=game.world.countries[target].identity?.status==='established'?5:25;}
 if(action==='withdraw_recognition'){security=r.relations<-85&&a.territorialInterest>40?55:-100;escalationRisk=25+a.economicValue*.3;}
 if(action==='sanction'){const aggression=aggressionThreat(game.world,actor,target);security=Math.max(r.relations<-60&&a.territorialInterest>30?70:-100,aggression>0?Math.min(85,aggression*2.2)+Math.max(0,50-r.trust)*.15:-100);domesticCost=a.economicValue*.55+u.fiscal*.15;escalationRisk=10+u.crisis*.2;}
 if(action==='lift_sanctions'){economic=a.economicValue*.4+15;security=(r.relations>-25||a.territorialInterest===0)?20:-60;}
 if(action==='break_defense'||action==='break_non_aggression'){security=r.relations<-75&&a.threat>65?65:-100;domesticCost=20+a.economicValue*.3;escalationRisk=15+u.crisis*.25;}
 if(action==='support_parent'){security=a.allianceValue*.2;trust=5;}
 const bias=posture==='commercial'?economic*.1:posture==='cooperative'?trust*.2:posture==='defensive'?security*.1:0;
 const blocked=getDiplomaticActionBlock(game,actor,target,action,true);
 return {security,economic,trust,domesticCost,escalationRisk,total:blocked?-Infinity:security+economic+trust+bias-domesticCost-escalationRisk};
}
export function warGoalFor(b:CasusBelliState):WarGoal {return b.type==='breakaway_claim'?'reunification':b.type==='territorial_dispute'&&b.targetRegionId?'border_claim':b.type==='ally_attacked'?'defense':'punitive';}
export function scoreWarDesire(game:GameState,actor:string,b:CasusBelliState):number {
 const goal=warGoalFor(b);if(getWarDeclarationBlock(game,actor,b.id,goal,true))return -Infinity;
 const a=assessCountry(game,actor,b.targetCountryId),m=game.world.countries[actor].military!,n=game.world.countries[b.targetCountryId].military!,u=domesticBurden(game,actor),r=getBilateralRelation(game.world,actor,b.targetCountryId)!;
 const allied=Object.keys(game.world.countries).filter(id=>id!==actor&&id!==b.targetCountryId&&getBilateralRelation(game.world,id,b.targetCountryId)?.defensePact).reduce((sum,id)=>sum+game.world.countries[id].military!.capability,0),ratio=m.capability/Math.max(1,n.capability+allied);
 if(ratio<1.15||m.readiness<50||u.crisis>70||u.fiscal>80||m.fatigue>55||activeWars(game.world).some(w=>w.participants[actor])||r.relations>-25)return -Infinity;
 const broke=game.world.diplomacy!.history.find(h=>h.actorId===actor&&h.targetId===b.targetCountryId&&h.action==='break_non_aggression');if(broke&&game.turn-broke.turn<strategicConfig.postTreatyWarDelay)return -Infinity;
 return a.territorialInterest*.45+Math.min(80,(ratio-1)*40)+m.warSupport*.35+a.threat*.25+(b.type==='territorial_dispute'||b.type==='breakaway_claim'?30:20)-40-u.fiscal*.35-u.social*.15-u.instability*.25-u.crisis*.7-r.tradeLevel*.45-m.fatigue*.5-Math.max(0,60-m.readiness)*.8;
}
export function scoreAllyCall(game:GameState,ally:string,defender:string):number {const r=getBilateralRelation(game.world,ally,defender)!,m=game.world.countries[ally].military!,u=domesticBurden(game,ally);return r.trust*.45+r.relations*.2+m.capability*.2-u.crisis*.6-u.fiscal*.3-militaryCommitments(game.world,ally)*20-m.fatigue*.2;}
export function warGoalProgress(w:InterstateWarState):number {return Math.min(1,w.strategicControl/(w.warGoal==='punitive'?75:90));}
export function warStalematePressure(w:InterstateWarState):number {return Math.max(0,w.monthsAtWar-12)*Math.max(0,1-w.strategicControl/Math.max(1,w.monthsAtWar*.8));}
export function warStrategy(game:GameState,id:string,w:InterstateWarState):WarStrategy {
 const p=w.participants[id],m=game.world.countries[id].military!,u=domesticBurden(game,id),control=p.side==='attacker'?w.strategicControl:100-w.strategicControl;
 if((control<15&&w.monthsAtWar>=6&&Object.values(w.participants).filter(x=>x.side!==p.side).reduce((s,x)=>s+game.world.countries[x.countryId].military!.capability,0)>m.capability*1.5)||p.fatigue>85||p.warSupport<15)return 'survival';
 if(w.monthsAtWar>=48||warStalematePressure(w)>20||p.fatigue>65||p.warSupport<25||u.fiscal>80)return 'seek_peace';
 if(p.fatigue>45||w.monthsAtWar>=24||u.crisis>65)return 'seek_ceasefire';
 const enemy=Object.values(w.participants).filter(x=>x.side!==p.side).reduce((s,x)=>s+game.world.countries[x.countryId].military!.capability,0);
 if(m.capability>enemy*1.4&&p.fatigue<30&&p.warSupport>50)return 'press_advantage';return 'hold';
}
export function scorePeace(game:GameState,id:string,w:InterstateWarState,resolution:WarResolution):number {
 const p=w.participants[id],strategy=warStrategy(game,id,w),control=p.side==='attacker'?w.strategicControl:100-w.strategicControl,u=domesticBurden(game,id);
 let value=p.fatigue*.7+Math.max(0,55-p.warSupport)*.8+w.monthsAtWar*.8+u.fiscal*.15+u.crisis*.2;
 if(strategy==='survival')value+=80;
 const enemy=Object.values(w.participants).filter(x=>x.side!==p.side).reduce((s,x)=>s+game.world.countries[x.countryId].military!.capability,0),ratio=game.world.countries[id].military!.capability/Math.max(1,enemy);
 const commitment=p.side==='attacker'?(1-warGoalProgress(w))*Math.min(1,ratio)*35*Math.exp(-w.monthsAtWar/18):p.warSupport*.2*Math.exp(-w.monthsAtWar/18);
 value+=warStalematePressure(w)*.8-commitment;
 const attained=p.side==='attacker'&&(w.strategicControl>=90||w.warGoal==='punitive'&&w.strategicControl>=75);
 if(resolution==='territory_transfer'||resolution==='reparations'){value+=p.side==='attacker'?45:-35;if(resolution==='territory_transfer'&&p.side==='defender'&&game.world.countries[id].identity?.isDynamic)value-=25;}
 if(resolution==='recognition'||resolution==='abandon_reunification')value+=game.world.countries[id].identity?.isDynamic?30:p.side==='attacker'?-20:0;
 if(resolution==='defense_success'&&p.side==='defender'&&w.strategicControl<=25)value+=35;
 if(attained&&resolution==='status_quo'&&w.monthsAtWar<48)value-=70;
 if(control>75&&p.fatigue<35&&w.monthsAtWar<24&&resolution==='status_quo')value-=50;
 if(id===w.primaryDefender&&strategy!=='survival'&&resolution==='status_quo')value-=defenderRally(w)*.4;
 return value;
}
