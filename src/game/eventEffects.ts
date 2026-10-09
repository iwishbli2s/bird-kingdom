import {applyStatePoliticalActionEffects} from './stateRelations';
import { startCrisis, recoverCrisis } from './crisis';
import { addCasusBelli } from './casusBelli';
import { applyWarAction } from './warfare';
import { resolvePeace } from './peace';
import { performDiplomaticAction, getDiplomaticPairKey, getBilateralRelation } from './diplomacy';
import { applyConflictAction } from './conflict';
import { applySecessionAction } from './secession';
import { controlledRegionId, refreshCountryAggregates } from './runtime';
import { createRandomSeed, createSeededRandom } from './random';
import { annualizedGrowth, sumIndustryOutput } from './economy';
import { eventConfig } from './eventConfig';
import type { EventEffect, EventRuntime, Jurisdiction } from './eventTypes';
import type { GameState, WorldState } from './types';
const clamp=(n:number,min=0,max=100)=>Math.min(max,Math.max(min,n));
export function applyEventEffects(game:GameState,j:Jurisdiction,effects:readonly EventEffect[],secessionRandom?:()=>number):GameState {
  const source=j.kind==='country'?game.world.countries[j.id]:game.world.regions[j.id];
  if(!source?.social||!source.governance||!source.speciesPolitics)throw new Error('직접 운영하는 사건 대상이 아닙니다.');
  let r:EventRuntime={...source,social:source.social,governance:source.governance,speciesPolitics:source.speciesPolitics};
  const beforeGDP=r.economy.gdp;let industryChanged=false;
  for(const e of effects){
    if(e.kind==='research'){if(!r.technology)continue;const t=structuredClone(r.technology),d=t.domains[e.domain];if(!d.currentResearchId)continue;d.progress=clamp((t.researchProgress[d.currentResearchId]??d.progress)+e.progress,0,99.9);t.researchProgress[d.currentResearchId]=d.progress;r={...r,technology:t};}
    else if(e.kind==='treasury'){
      const treasury=r.fiscal.treasury+e.amount;
      r={...r,fiscal:{...r.fiscal,treasury:Math.max(0,treasury),debt:r.fiscal.debt+Math.max(0,-treasury)}};
    }else if(e.kind==='industry'){
      const old=r.economy.industries[e.industryId];
      r={...r,economy:{...r.economy,industries:{...r.economy.industries,[e.industryId]:{output:Math.max(0,old.output*e.multiplier),productivity:Math.max(0,old.productivity*(e.productivityMultiplier??1))}}}};industryChanged=true;
    }else if(e.kind==='inflation')r={...r,economy:{...r.economy,inflation:clamp(r.economy.inflation+e.delta,eventConfig.inflationMin,eventConfig.inflationMax)}};
    else if(e.kind==='social')r={...r,social:{...r.social,[e.metric]:clamp(r.social[e.metric]+e.delta)}};
    else if(e.kind==='governance')r={...r,governance:{...r.governance,[e.metric]:clamp(r.governance[e.metric]+e.delta)}};
    else if(e.kind==='species'){
      const p=r.speciesPolitics[e.speciesId];if(!p)continue;
      r={...r,speciesPolitics:{...r.speciesPolitics,[e.speciesId]:{...p,[e.metric]:clamp(p[e.metric]+e.delta)}}};
    }else if(e.kind==='population'){
      const p=r.population.species[e.speciesId];if(!p)continue;
      const requested=Math.round(p.population*e.ratio);
      const delta=e.flow==='death'?-Math.min(p.population,Math.max(0,requested)):Math.max(-p.population,e.flow==='birth'?Math.max(0,requested):requested);
      const next={...p,population:p.population+delta,birthsLastMonth:p.birthsLastMonth+(e.flow==='birth'?delta:0),deathsLastMonth:p.deathsLastMonth+(e.flow==='death'?-delta:0),migrationLastMonth:p.migrationLastMonth+(e.flow==='migration'?delta:0)};
      const species={...r.population.species,[e.speciesId]:next},entries=Object.values(species);
      r={...r,population:{species,total:entries.reduce((sum,p)=>sum+p.population,0),birthsLastMonth:entries.reduce((sum,p)=>sum+p.birthsLastMonth,0),deathsLastMonth:entries.reduce((sum,p)=>sum+p.deathsLastMonth,0),netMigrationLastMonth:entries.reduce((sum,p)=>sum+p.migrationLastMonth,0)}};
    }
  }
  if(industryChanged){const gdp=sumIndustryOutput(r.economy.industries);const reference=beforeGDP/Math.pow(1+r.economy.growth/100,1/12);r={...r,economy:{...r.economy,gdp,growth:annualizedGrowth(gdp,reference)}};}
  let world:WorldState=j.kind==='country'?{...game.world,countries:{...game.world.countries,[j.id]:r}}:{...game.world,regions:{...game.world.regions,[j.id]:{...game.world.regions[j.id],...r}}};
  world=refreshCountryAggregates(world);
  let next={...game,world};
  const random=secessionRandom??createSeededRandom(createRandomSeed());
  for(const effect of effects)if(effect.kind==='state_politics')next=applyStatePoliticalActionEffects(next,effect.actorStateId,effect.targetStateId,effect.action,effect.purpose??'economic');
  for(const effect of effects)if(effect.kind==='movement'){
    next=applySecessionAction(next,j,effect.speciesId,effect.action,random);
    if(effect.dispute){const m=(j.kind==='region'?next.world.regions[j.id]:next.world.countries[j.id]).secession?.[effect.speciesId];const id=m?.createdCountryId;if(id){const c=next.world.countries[id];next={...next,world:{...next.world,countries:{...next.world.countries,[id]:{...c,identity:{...c.identity!,territorialDispute:effect.dispute}}}}};}}
  }
  for(const effect of effects)if(effect.kind==='diplomacy'){
    const actor=j.kind==='country'?j.id:next.world.regions[j.id].ownerCountryId;
    if(effect.action)next=performDiplomaticAction(next,actor,effect.targetId,effect.action,true);
    else {const key=getDiplomaticPairKey(actor,effect.targetId),r=getBilateralRelation(next.world,actor,effect.targetId)!;
      next={...next,world:{...next.world,diplomacy:{...next.world.diplomacy!,relations:{...next.world.diplomacy!.relations,[key]:{...r,relations:clamp(r.relations+(effect.relations??0),-100,100),trust:clamp(r.trust+(effect.trust??0)),threatShockMonths:Math.max(r.threatShockMonths,effect.threatShockMonths??0),...(r.relations>=10&&r.relations+(effect.relations??0)<-10?{disruptionMonths:6,disruptionExposure:r.tradeLevel}: {})}}}}};
    }
  }
  for(const effect of effects)if(effect.kind==='conflict')next=applyConflictAction(next,effect.conflictId,effect.action);
  for(const effect of effects)if(effect.kind==='casus_belli'){const actor=j.kind==='country'?j.id:next.world.regions[j.id].ownerCountryId;next=addCasusBelli(next,actor,effect.targetId,effect.type,effect.regionId??null);}
  for(const effect of effects)if(effect.kind==='war'){if(effect.action)next=applyWarAction(next,effect.warId,effect.action);if(effect.resolution)next=resolvePeace(next,effect.warId,effect.resolution);}
  for(const effect of effects){
    if(effect.kind==='start_crisis'){const beforeIds=new Set(Object.keys(next.world.crises?.activeCrises??{}));next=startCrisis(next,j,effect.crisisType,effect.severity,effect.sourceEventId,effect.protection,effect.activityReduction);const c=Object.values(next.world.crises!.activeCrises).find(c=>!beforeIds.has(c.id));if(c)next={...next,world:{...next.world,crises:{...next.world.crises!,activeCrises:{...next.world.crises!.activeCrises,[c.id]:{...c,totalFiscalCost:c.totalFiscalCost+effects.reduce((s,e)=>s+(e.kind==='treasury'?Math.max(0,-e.amount):0),0),totalPopulationImpact:c.totalPopulationImpact+Math.max(0,r.population.deathsLastMonth-source.population.deathsLastMonth)+Math.max(0,source.population.netMigrationLastMonth-r.population.netMigrationLastMonth)}}}}};}
    if(effect.kind==='crisis_recovery'){const c=next.world.crises?.activeCrises[effect.crisisId];if(c)next={...next,world:{...next.world,crises:{...next.world.crises!,activeCrises:{...next.world.crises!.activeCrises,[c.id]:{...c,totalFiscalCost:c.totalFiscalCost+effects.reduce((s,e)=>s+(e.kind==='treasury'?Math.max(0,-e.amount):0),0)}}}}};next=recoverCrisis(next,effect.crisisId,effect.value,effect.aid);}
    if(effect.kind==='leader_risk'&&j.id===(controlledRegionId(next)??next.player.controlledCountryId)&&j.kind===(controlledRegionId(next)?'region':'country'))next={...next,player:{...next.player,temporaryLeaderRiskModifiers:[...(next.player.temporaryLeaderRiskModifiers??[]),{id:'leader-'+next.turn+'-'+(next.player.temporaryLeaderRiskModifiers?.length??0),value:effect.value,expiresTurn:next.turn+Math.max(1,Math.min(3,effect.months)),jurisdiction:{...j}}]}};
  }
  return next;
}
