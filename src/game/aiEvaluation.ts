import {balanceAdjustments} from './balanceConfig';
import { aiConfig, profileBudgets, profileResearch } from './aiConfig';
import { crisesFor } from './crisis';
import { governmentDescriptors, governmentRuntime } from './government';
import { calculateTaxRevenue } from './fiscal';
import { sumBudgetRates, validateBudgetPolicy } from './budget';
import { budgetCategoryConfig, budgetCategoryIds } from './budgetConfig';
import { taxFields, taxPolicyConfig } from './fiscalConfig';
import type { AIDecisionScore, AIGovernmentProfile, AIStrategy, AIUrgencies, BudgetPolicy, GameState, GovernmentAIState, GovernmentDescriptor, TaxPolicy, TechnologyDomain } from './types';
export const clampAI=(n:number,min=0,max=100)=>Number.isFinite(n)?Math.max(min,Math.min(max,n)):max;
export const governmentCrises=(game:GameState,g:GovernmentDescriptor)=>g.federal?Object.values(game.world.crises?.activeCrises??{}).filter(c=>c.jurisdictionKind==='region'&&game.world.regions[c.jurisdictionId]?.ownerCountryId===g.countryId):crisesFor(game.world,g.jurisdiction);
export const governmentWarPressure=(game:GameState,g:GovernmentDescriptor)=>Object.values(game.world.warfare?.wars??{}).some(w=>w.status==='active'&&w.participants[g.countryId])||Object.values(game.world.internalConflicts??{}).some(c=>c.status==='armed_conflict'&&(c.parentCountryId===g.countryId||c.breakawayCountryId===g.countryId));
export function calculateAIUrgencies(game:GameState,g:GovernmentDescriptor,state:GovernmentAIState):AIUrgencies {
 const r=governmentRuntime(game.world,g),e=r.economy,f=r.fiscal,s=r.social!,gov=r.governance!;
 const history=state.economicHistory.slice(-11),growth=(e.growth+history.reduce((n,h)=>n+h.growth,0))/(history.length+1);
 const trend=history.length&&history[0].gdp>0?(e.gdp/history[0].gdp-1)*100:0;
 const deficit=Math.max(0,-f.monthlyBalance)/Math.max(1,e.gdp)*1200;
 const annualSurplus=Math.max(0,f.monthlyBalance)/Math.max(1,e.gdp)*1200;
 const debt=f.debt/Math.max(1,e.gdp),cash=f.treasury/Math.max(1,e.gdp);
 const satisfaction=Object.values(r.speciesPolitics??{}).reduce((a,p)=>a+p.satisfaction*(r.population.species[p.speciesId]?.population??0),0)/Math.max(1,r.population.total);
 const governments=governmentDescriptors(game.world).filter(d=>!d.federal),tech=governments.map(d=>governmentRuntime(game.world,d).technology).filter(t=>!!t);
 const average=tech.length?tech.reduce((sum,t)=>sum+Object.values(t!.domains).reduce((n,d)=>n+d.level,0)/6,0)/tech.length:0;
 const own=r.technology?Object.values(r.technology.domains).reduce((sum,d)=>sum+d.level,0)/6:average;
 const crises=governmentCrises(game,g),crisis=crises.reduce((sum,c)=>sum+c.intensity*(.6+c.severity/250)*(1-c.recoveryProgress/150),0);
 return {recession:clampAI(Math.max(0,2-growth)*12+Math.max(0,-trend)*4+Math.max(0,e.unemployment-6)*3),unemployment:clampAI((e.unemployment-5)*14),inflation:clampAI(Math.max(0,e.inflation-2)*12+Math.max(0,-e.inflation-1)*5),
 fiscal:clampAI(deficit*14+Math.max(0,debt-.6)*40+Math.max(0,f.annualInterestRate-4)*5+Math.max(0,.08-cash)*180-annualSurplus*8),
 social:clampAI(Math.max(0,55-s.livingStandard)*1.3+Math.max(0,s.inequality-40)*.6+Math.max(0,55-s.healthcare)+Math.max(0,55-s.publicSafety)*.7),
 instability:clampAI(Math.max(0,55-gov.stability)+Math.max(0,60-gov.integration)*.7+Math.max(0,60-satisfaction)*.5),crisis:clampAI(crisis),researchLag:clampAI(Math.max(0,average-own)*25)};
}
export function strategyScores(u:AIUrgencies,war:boolean):Record<AIStrategy,number>{return {normal:30,growth:Math.max(u.recession,u.unemployment)*.8+u.recession*.15,fiscal_repair:u.fiscal,social_recovery:Math.max(u.social,u.instability)*.9,crisis_response:u.crisis,research_push:u.social<35&&u.fiscal<35?u.researchLag:0,security_focus:war?60:0};}
export function chooseAIStrategy(state:GovernmentAIState,u:AIUrgencies,war=false):AIStrategy {
 if(u.crisis>=aiConfig.urgentCrisis)return 'crisis_response';
 if(state.strategyMonths<aiConfig.strategyHoldMonths)return state.currentStrategy;
 const scores=strategyScores(u,war),candidate=(Object.keys(scores) as AIStrategy[]).sort((a,b)=>scores[b]-scores[a]||a.localeCompare(b))[0];
 if(candidate===state.currentStrategy)return candidate;
 return scores[candidate]>scores[state.currentStrategy]+aiConfig.switchMargin||scores[state.currentStrategy]<20?candidate:state.currentStrategy;
}
export function aiUtility(parts:Omit<AIDecisionScore,'total'>,strategy:AIStrategy,profile:AIGovernmentProfile='balanced'):AIDecisionScore {
 const weights={growth:strategy==='growth'?2:1,fiscal:strategy==='fiscal_repair'?2:1,social:strategy==='social_recovery'?2:1,stability:strategy==='security_focus'?1.7:1,research:strategy==='research_push'?2:1,crisis:strategy==='crisis_response'?2:1};
 // Modest profile preferences never outweigh a serious crisis or fiscal emergency.
 if(profile==='industrial'||profile==='agricultural')weights.growth*=1.15;
 if(profile==='social')weights.social*=1.15;
 if(profile==='research')weights.research*=1.15;
 if(profile==='security')weights.stability*=1.15;
 return {...parts,total:(Object.keys(weights) as (keyof typeof weights)[]).reduce((sum,k)=>sum+parts[k]*weights[k],0)};
}
function plannedBalance(game:GameState,g:GovernmentDescriptor,tax?:TaxPolicy,budget?:BudgetPolicy){const r=governmentRuntime(game.world,g);return calculateTaxRevenue(r.economy.gdp,tax??r.fiscal.taxPolicy).total*1200/Math.max(1,r.economy.gdp)-sumBudgetRates(budget??r.fiscal.budgetPolicy)-r.fiscal.debt/Math.max(1,r.economy.gdp)*r.fiscal.annualInterestRate;}
export function scoreTaxPolicy(game:GameState,g:GovernmentDescriptor,state:GovernmentAIState,u:AIUrgencies,policy:TaxPolicy):AIDecisionScore {
 const r=governmentRuntime(game.world,g),old=r.fiscal.taxPolicy;let growth=0,fiscal=0,social=0;
 const balance=plannedBalance(game,g),need=Math.max(u.fiscal/100,clampAI(-balance/2,0,1));
 for(const k of taxFields){const d=policy[k]-old[k],base=r.fiscal.baselineTaxPolicy[k];
  const recession=1+Math.max(u.recession,u.unemployment)/25;
  growth-=d*(k==='corporateTaxRate'?.8:k==='incomeTaxRate'?.5:.15)*recession;
  fiscal+=d*(k==='incomeTaxRate'?.55:k==='corporateTaxRate'?.18:.65)*(need*12-1.5);
  social-=d*(k==='consumptionTaxRate'?1+u.inflation/15:.25);
  // A stable baseline attracts policy back gradually; it is not an AI-only validation range.
  fiscal-=(Math.abs(policy[k]-base)-Math.abs(old[k]-base))*.45;
 }
 return aiUtility({growth,fiscal,social,stability:0,research:0,crisis:0},state.currentStrategy,state.profile);
}
export function chooseAITaxPolicy(game:GameState,g:GovernmentDescriptor,state:GovernmentAIState,u:AIUrgencies):TaxPolicy {
 const current=governmentRuntime(game.world,g).fiscal.taxPolicy;let best={...current},score=0;
 const step=game.policyScheduleEnabled!==false&&u.fiscal>=balanceAdjustments.fiscalEmergencyUrgency?balanceAdjustments.fiscalEmergencyTaxStep:aiConfig.maxTaxStep;
 for(const k of taxFields)for(const direction of [-1,1]){const p={...current,[k]:Math.round((current[k]+direction*step)*10)/10};if(p[k]<taxPolicyConfig[k].min||p[k]>taxPolicyConfig[k].max)continue;
  if(direction<0&&(u.fiscal>35||plannedBalance(game,g)<1.5))continue;
  if(direction>0&&k==='consumptionTaxRate'&&u.inflation>45)continue;
  if(direction>0&&k!=='consumptionTaxRate'&&Math.max(u.recession,u.unemployment)>80&&u.fiscal<85)continue;
  const value=scoreTaxPolicy(game,g,state,u,p).total;if(value>score+.15){score=value;best=p;}
 }return best;
}
export function desiredAIBudget(game:GameState,g:GovernmentDescriptor,state:GovernmentAIState,u:AIUrgencies):BudgetPolicy {
 const r=governmentRuntime(game.world,g),targets={...r.fiscal.baselineBudgetPolicy};
 profileBudgets[state.profile].forEach((k,i)=>targets[k]+=[.6,.4,.2][i]);
 const add=(k:keyof BudgetPolicy,n:number)=>{targets[k]+=n;};
 if(u.recession>25||u.unemployment>25){add('industrySupport',u.unemployment/100);add('infrastructure',u.recession/100*.7);}
 add('welfare',Math.max(0,r.social!.inequality-40)/35+u.social/150);add('healthcare',Math.max(0,55-r.social!.healthcare)/30);add('security',Math.max(0,55-r.social!.publicSafety)/40);
 if(u.researchLag>35&&u.fiscal<40)add('research',u.researchLag/100);
 for(const c of governmentCrises(game,g)){const n=c.intensity/100;if(c.category==='disease'){add('healthcare',n*1.5);if(c.type==='seed_blight')add('industrySupport',n);}
  else {add('infrastructure',n*1.5);add('security',n*.6);}if(['wetland_drought','reed_fire','seed_blight'].includes(c.type)){add('welfare',n);add('industrySupport',n*.5);}}
 if(governmentWarPressure(game,g)){add('defense',.8);add('infrastructure',.4);add('security',.4);}
 if(u.fiscal>45){for(const k of budgetCategoryIds)targets[k]-=(u.fiscal-45)/100*(['healthcare','welfare','security'].includes(k)?.25:.8)*(u.recession>60?.5:1);}
 for(const k of budgetCategoryIds)targets[k]=clampAI(targets[k],Math.min(r.fiscal.baselineBudgetPolicy[k],aiConfig.budgetFloor),Math.min(budgetCategoryConfig[k].max,r.fiscal.baselineBudgetPolicy[k]+2.5));return targets;
}
export function scoreBudgetPolicy(game:GameState,g:GovernmentDescriptor,state:GovernmentAIState,u:AIUrgencies,policy:BudgetPolicy):AIDecisionScore {
 const r=governmentRuntime(game.world,g),current=r.fiscal.budgetPolicy,target=desiredAIBudget(game,g,state,u);let score=0,growth=0,social=0,research=0,crisis=0;
 for(const k of budgetCategoryIds){const d=policy[k]-current[k];score+=(Math.abs(current[k]-target[k])-Math.abs(policy[k]-target[k]))*5;
  growth+=d*(['industrySupport','infrastructure'].includes(k)?u.unemployment/100:0);
  social+=d*(['healthcare','welfare','education','security'].includes(k)?u.social/80:0);research+=d*(k==='research'?u.researchLag/80:0);
  crisis+=d*(governmentCrises(game,g).some(c=>c.category==='disease')&&k==='healthcare'?u.crisis/35:governmentCrises(game,g).some(c=>c.category==='disaster')&&k==='infrastructure'?u.crisis/35:0);
 }
 const delta=sumBudgetRates(policy)-sumBudgetRates(current),balance=plannedBalance(game,g,undefined,policy);
 const fiscal=score-delta*u.fiscal/35-Math.max(0,-balance)*Math.max(0,delta)*2;
 return aiUtility({growth,fiscal,social,stability:0,research,crisis},state.currentStrategy,state.profile);
}
export function chooseAIBudgetPolicy(game:GameState,g:GovernmentDescriptor,state:GovernmentAIState,u:AIUrgencies):BudgetPolicy {
 const current=governmentRuntime(game.world,g).fiscal.budgetPolicy,target=desiredAIBudget(game,g,state,u);let best={...current},bestScore=0;
 const candidates:BudgetPolicy[]=[];
 for(const k of budgetCategoryIds)for(const direction of [-1,1]){const p={...current,[k]:Math.round((current[k]+direction*aiConfig.maxBudgetStep)*10)/10};if(p[k]<Math.min(aiConfig.budgetFloor,target[k]))continue;candidates.push(p);}
 for(const to of budgetCategoryIds)for(const from of budgetCategoryIds){if(to===from||current[to]>=target[to]||current[from]<=target[from])continue;const p={...current,[to]:Math.round((current[to]+aiConfig.maxBudgetStep)*10)/10,[from]:Math.round((current[from]-aiConfig.maxBudgetStep)*10)/10};candidates.push(p);}
 for(const p of candidates){try{validateBudgetPolicy(p);}catch{continue;}const score=scoreBudgetPolicy(game,g,state,u,p).total;if(score>bestScore+.15){best=p;bestScore=score;}}return best;
}
export function researchDomainScore(game:GameState,g:GovernmentDescriptor,state:GovernmentAIState,u:AIUrgencies,domain:TechnologyDomain):number {
 const r=governmentRuntime(game.world,g),priority=profileResearch[state.profile].indexOf(domain),level=r.technology!.domains[domain].level;
 let score=30-priority*4+(10-level)*2;
 const share=domain==='industry'?r.economy.industries.manufacturing.output/r.economy.gdp:domain==='agriculture'?r.economy.industries.agriculture.output/r.economy.gdp:domain==='information'?r.economy.industries.advanced.output/r.economy.gdp:0;
 score+=share*10+u.researchLag/15;
 for(const c of governmentCrises(game,g)){if(c.category==='disease'&&domain==='medicine')score+=c.intensity*.6;if(['wetland_drought','seed_blight','wetland_contamination','reed_fire'].includes(c.type)&&['agriculture','infrastructure'].includes(domain))score+=c.intensity*.4;if(c.category==='disaster'&&domain==='infrastructure')score+=c.intensity*.35;}
 if(governmentWarPressure(game,g)&&['military','information'].includes(domain))score+=domain==='military'?35:15;
 return score;
}

