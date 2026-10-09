import { aggressionConfig as config } from './aggressionConfig';
import { ownedRegions, refreshCountryAggregates } from './runtime';
import type { AggressionRecord, GameState, InterstateWarState, WorldState } from './types';

const clamp = (n:number,min=0,max=100)=>Math.max(min,Math.min(max,n));
const relation = (world:WorldState,a:string,b:string)=>world.diplomacy?.relations[[a,b].sort().map(encodeURIComponent).join('|')];
export function aggressionRecency(months:number):number {
  return months >= config.recentMonths ? 0 : Math.pow(.5, Math.max(0,months)/config.halfLifeMonths);
}
export function recentAggressions(game:GameState,attacker:string):AggressionRecord[] {
  return (game.world.warfare?.aggressionHistory??[]).filter(r=>r.attackerCountryId===attacker&&r.legitimacy==='unjustified'&&
    (game.date.year-r.startedDate.year)*12+game.date.month-r.startedDate.month<config.recentMonths);
}
/** Existing friendships, pacts and interests temper condemnation; none erase it. */
export function aggressionReactionWeight(world:WorldState,observer:string,attacker:string,defender:string):number {
  const a=relation(world,observer,attacker),d=relation(world,observer,defender);
  const friendship=Math.max(0,a?.relations??0)/100;
  const solidarity=Math.max(0,d?.relations??0)/100*.3+(d?.trust??0)/100*.15+(d?.defensePact ? .35 : 0);
  const concern=(a?(observer===a.countryA?a.threatAtoB:a.threatBtoA):20)/100*.25;
  const disputed=Object.values(world.warfare?.casusBelli??{}).some(b=>b.holderCountryId===observer&&b.targetCountryId===attacker&&!b.consumed&&b.expiresInMonths!==0);
  const tradeAttachment=(a?.tradeLevel??0)/100*.1;
  return clamp(1+solidarity+concern+(disputed ? .15 : 0)-friendship*.35-(a?.defensePact ? .3 : 0)-tradeAttachment,.35,1.8);
}
/** Directional memory uses historical IDs only; vanished countries are never runtime inputs. */
export function aggressionThreat(world:WorldState,observer:string,target:string):number {
  if(observer===target||!world.countries[observer]||!world.countries[target])return 0;
  const records=(world.warfare?.aggressionHistory??[]).filter(r=>r.attackerCountryId===target&&r.legitimacy==='unjustified');
  const capability=world.countries[target].military?.capability??40;
  return clamp(records.reduce((sum,r)=>sum+config.threatBonus*aggressionRecency(r.elapsedMonths)*
    (observer===r.defenderCountryId?1.3:aggressionReactionWeight(world,observer,target,r.defenderCountryId))*(.8+capability/200),0),0,config.maxThreatBonus);
}
export function defenderRally(war:InterstateWarState,months=war.monthsAtWar):number {
  return war.legitimacy==='unjustified'?config.defenderRally*Math.max(0,1-months/config.rallyMonths):0;
}
export function applyAggressionConsequences(game:GameState,war:InterstateWarState):GameState {
  const attacker=war.primaryAttacker,defender=war.primaryDefender;
  const record:AggressionRecord={warId:war.id,attackerCountryId:attacker,defenderCountryId:defender,startedDate:{...game.date},legitimacy:war.legitimacy,elapsedMonths:0};
  const repeat=Math.min(config.maxRepeatWeight,1+recentAggressions(game,attacker).length*config.repeatWeight);
  let world={...game.world,warfare:{...game.world.warfare!,aggressionHistory:[...(game.world.warfare?.aggressionHistory??[]),record]}};
  if(war.legitimacy==='justified')return {...game,world};
  const broke=game.world.diplomacy?.history.some(h=>h.actorId===attacker&&h.targetId===defender&&h.action==='break_non_aggression'&&h.turn===game.turn);
  const relations={...world.diplomacy!.relations};
  for(const observer of Object.keys(world.countries).sort()){
    if(observer===attacker||observer===defender)continue;
    const key=[observer,attacker].sort().map(encodeURIComponent).join('|'),r=relations[key];if(!r)continue;
    const weight=aggressionReactionWeight(game.world,observer,attacker,defender)*repeat*(broke?config.treatyBreachWeight:1);
    relations[key]={...r,relations:clamp(r.relations-config.relationsLoss*weight,-100,100),trust:clamp(r.trust-config.trustLoss*weight)};
  }
  world={...world,diplomacy:{...world.diplomacy!,relations}};
  // Apply only the new increment now. Monthly reassessment subsequently uses decaying memory.
  for(const [key,r] of Object.entries(relations)){
    if(r.countryA!==attacker&&r.countryB!==attacker)continue;
    const observer=r.countryA===attacker?r.countryB:r.countryA;
    const before=aggressionThreat(game.world,observer,attacker),after=aggressionThreat(world,observer,attacker);
    const field=observer===r.countryA?'threatAtoB':'threatBtoA';
    const next={...r,[field]:clamp(r[field]+Math.max(0,after-before))};next.threat=(next.threatAtoB+next.threatBtoA)/2;relations[key]=next;
  }
  return {...game,world:{...world,diplomacy:{...world.diplomacy!,relations}}};
}
/** Small additional cost applies only to a protracted, costly, fatigued and failing invasion. */
export function applyAggressionPoliticalCost(world:WorldState,war:InterstateWarState):WorldState {
  const p=war.participants[war.primaryAttacker],c=world.countries[war.primaryAttacker];
  if(!c||war.legitimacy!=='unjustified'||war.status!=='active'||war.monthsAtWar<config.politicalCostAfterMonths||p.fatigue<=30||war.strategicControl>=60||(c.military?.mobilization??0)<=20)return world;
  const scale=clamp((p.fatigue-30)/50,0,1)*(1-war.strategicControl/100);
  const impact=<T extends {governance?:{approval:number;stability:number}}>(r:T):T=>({...r,governance:r.governance?{...r.governance,approval:clamp(r.governance.approval-config.approvalCost*scale),stability:clamp(r.governance.stability-config.stabilityCost*scale)}:r.governance});
  const members=ownedRegions(world,c.id).filter(r=>r.simulationRole!=='administrative');
  return refreshCountryAggregates(members.length?{...world,regions:{...world.regions,...Object.fromEntries(members.map(r=>[r.id,impact(r)]))}}:{...world,countries:{...world.countries,[c.id]:impact(c)}});
}
