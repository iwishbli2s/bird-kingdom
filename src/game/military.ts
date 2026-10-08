import { crisisMilitaryPenalty } from './crisis';
import { getTechnologyBonuses } from './technologyEffects';
import { calculateBaseMilitaryPower, clampMilitary as clamp } from './militaryPower';
import { derivedCountryRuntime } from './runtime';
import { warfareConfig as config } from './warfareConfig';
import { appendGameLog } from './logs';
import type { CountryRuntimeState, GameState, MilitaryState, WorldState } from './types';
export const activeWars=(world:WorldState)=>Object.values(world.warfare?.wars??{}).filter(w=>w.status!=='resolved');
export const countriesAtWar=(world:WorldState,a:string,b:string)=>activeWars(world).some(w=>(w.attackers.includes(a)&&w.defenders.includes(b))||(w.attackers.includes(b)&&w.defenders.includes(a)));
export function militaryCommitments(world:WorldState,id:string):number {return activeWars(world).filter(w=>w.participants[id]).length+Object.values(world.internalConflicts??{}).filter(c=>c.status!=='resolved'&&(c.parentCountryId===id||c.breakawayCountryId===id)).length;}
export function calculateMilitaryLogistics(r:CountryRuntimeState,m:MilitaryState,occupied=0,commitments=1):number {
  return clamp(25+Math.min(18,Math.sqrt(Math.max(0,r.fiscal.treasury)/(r.economy.gdp+1))*18)+r.fiscal.budgetPolicy.infrastructure*2
    +Math.min(15,Math.sqrt(r.economy.industries.agriculture.output+r.economy.industries.manufacturing.output)*.8)+m.readiness*.18-occupied*5-Math.max(0,commitments-1)*3+getTechnologyBonuses(r.technology).logistics);
}
export function calculateMilitaryCapability(r:CountryRuntimeState,m:MilitaryState,commitments=1):number {
  // 국방 예산은 실제 예산 대신 몇 개월에 걸쳐 적응하는 유효 예산을 읽습니다.
  const base=calculateBaseMilitaryPower({...r,fiscal:{...r.fiscal,budgetPolicy:{...r.fiscal.budgetPolicy,defense:m.effectiveDefenseBudget}}},commitments);
  return clamp(base*(.55+m.readiness*.006)*(.85+m.mobilization*.003)*(.55+m.logistics*.005)*(1-m.fatigue*.005)+getTechnologyBonuses(r.technology).capability);
}
export function createMilitaryState(r:CountryRuntimeState):MilitaryState {
  const readiness=r.id==='sparrow'?55:r.id==='pigeon'?58:clamp(40+calculateBaseMilitaryPower(r)*.18+(r.identity?.primarySpeciesId==='eagle'?10:0));
  let m:MilitaryState={readiness,mobilization:15,mobilizationTarget:15,logistics:50,warSupport:r.governance?.approval??60,fatigue:0,capability:0,effectiveDefenseBudget:r.fiscal.budgetPolicy.defense,activeWars:[],readinessDeltaLastMonth:0};
  m.logistics=calculateMilitaryLogistics(r,m);m.capability=calculateMilitaryCapability(r,m);return m;
}
export function synchronizeMilitary(world:WorldState):WorldState {
  const countries=Object.fromEntries(Object.entries(world.countries).map(([id,c])=>[id,{...c,military:c.military??createMilitaryState(derivedCountryRuntime(world,id))}]));
  const state=world.warfare??{wars:{},casusBelli:{},truces:{},allyRequests:[],history:[]};
  const exists=(id:string)=>!!countries[id];
  const wars=Object.fromEntries(Object.entries(state.wars).map(([id,w])=>[id,w.status!=='resolved'&&Object.keys(w.participants).some(id=>!exists(id))?{...w,status:'resolved' as const,resolution:'status_quo' as const,fronts:w.fronts.map(f=>({...f,controllerCountryId:world.regions[f.regionId]?.ownerCountryId??f.controllerCountryId}))}:w]));
  for(const c of Object.values(countries))c.military={...c.military!,activeWars:Object.values(wars).filter(w=>w.status!=='resolved'&&w.participants[c.id]).map(w=>w.id)};
  return {...world,countries,warfare:{...state,wars,casusBelli:Object.fromEntries(Object.entries(state.casusBelli).filter(([,b])=>exists(b.holderCountryId)&&exists(b.targetCountryId))),truces:Object.fromEntries(Object.entries(state.truces).filter(([,t])=>exists(t.countryA)&&exists(t.countryB))),allyRequests:state.allyRequests.filter(r=>exists(r.allyCountryId)&&exists(r.requesterCountryId)&&wars[r.warId]?.status!=='resolved')}};
}
export function updateWorldMilitary(world:WorldState):WorldState {
  const next=synchronizeMilitary(world);return {...next,countries:Object.fromEntries(Object.entries(next.countries).map(([id,c])=>{
    const r=derivedCountryRuntime(next,id),m=c.military!,wars=activeWars(next).filter(w=>w.participants[id]),commitments=militaryCommitments(next,id);
    const mobilization=m.mobilization+clamp(m.mobilizationTarget-m.mobilization,-config.mobilizationStep,config.mobilizationStep);
    const effectiveDefenseBudget=m.effectiveDefenseBudget+clamp(r.fiscal.budgetPolicy.defense-m.effectiveDefenseBudget,-config.defenseBudgetStep,config.defenseBudgetStep);
    const target=clamp(35+effectiveDefenseBudget*2+Math.min(12,Math.sqrt(r.economy.industries.defense.output)*.6)+(r.governance?.stability??50)*.2+r.economy.growth*.3+mobilization*.08-m.fatigue*.1+getTechnologyBonuses(r.technology).readiness);
    const readiness=clamp(m.readiness+clamp((target-m.readiness)*.08,-config.readinessStep,config.readinessStep));
    let n={...m,readiness,readinessDeltaLastMonth:readiness-m.readiness,mobilization,effectiveDefenseBudget,activeWars:wars.map(w=>w.id),fatigue:wars.some(w=>w.status==='active')?m.fatigue:clamp(m.fatigue-config.recovery)};
    const occupied=wars.flatMap(w=>w.fronts).filter(f=>f.originalOwnerCountryId===id&&f.controllerCountryId!==id).length;
    const crisisPenalty=crisisMilitaryPenalty(next,id);
    if(wars.some(w=>w.status==='active'))n.fatigue=clamp(n.fatigue+crisisPenalty*.015);
    n.logistics=clamp(calculateMilitaryLogistics(r,n,occupied,commitments)-crisisPenalty);n.capability=calculateMilitaryCapability(r,n,commitments);
    return [id,{...c,military:n}];
  }))};
}
export function setCountryMobilizationTarget(game:GameState,id:string,target:number):GameState {
  if(!game.world.countries[id]||game.gameOverReason||!game.player.alive||(id===game.player.controlledCountryId&&(game.events.pendingEvent||game.world.foreignProposals?.some(p=>p.targetId===id)||game.world.warfare?.allyRequests.some(r=>r.status==='pending'&&r.allyCountryId===id))))throw new Error('현재 동원 정책을 변경할 수 없습니다.');
  if(!Number.isFinite(target)||target<0||target>100)throw new RangeError('동원 목표는 0~100입니다.');
  const c=game.world.countries[id];
  const severe=Object.values(game.world.diplomacy?.relations??{}).some(r=>(r.countryA===id||r.countryB===id)&&r.threat>=60);
  if(target>c.military!.mobilizationTarget&&!militaryCommitments(game.world,id)&&!severe)throw new Error('전쟁 또는 심각한 외교위기에서 동원을 확대할 수 있습니다.');
  if(target===c.military!.mobilizationTarget)return game;
  return appendGameLog({...game,world:{...game.world,countries:{...game.world.countries,[id]:{...c,military:{...c.military!,mobilizationTarget:target}}}}},{category:'political',type:'event',message:`동원 목표 ${target}% · 실제 동원은 월 최대 ${config.mobilizationStep}%p 변화합니다.`});
}
export function setMobilizationTarget(game:GameState,target:number):GameState {return setCountryMobilizationTarget(game,game.player.controlledCountryId,target);}
