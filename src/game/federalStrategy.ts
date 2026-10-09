import {strategicConflictProfile,conflictSample} from './strategicConflictProfile';
import {conflictOpportunity} from './conflictPressure';
import {assessFederalConfrontation,federalPrimarySpecies,recentFederalConfrontations,federalActionBlock,performFederalAction,isFederalState} from './federalPolitics';
import {derivedCountryRuntime} from './runtime';
import {calculateConflictCapability} from './conflict';
import type {GameState,FederalAction} from './types';

export function evaluateNPCFederalActions(g:GameState,id:string){
 const r=g.world.regions[id],parent=derivedCountryRuntime(g.world,'pigeon'),p=strategicConflictProfile(g,id),a=assessFederalConfrontation(g,id);
 const opportunity=conflictOpportunity({game:g,jurisdiction:{kind:'region',id},runtime:r as never});
 const species=r.speciesPolitics[federalPrimarySpecies(r)]!,m=r.secession?.[species.speciesId];
 const hist=recentFederalConfrontations(g,id),refused=hist.filter(h=>['hardline_rejection','political_pressure','economic_pressure'].includes(h.response)).length;
 const bloc=g.world.statePolitics?.blocs.some(b=>b.active&&b.purpose==='autonomy'&&b.memberStateIds.includes(id))?10:0;
 const wars=Object.values(g.world.warfare?.wars??{}).filter(w=>w.status!=='resolved'&&w.participants.pigeon).length;
 const weak=Math.min(100,100-parent.governance!.stability+wars*15),desperation=Math.max(0,40-r.governance.stability)+Math.max(0,35-r.governance.approval);
 const fiscal=r.fiscal.treasury/Math.max(1,r.economy.gdp),ability=calculateConflictCapability(r)/Math.max(1,calculateConflictCapability(parent));
 const foreignSupport=Object.values(g.world.diplomacy?.relations??{}).filter(b=>b.countryA==='pigeon'||b.countryB==='pigeon').reduce((sum,b)=>sum+(b.defensePact?-6:b.relations<-30?8:0),0);
 const expectedWarSupport=species.independenceSentiment*.5+species.autonomyDemand*.2+r.governance.approval*.2+r.social.publicSafety*.1;
 const escalation=opportunity.escalationOpportunity*.35+a.politicalBacking*.3+p.escalationBias*.2+weak*.12+bloc+Math.min(12,refused*4)-p.caution*.15;
 const retreat=opportunity.deEscalationUtility*.6+p.deescalationBias*.25+(fiscal<.005?22:0)+(ability<.15?8:0);
 const economicPressure=hist.filter(h=>h.response==='economic_pressure').length;
 const scores:Record<FederalAction,number>={criticize:species.autonomyDemand*.6+p.escalationBias*.25-4,
 autonomy:escalation+species.autonomyDemand*.18-15,renegotiate:retreat+species.autonomyDemand*.25,
 defy:escalation+Math.min(16,refused*6)+Math.min(20,economicPressure*10)-30,confront:escalation+species.independenceSentiment*.3-35,
 referendum:escalation+a.independenceBacking*.3-20,declare:escalation+a.independenceBacking*.4+ability*12+weak*.1+Math.max(-12,Math.min(12,foreignSupport))+(expectedWarSupport-60)*.1-55};
 if(species.autonomyDemand<45||species.satisfaction>60){for(const k of ['criticize','autonomy','defy','confront','referendum','declare'] as const)scores[k]=-Infinity;scores.renegotiate=-Infinity;}
 if(!refused)scores.defy=scores.confront=-Infinity;
 if(species.independenceSentiment<65||!m||m.monthsActive<24||!['autonomy_campaign','referendum_campaign'].includes(m.phase))scores.referendum=-Infinity;
 const viable=a.economicBacking>=40&&fiscal>=.005&&a.independenceBacking>=70;
 const extreme=species.independenceSentiment>=90&&r.governance.integration<30&&refused>0&&weak>40;
 if(refused>=2)scores.confront+=12;
 if(extreme)scores.declare+=30;
 if(!viable||(!extreme&&(!m||m.monthsActive<24||refused<2))||species.independenceSentiment<80)scores.declare=-Infinity;
 if(a.politicalBacking<45){const riskyDeclaration=scores.declare;scores.confront-=25;scores.declare=-Infinity;scores.referendum-=15;
  // A bounded, reproducible rare gamble only in a genuine collapse, never a generic random suicide.
  if(viable&&extreme&&desperation>30&&p.aggression>65&&conflictSample(g,id,'desperation')>.97)scores.declare=riskyDeclaration-25;
 }
 if(retreat>escalation){scores.defy-=20;scores.confront-=25;scores.declare-=35;}
 for(const action of Object.keys(scores) as FederalAction[]){if(federalActionBlock(g,id,action))scores[action]=-Infinity;else scores[action]+=(conflictSample(g,id,action)-.5)*10;}
 return {scores,escalation,retreat,reasonCodes:[...(refused?['REPEATED_FEDERAL_REFUSAL']:[]),...(bloc?['AUTONOMY_BLOC']:[]),...(weak>40?['FEDERAL_OVEREXTENDED']:[]),...(a.independenceBacking>=70?['HIGH_SEPARATIST_SUPPORT']:[]),...(fiscal<.005?['LOW_TREASURY']:[])]};
}
export function updateNPCFederalStrategy(g:GameState,autonomousWorld=false):GameState {
 if(g.gameOverReason||g.events.pendingEvent||g.turn%6!==0||g.tutorial?.mode==='active'&&g.tutorial.scriptedScenarioEnabled)return g;
 let next=g;const ids=Object.keys(g.world.regions).filter(id=>isFederalState(g,id)&&(autonomousWorld||id!==g.player.controlledRegionId)).sort();
 for(const id of ids){if(!isFederalState(next,id))continue;
  if(next.world.statePolitics?.actionCooldowns[id]&&next.world.statePolitics.actionCooldowns[id]>g.turn)continue;
  const decision=evaluateNPCFederalActions(next,id),best=(Object.entries(decision.scores) as [FederalAction,number][]).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0];
  if(best&&best[1]>=55)next=performFederalAction(next,id,best[0],best[0]==='autonomy'?'substantial':'limited');
 }
 return next;
}
