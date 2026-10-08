import { stateForGovernment } from './ai';
import { aiUtility, calculateAIUrgencies } from './aiEvaluation';
import { governmentForJurisdiction } from './government';
import { calculateCrisisResilience } from './crisis';
import { crisisAidPartner } from './crisisEvents';
import type { AIDecisionScore, EventContext, EventEffect, EventSeverity, GameEventDefinition } from './types';
const strategic=new Set(['movement','conflict','war','casus_belli','diplomacy']);
export function isDomesticAIEvent(c:EventContext,e:GameEventDefinition,severity:EventSeverity):boolean {
 if(e.id.startsWith('secession-')||e.conflictEvent||e.warEvent||e.diplomacyEvent)return false;
 const aid=['international-rescue','international-grain'].includes(e.id);
 return e.choices.every(choice=>{const p=choice.effects(c,severity,.5);return [...p.immediate,...(p.ongoing??[]).flatMap(x=>x.effects)].every(x=>!strategic.has(x.kind)||(aid&&x.kind==='diplomacy'&&!x.action));});
}
export function scoreAIEventEffects(c:EventContext,effects:readonly EventEffect[]):AIDecisionScore {
 const g=governmentForJurisdiction(c.game,c.jurisdiction);if(!g)return {growth:0,fiscal:0,social:0,stability:0,research:0,crisis:0,total:0};
 const state=stateForGovernment(c.game,g),u=calculateAIUrgencies(c.game,g,state),r=c.runtime;
 const parts={growth:0,fiscal:0,social:0,stability:0,research:0,crisis:0};
 const cash=r.fiscal.treasury/Math.max(1,r.economy.gdp),costWeight=3+u.fiscal/5+(cash<.03?18:0);
 for(const x of effects){
  if(x.kind==='treasury')parts.fiscal+=x.amount/Math.max(1,r.economy.gdp)*100*costWeight;
  else if(x.kind==='industry')parts.growth+=(x.multiplier-1)*100*(1+u.recession/50)+(x.productivityMultiplier??1)-1;
  else if(x.kind==='social')parts.social+=x.delta*(x.metric==='inequality'?-1:1)*(1+u.social/40+(x.metric==='healthcare'&&r.social.healthcare<40?1:0));
  else if(x.kind==='species')parts.social+=x.delta*(x.metric==='satisfaction'?1:-.3)*(1+u.instability/100);
  else if(x.kind==='governance')parts.stability+=x.delta*(1+u.instability/50);
  else if(x.kind==='inflation')parts.social-=x.delta*(1+u.inflation/30);
  else if(x.kind==='research')parts.research+=x.progress*.15*(1+u.researchLag/80);
  else if(x.kind==='population')parts.social+=x.ratio*(x.flow==='death'?-3000:1000);
  else if(x.kind==='start_crisis'){const resilience=calculateCrisisResilience(r),defense=x.protection??0;parts.crisis+=defense*x.severity/10*(1+(100-(x.crisisType==='respiratory_outbreak'||x.crisisType==='feather_mite_outbreak'?resilience.medical:resilience.infrastructure))/100);parts.growth-=(x.activityReduction??0)*150;}
  else if(x.kind==='crisis_recovery')parts.crisis+=x.value*.35*(1+u.crisis/70);
  // NPC has no individual leader mortality in 9A-1; field exposure is not fabricated as a cost.
  else if(x.kind==='leader_risk')continue;
  else if(x.kind==='diplomacy')parts.crisis+=1;
 }
 return aiUtility(parts,state.currentStrategy,state.profile);
}
export function chooseDomesticAIEvent(c:EventContext,e:GameEventDefinition,severity:EventSeverity):{choiceId:string;scored:boolean} {
 try{if(!isDomesticAIEvent(c,e,severity))return {choiceId:e.nonPlayerChoiceId,scored:false};
  if(['international-rescue','international-grain'].includes(e.id)){
   if(!crisisAidPartner(c))return {choiceId:'restrict',scored:true};
   const candidate=e.choices[0].effects(c,severity,.5).immediate.find(x=>x.kind==='diplomacy');if(candidate?.kind==='diplomacy'){const owner=c.jurisdiction.kind==='country'?c.jurisdiction.id:c.game.world.regions[c.jurisdiction.id].ownerCountryId;const rel=Object.values(c.game.world.diplomacy?.relations??{}).find(r=>[r.countryA,r.countryB].includes(owner)&&[r.countryA,r.countryB].includes(candidate.targetId));if(!rel||rel.relations<0||rel.sanctionsAtoB||rel.sanctionsBtoA)return {choiceId:'restrict',scored:true};}}
  const scored=e.choices.map((choice,i)=>{const plan=choice.effects(c,severity,.5);const score=scoreAIEventEffects(c,plan.immediate).total+(plan.ongoing??[]).reduce((sum,a)=>sum+scoreAIEventEffects(c,a.effects).total*Math.min(a.months,6)*.7,0);return {id:choice.id,score,i};});
  if(scored.some(x=>!Number.isFinite(x.score)))return {choiceId:e.nonPlayerChoiceId,scored:false};
  scored.sort((a,b)=>b.score-a.score||Number(b.id===e.nonPlayerChoiceId)-Number(a.id===e.nonPlayerChoiceId)||a.i-b.i);return {choiceId:scored[0]?.id??e.nonPlayerChoiceId,scored:true};
 }catch{return {choiceId:e.nonPlayerChoiceId,scored:false};}
}
