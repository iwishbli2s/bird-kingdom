import {growthConvergenceConfig} from './balanceConfig';
import { technologyConfig as c, technologyDomains } from './technologyConfig';
import { technologyDefinitions } from './technologyDefinitions';
import type { TechnologyBonuses, TechnologyState } from './technologyTypes';
import type { EventEffect, IndustryId } from './types';
const clamp=(n:number,max:number)=>Math.max(0,Math.min(max,n));
export function getTechnologyBonuses(t?:TechnologyState,allUnlocked=false):TechnologyBonuses {
 if(t?.aggregateBonuses&&!allUnlocked)return structuredClone(t.aggregateBonuses);
 const b:TechnologyBonuses={growth:{},productivity:{},social:{},mortality:0,readiness:0,logistics:0,capability:0,research:0,eventDamage:{}};
 for(const def of technologyDefinitions)if(t?.unlockedTechnologies.includes(def.id)&&(allUnlocked||!t.baselineUnlockedTechnologies.includes(def.id)))for(const e of def.effects){
 if(e.type==='industry_growth')b.growth[e.industry]=clamp((b.growth[e.industry]??0)+e.value,c.maxGrowth);
 else if(e.type==='productivity')b.productivity[e.industry]=clamp((b.productivity[e.industry]??0)+e.value,c.maxProductivity);
 else if(e.type==='social_target')b.social[e.metric]=clamp((b.social[e.metric]??0)+e.value,c.maxSocial);
 else if(e.type==='event_damage_modifier')b.eventDamage[e.tag]=clamp((b.eventDamage[e.tag]??0)+e.value,c.maxDamageReduction);
 else {const key=({population_mortality:'mortality',military_readiness:'readiness',military_logistics:'logistics',military_capability:'capability',research_bonus:'research'} as const)[e.type];const max=({mortality:c.maxMortalityReduction,readiness:c.maxReadiness,logistics:c.maxLogistics,capability:c.maxCapability,research:c.maxResearch})[key];b[key]=clamp(b[key]+e.value,max);}
 }return b;
}
export function getTechnologyIndustryModifiers(t?:TechnologyState){const b=getTechnologyBonuses(t),level=t?technologyDomains.reduce((s,d)=>s+t.domains[d].level,0)/technologyDomains.length:0,growthFactor=1/(1+Math.max(0,level-growthConvergenceConfig.highTechStart)*growthConvergenceConfig.highTechGrowthResponse);return Object.fromEntries([...new Set([...Object.keys(b.growth),...Object.keys(b.productivity)])].map(id=>[id,{annualGrowthAdjustment:(b.growth[id as IndustryId]??0)*growthFactor,productivityMultiplier:1+(b.productivity[id as IndustryId]??0)}]));}
export function aggregateTechnologyStates(members:readonly {technology?:TechnologyState;population:{total:number}}[]):TechnologyState|undefined {
 const valid=members.filter(m=>m.technology);if(!valid.length)return undefined;const total=valid.reduce((s,m)=>s+m.population.total,0);const weight=(m:typeof valid[number])=>total?m.population.total/total:1/valid.length;
 const first=structuredClone(valid[0].technology!),unlocked=[...new Set(valid.flatMap(m=>m.technology!.unlockedTechnologies))];
 const bonuses=getTechnologyBonuses();for(const m of valid){const b=getTechnologyBonuses(m.technology),w=weight(m);for(const key of ['mortality','readiness','logistics','capability','research'] as const)bonuses[key]+=b[key]*w;for(const key of ['growth','productivity','social','eventDamage'] as const)for(const [id,value] of Object.entries(b[key])){const record=bonuses[key] as Record<string,number>;record[id]=(record[id]??0)+value*w;}}
 return {...first,domains:Object.fromEntries(technologyDomains.map(domain=>[domain,{level:clamp(valid.reduce((s,m)=>s+m.technology!.domains[domain].level*weight(m),0),10),progress:clamp(valid.reduce((s,m)=>s+m.technology!.domains[domain].progress*weight(m),0),100),currentResearchId:null}])) as TechnologyState['domains'],researchCapacity:valid.reduce((s,m)=>s+m.technology!.researchCapacity,0),innovationEfficiency:valid.reduce((s,m)=>s+m.technology!.innovationEfficiency*weight(m),0),unlockedTechnologies:unlocked,researchProgress:{},aggregateBonuses:bonuses};
}
/** 직접 국가의 자산 흡수 시 지식은 합집합, 누적 진척은 최대값으로 보존합니다. */
export function mergeTechnologyStates(a?:TechnologyState,b?:TechnologyState):TechnologyState|undefined {
 if(!a)return b?structuredClone(b):undefined;if(!b)return structuredClone(a);
 const next=structuredClone(a);delete next.aggregateBonuses;next.unlockedTechnologies=[...new Set([...a.unlockedTechnologies,...b.unlockedTechnologies])];next.baselineUnlockedTechnologies=[...new Set([...a.baselineUnlockedTechnologies,...b.baselineUnlockedTechnologies])];
 for(const domain of technologyDomains)next.domains[domain].level=Math.max(a.domains[domain].level,b.domains[domain].level);
 for(const [id,n] of Object.entries(b.researchProgress))next.researchProgress[id]=Math.max(n,next.researchProgress[id]??0);
 for(const domain of technologyDomains){const d=next.domains[domain];if(d.currentResearchId&&next.unlockedTechnologies.includes(d.currentResearchId))d.currentResearchId=null;d.progress=d.currentResearchId?next.researchProgress[d.currentResearchId]??0:0;}
 return next;
}
export function mitigateTechnologyEventEffects(t:TechnologyState|undefined,tags:readonly string[],effects:readonly EventEffect[]):EventEffect[]{const b=getTechnologyBonuses(t);const reduction=Math.min(c.maxDamageReduction,tags.reduce((s,tag)=>s+(b.eventDamage[tag]??0),0));return effects.map(e=>e.kind==='industry'&&e.multiplier<1?{...e,multiplier:1-(1-e.multiplier)*(1-reduction)}:e.kind==='social'&&e.delta<0?{...e,delta:e.delta*(1-reduction)}:e.kind==='population'&&(e.flow==='death'||e.flow==='migration'&&e.ratio<0)?{...e,ratio:e.ratio*(1-reduction)}:e);}
