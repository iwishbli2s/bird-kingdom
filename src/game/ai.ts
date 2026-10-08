import {policyChangeBlock,emergencyBudgetAvailable,synchronizePolicySchedules} from './policySchedule';
import { budgetCategoryConfig } from './budgetConfig';
import { aiConfig, aiReasonCodes, aiStrategyLabels } from './aiConfig';
import { synchronizeGovernmentAI, createGovernmentAI, inferGovernmentProfile } from './aiState';
import { calculateAIUrgencies, chooseAIStrategy, chooseAITaxPolicy, chooseAIBudgetPolicy, researchDomainScore } from './aiEvaluation';
import { controlledGovernmentId, governmentDescriptors, governmentRuntime } from './government';
import { setGovernmentTaxPolicy } from './taxPolicy';
import { setGovernmentBudgetPolicy } from './budgetPolicy';
import { researchBlock, setGovernmentResearch } from './technology';
import { technologyDefinitions } from './technologyDefinitions';
import { technologyDomains } from './technologyConfig';
import type { AIDecisionRecord, AIUrgencies, GameState, GovernmentAIState, GovernmentDescriptor } from './types';
export function recordAIDecision(game:GameState,id:string,record:Omit<AIDecisionRecord,'date'|'turn'|'governmentId'>):GameState {
 const state=game.world.governmentAI?.[id];if(!state)return game;
 return {...game,world:{...game.world,governmentAI:{...game.world.governmentAI,[id]:{...state,recentDecisions:[{...record,date:{...game.date},turn:game.turn,governmentId:id},...state.recentDecisions].slice(0,aiConfig.recordLimit)}}}};
}
export function aiReasons(u:AIUrgencies):string[]{const result:string[]=[];if(u.unemployment>40)result.push(aiReasonCodes.HIGH_UNEMPLOYMENT);if(u.fiscal>40)result.push(aiReasonCodes.HIGH_DEBT);if(u.inflation>40)result.push(aiReasonCodes.HIGH_INFLATION);if(u.social>40)result.push(aiReasonCodes.LOW_SOCIAL);if(u.crisis>40)result.push(aiReasonCodes.ACTIVE_CRISIS);if(u.researchLag>40)result.push(aiReasonCodes.RESEARCH_LAG);return result.length?result:[aiReasonCodes.PROFILE];}
export function adjustAIResearch(game:GameState,g:GovernmentDescriptor,state:GovernmentAIState,u:AIUrgencies):GameState {
 if(g.federal)return game;let next=game;
 const score=(id:string)=>{const def=technologyDefinitions.find(t=>t.id===id)!;const t=governmentRuntime(next.world,g).technology!;const progress=t.researchProgress[id]??(t.domains[def.domain].currentResearchId===id?t.domains[def.domain].progress:0);return researchDomainScore(game,g,state,u,def.domain)+progress*.6;};
 const candidates=technologyDefinitions.filter(def=>{const t=structuredClone(governmentRuntime(next.world,g).technology!);for(const d of technologyDomains)t.domains[d].currentResearchId=null;return !researchBlock(t,def.id);}).sort((a,b)=>score(b.id)-score(a.id)||a.id.localeCompare(b.id));
 for(const candidate of candidates){let t=governmentRuntime(next.world,g).technology!;if(t.domains[candidate.domain].currentResearchId===candidate.id)continue;
  const current=technologyDomains.flatMap(d=>t.domains[d].currentResearchId?[t.domains[d].currentResearchId!]:[]);
  const same=t.domains[candidate.domain].currentResearchId;
  if(same&&score(candidate.id)<=score(same)+aiConfig.researchSwitchMargin)continue;
  if(current.length>=3&&!same){const lowest=current.slice().sort((a,b)=>score(a)-score(b)||a.localeCompare(b))[0];if(score(candidate.id)<=score(lowest)+aiConfig.researchSwitchMargin)continue;const old=technologyDefinitions.find(d=>d.id===lowest)!;next=setGovernmentResearch(next,g.id,old.domain,null,{log:false});}
  if(!researchBlock(governmentRuntime(next.world,g).technology!,candidate.id))next=setGovernmentResearch(next,g.id,candidate.domain,candidate.id,{log:false});
 }
 return next;
}
export function updateDomesticAI(game:GameState,options:{autonomousWorld?:boolean}={}):GameState {
 if(game.gameOverReason||!game.player.alive)return game;
 let next=synchronizePolicySchedules(game,{...game,world:synchronizeGovernmentAI(game.world)});
 // All assessments use the same finished-month snapshot, before any government changes policy.
 const snapshot=next;
 for(const g of governmentDescriptors(snapshot.world)){
  const previous=snapshot.world.governmentAI![g.id];if(!options.autonomousWorld&&!isGovernmentAIEnabled(game,g.id)||previous.lastDecisionMonth===game.turn)continue;
  const u=calculateAIUrgencies(snapshot,g,previous),r=governmentRuntime(snapshot.world,g),state:GovernmentAIState={...previous,strategyMonths:previous.strategyMonths+1,policyCooldowns:{taxes:Math.max(0,previous.policyCooldowns.taxes-1),budget:Math.max(0,previous.policyCooldowns.budget-1),research:Math.max(0,previous.policyCooldowns.research-1)},lastDecisionMonth:game.turn,economicHistory:[...previous.economicHistory,{gdp:r.economy.gdp,growth:r.economy.growth,balance:r.fiscal.monthlyBalance}].slice(-aiConfig.historyMonths)};
  const war=Object.values(snapshot.world.warfare?.wars??{}).some(w=>w.status==='active'&&w.participants[g.countryId])||Object.values(snapshot.world.internalConflicts??{}).some(c=>c.status==='armed_conflict'&&(c.parentCountryId===g.countryId||c.breakawayCountryId===g.countryId));
  const strategy=chooseAIStrategy(state,u,war);if(strategy!==state.currentStrategy){state.currentStrategy=strategy;state.strategyMonths=0;}
  next={...next,world:{...next.world,governmentAI:{...next.world.governmentAI,[g.id]:state}}};
  const reasons=aiReasons(u);
  if(strategy!==previous.currentStrategy)next=recordAIDecision(next,g.id,{type:'strategy',summary:'정책 방향: '+aiStrategyLabels[strategy],reasonCodes:reasons});
  if(game.policyScheduleEnabled===false?!state.policyCooldowns.taxes:!policyChangeBlock(next,g.id,'tax')){const policy=chooseAITaxPolicy(snapshot,g,state,u),before=next;next=setGovernmentTaxPolicy(next,g.id,policy,{log:false});if(next!==before){state.policyCooldowns.taxes=aiConfig.taxCooldown;next=recordAIDecision(next,g.id,{type:'tax',summary:`세율 조정: 소득 ${policy.incomeTaxRate}% · 법인 ${policy.corporateTaxRate}% · 소비 ${policy.consumptionTaxRate}%`,reasonCodes:reasons});}}
  const emergency=game.policyScheduleEnabled!==false&&!!policyChangeBlock(next,g.id,'budget')&&emergencyBudgetAvailable(next,g.id)&&!policyChangeBlock(next,g.id,'budget',true);
  if(game.policyScheduleEnabled===false?!state.policyCooldowns.budget:!policyChangeBlock(next,g.id,'budget')||emergency){const policy=chooseAIBudgetPolicy(snapshot,g,state,u),before=next;next=setGovernmentBudgetPolicy(next,g.id,policy,{log:false,emergency});if(next!==before){state.policyCooldowns.budget=aiConfig.budgetCooldown;next=recordAIDecision(next,g.id,{type:'budget',summary:'예산 조정: '+Object.entries(policy).filter(([key,n])=>n!==r.fiscal.budgetPolicy[key as keyof typeof policy]).map(([key,n])=>budgetCategoryConfig[key as keyof typeof policy].label+' '+n.toFixed(1)+'%').join(' · '),reasonCodes:reasons});}}
  if(!state.policyCooldowns.research){const before=next;next=adjustAIResearch(next,g,state,u);if(next!==before){state.policyCooldowns.research=aiConfig.researchCooldown;next=recordAIDecision(next,g.id,{type:'research',summary:'현재 위기와 기술 수준에 맞춰 우선 연구 조정',reasonCodes:reasons});}}
  if(game.policyScheduleEnabled!==false){state.policyCooldowns.taxes=Math.max(0,(next.policySchedules?.[g.id]?.taxNextChangeTurn??game.turn)-game.turn);state.policyCooldowns.budget=Math.max(0,(next.policySchedules?.[g.id]?.budgetNextChangeTurn??game.turn)-game.turn);}
  const latest=next.world.governmentAI![g.id];next={...next,world:{...next.world,governmentAI:{...next.world.governmentAI,[g.id]:{...latest,policyCooldowns:{...state.policyCooldowns}}}}};
 }
 return next;
}
export function stateForGovernment(game:GameState,g:GovernmentDescriptor){return game.world.governmentAI?.[g.id]??createGovernmentAI(inferGovernmentProfile(game.world,g));}

export function isGovernmentAIEnabled(game:GameState,id:string){return id!==controlledGovernmentId(game)&&governmentDescriptors(game.world).some(g=>g.id===id);}

