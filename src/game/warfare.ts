import { aggressionConfig } from './aggressionConfig';
import { applyAggressionConsequences, applyAggressionPoliticalCost, defenderRally } from './aggression';
import { materializeDirectCore } from './territory';
import { collectHistory } from './history';
import { addCasusBelli, getAccessibleWarTargets, getWarDeclarationBlock, resolveWarDeclaration } from './casusBelli';
import { activeWars, militaryCommitments, synchronizeMilitary } from './military';
import { clampMilitary as clamp } from './militaryPower';
import { countryName, getBilateralRelation, getDiplomaticPairKey } from './diplomacy';
import { derivedCountryRuntime, ownedRegions } from './runtime';
import { appendGameLog } from './logs';
import { warfareConfig as config } from './warfareConfig';
import { applyWarCosts, applyOccupationImpact } from './warfareEffects';
import { createSeededRandom, createRandomSeed } from './random';
import type { GameState, InterstateWarState, WarAction, WarGoal, WarParticipantState } from './types';
export function recordWarHistory(game:GameState,warId:string|null,summary:string):GameState {
  const state=game.world.warfare!,war=warId?state.wars[warId]:undefined;
  const entry={id:`war-history-${game.turn}-${state.history.length}`,date:{...game.date},turn:game.turn,warId,summary,countryNames:{...war?.countryNames}};
  return appendGameLog({...game,world:{...game.world,warfare:{...state,history:[entry,...state.history]}}},{category:'political',type:'event',message:summary});
}
export function calculateWarSupport(game:GameState,id:string,side:'attacker'|'defender',fatigue:number,control=50,goal?:WarGoal):number {
  const r=derivedCountryRuntime(game.world,id),g=r.governance;
  return clamp((g?.approval??50)*.45+(g?.stability??50)*.25+(r.social?.livingStandard??50)*.15+(side==='defender'?15:0)+(side==='attacker'?(goal==='defense'?4:goal==='recognition'?2:goal==='punitive'?-2:0):0)+(side==='attacker'?control:100-control)*.08-fatigue*.42);
}
export function getDefenseAllies(game:GameState,defender:string,attacker:string):string[] {
  return Object.keys(game.world.countries).filter(id=>id!==defender&&id!==attacker&&getBilateralRelation(game.world,id,defender)?.defensePact).sort();
}
export function calculateAllyAcceptance(game:GameState,ally:string,defender:string):number {
  const r=getBilateralRelation(game.world,ally,defender)!,m=game.world.countries[ally].military!;
  return clamp(r.trust*.4+r.relations*.2+m.warSupport*.2+m.capability*.2-r.threat*.1-m.activeWars.length*10);
}
function respondToAllyRequestCore(game:GameState,requestId:string,accept:boolean):GameState {
  const state=game.world.warfare!,req=state.allyRequests.find(r=>r.id===requestId),war=req?state.wars[req.warId]:undefined;
  if(!req||req.status!=='pending'||!war||war.status==='resolved'||game.gameOverReason)throw new Error('유효한 참전 요청이 없습니다.');
  const ally=req.allyCountryId;if(war.attackers.includes(ally)||war.defenders.includes(ally))throw new Error('이미 전쟁에 참여하고 있습니다.');
  let world=game.world,nextWar=war;
  if(accept&&activeWars(world).some(w=>w.id!==war.id&&w.attackers.includes(ally)&&war.attackers.some(id=>w.attackers.includes(id))||w.id!==war.id&&w.defenders.includes(ally)&&war.attackers.some(id=>w.defenders.includes(id))))throw new Error('다른 전쟁에서 같은 진영인 국가와 충돌할 수 없습니다.');
  if(accept){const participant:WarParticipantState={countryId:ally,side:'defender',warSupport:calculateWarSupport(game,ally,'defender',0),fatigue:0,contribution:0};
    nextWar={...war,defenders:[...war.defenders,ally],countryNames:{...war.countryNames,[ally]:countryName(world,ally)},participants:{...war.participants,[ally]:participant}};
    for(const attacker of war.attackers){const key=getDiplomaticPairKey(ally,attacker),r=getBilateralRelation(world,ally,attacker)!;world={...world,diplomacy:{...world.diplomacy!,relations:{...world.diplomacy!.relations,[key]:{...r,relations:clamp(r.relations-30,-100,100),trust:clamp(r.trust-(r.nonAggressionPact?25:10)),nonAggressionPact:false,defensePact:false,threatShockMonths:12}}}};}
  }else {const key=getDiplomaticPairKey(ally,req.requesterCountryId),r=getBilateralRelation(world,ally,req.requesterCountryId)!;world={...world,diplomacy:{...world.diplomacy!,relations:{...world.diplomacy!.relations,[key]:{...r,defensePact:false,trust:clamp(r.trust-25),relations:clamp(r.relations-20,-100,100)}}}};}
  const military=world.countries[ally].military!;
  world={...world,countries:{...world.countries,[ally]:{...world.countries[ally],military:{...military,activeWars:accept?[...new Set([...military.activeWars,war.id])]:military.activeWars}}},warfare:{...state,wars:{...state.wars,[war.id]:nextWar},allyRequests:state.allyRequests.map(r=>r.id===requestId?{...r,status:accept?'accepted':'declined'}:r)}};
  return recordWarHistory({...game,world},war.id,`${countryName(world,ally)}: 방위조약 참전 요청 ${accept?'수락 · 방어 진영 참전':'거부 · 신뢰와 방위조약 훼손'}`);
}
function declareWarCore(game:GameState,actor:string,belliId:string,goal:WarGoal,fromEvent=false,deferAllies=false):GameState {
  const block=getWarDeclarationBlock(game,actor,belliId,goal,fromEvent);if(block)throw new Error(block);
  const {target:resolvedTarget,belli:b}=resolveWarDeclaration(game,actor,belliId),target=resolvedTarget!;
  if(!b&&goal==='border_claim')game=materializeDirectCore(game,target);
  const world=synchronizeMilitary(game.world),state=world.warfare!;
  const legitimacy=b?'justified' as const:'unjustified' as const;
  let n=1;while(state.wars[`war-${n}`])n++;const id=`war-${n}`;
  const participants:Record<string,WarParticipantState>={};for(const [countryId,side] of [[actor,'attacker'],[target,'defender']] as const)participants[countryId]={countryId,side,warSupport:clamp(calculateWarSupport(game,countryId,side,0,50,goal)+(side==='defender'&&legitimacy==='unjustified'?aggressionConfig.defenderRally:0)),fatigue:0,contribution:0};
  const war:InterstateWarState={legitimacy,...(b?{casusBelliType:b.type}:{}),capabilityAtStart:Object.fromEntries([actor,target].map(id=>[id,world.countries[id].military!.capability])),id,attackers:[actor],defenders:[target],primaryAttacker:actor,primaryDefender:target,countryNames:{[actor]:countryName(world,actor),[target]:countryName(world,target)},status:'active',warGoal:goal,startedDate:{...game.date},resolvedDate:null,
    fronts:(b?getAccessibleWarTargets(world,b.id):goal==='border_claim'?getAccessibleWarTargets(world,target):[]).map(regionId=>({regionId,originalOwnerCountryId:target,controllerCountryId:target,control:0,decisiveMonths:0})),participants,monthsAtWar:0,monthsInStatus:0,strategicControl:0,resolution:null};
  const pairKey=getDiplomaticPairKey(actor,target),relation=getBilateralRelation(world,actor,target)!;
  let next:GameState={...game,world:{...world,diplomacy:{...world.diplomacy!,relations:{...world.diplomacy!.relations,[pairKey]:{...relation,relations:clamp(relation.relations-35,-100,100),trust:clamp(relation.trust-20),threatShockMonths:12}}},warfare:{...state,wars:{...state.wars,[id]:war},casusBelli:b?{...state.casusBelli,[b.id]:{...b,consumed:true}}:state.casusBelli}}};
  for(const countryId of [actor,target]){const c=next.world.countries[countryId];next={...next,world:{...next.world,countries:{...next.world.countries,[countryId]:{...c,military:{...c.military!,activeWars:[...c.military!.activeWars,id]}}}}};}
  next=applyAggressionConsequences(next,war);
  const brokeThisMonth=game.world.diplomacy?.history.some(h=>h.actorId===actor&&h.targetId===target&&h.action==='break_non_aggression'&&h.turn===game.turn);
  if(brokeThisMonth){const members=ownedRegions(next.world,actor);if(members.length)next={...next,world:{...next.world,regions:{...next.world.regions,...Object.fromEntries(members.map(r=>[r.id,{...r,governance:{...r.governance,approval:clamp(r.governance.approval-2)}}]))}}};else {const c=next.world.countries[actor];next={...next,world:{...next.world,countries:{...next.world.countries,[actor]:{...c,governance:{...c.governance!,approval:clamp(c.governance!.approval-2)}}}}};}}
  next=recordWarHistory(next,id,`${war.countryNames[actor]} → ${war.countryNames[target]} 선전포고 · ${legitimacy==='unjustified'?'명분 없는 침략전쟁':'정당화된 전쟁'} · 비행회랑·둥지권 전쟁 시작${brokeThisMonth?' · 조약 파기 직후 공격 비용':''}`);
  // 최초 방어국의 동맹만 호출합니다. 참전국의 동맹을 재귀 호출하지 않습니다.
  for(const ally of getDefenseAllies(next,target,actor)){
    if(activeWars(next.world).some(w=>w.attackers.includes(actor)&&w.attackers.includes(ally)||w.defenders.includes(actor)&&w.defenders.includes(ally)))continue;
    const req={id:`${id}:ally:${ally}`,warId:id,requesterCountryId:target,allyCountryId:ally,status:'pending' as const};
    next={...next,world:{...next.world,warfare:{...next.world.warfare!,allyRequests:[...next.world.warfare!.allyRequests,req]}}};
    next=addCasusBelli(next,ally,actor,'ally_attacked',null,12);
    if(!deferAllies&&ally!==game.player.controlledCountryId)next=respondToAllyRequest(next,req.id,calculateAllyAcceptance(next,ally,target)>=45);
  }
  return next;
}
function applyWarActionCore(game:GameState,warId:string,action:WarAction):GameState {
  const war=game.world.warfare?.wars[warId];if(!war||war.status==='resolved'||game.gameOverReason)throw new Error('진행 중인 전쟁이 필요합니다.');
  let next={...war};if(action==='ceasefire'||action==='negotiate'){next.status=action==='ceasefire'?'ceasefire':'peace_negotiation';next.monthsInStatus=0;}
  if(action==='resume'){if(war.status==='active')throw new Error('이미 충돌 중입니다.');next.status='active';next.monthsInStatus=0;}
  if(action==='tailwind'||action==='headwind'){const delta=action==='tailwind'?1:-1;next.fronts=war.fronts.map(f=>({...f,control:clamp(f.control+delta)}));next.strategicControl=clamp(war.strategicControl+delta);}
  if(action==='supply'||action==='protest')next.participants=Object.fromEntries(Object.entries(war.participants).map(([id,p])=>[id,{...p,fatigue:clamp(p.fatigue+(action==='protest'?3:1)),warSupport:clamp(p.warSupport-(action==='protest'?2:0))}]));
  const result={...game,world:{...game.world,warfare:{...game.world.warfare!,wars:{...game.world.warfare!.wars,[warId]:next}}}};
  return ['ceasefire','negotiate','resume'].includes(action)?recordWarHistory(result,warId,`${war.countryNames[war.primaryAttacker]} — ${war.countryNames[war.primaryDefender]}: ${action==='ceasefire'?'대편대 휴전':action==='negotiate'?'평화편대 협상':'비행회랑 충돌 재개'}`):result;
}
export function resolveMonthlyWar(game:GameState,war:InterstateWarState,random:()=>number):InterstateWarState {
  if(war.status==='resolved')return war;
  const power=(side:'attacker'|'defender')=>Object.values(war.participants).filter(p=>p.side===side).reduce((s,p)=>s+(game.world.countries[p.countryId]?.military?.capability??0)*(.6+p.warSupport/200)*(1-p.fatigue*.004),0);
  const a=power('attacker'),d=power('defender');let delta=0;
  if(war.status==='active'){const roll=random();if(!Number.isFinite(roll)||roll<0||roll>=1)throw new RangeError('전쟁 난수는 0 이상 1 미만이어야 합니다.');delta=clamp((a-d)/(a+d||1)*9+(roll-.5)*config.monthlyNoise,-config.maxControlChange,config.maxControlChange);}
  const control=clamp(war.strategicControl+delta),fronts=war.fronts.map(f=>{const n=clamp(f.control+delta);return {...f,control:n,controllerCountryId:n>=config.occupationThreshold?war.primaryAttacker:n<=25?f.originalOwnerCountryId:f.controllerCountryId,decisiveMonths:n>=config.decisiveThreshold?f.decisiveMonths+1:0};});
  const participants=Object.fromEntries(Object.entries(war.participants).map(([id,p])=>{
    const m=game.world.countries[id]?.military!,fatigue=clamp(p.fatigue+(war.status==='active'?config.fatigueGrowth+Math.max(0,m.mobilization-20)*.005+Math.max(0,militaryCommitments(game.world,id)-1)*.1+(100-m.logistics)*.003+(war.monthsAtWar>=24?.3:0)+((p.side==='attacker'?control:100-control)<30?.2:0):-config.recovery));
    return [id,{...p,fatigue,warSupport:clamp(calculateWarSupport(game,id,p.side,fatigue,control,war.warGoal)+(id===war.primaryDefender?defenderRally(war,war.monthsAtWar+1):0)),contribution:clamp(m.capability/(Object.values(war.participants).filter(x=>x.side===p.side).reduce((sum,x)=>sum+(game.world.countries[x.countryId]?.military?.capability??0),0)||1)*100)}];
  }));
  return {...war,fronts,participants,strategicControl:control,monthsAtWar:war.monthsAtWar+1,monthsInStatus:war.monthsInStatus+1};
}
export function updateWorldWars(game:GameState,random?:()=>number):GameState {
  const rng=random??createSeededRandom(createRandomSeed());let next=game;
  const wars=Object.fromEntries(Object.entries(game.world.warfare?.wars??{}).sort(([a],[b])=>a.localeCompare(b)).map(([id,w])=>[id,resolveMonthlyWar(game,w,rng)]));
  next={...next,world:{...next.world,warfare:{...next.world.warfare!,wars}}};
  for(const war of Object.values(wars))if(war.status!=='resolved'){
    for(const p of Object.values(war.participants)){
      next={...next,world:applyWarCosts(next.world,p.countryId,war.status==='active',war.monthsAtWar)};
      const c=next.world.countries[p.countryId];next={...next,world:{...next.world,countries:{...next.world.countries,[c.id]:{...c,military:{...c.military!,fatigue:Math.max(c.military!.fatigue,p.fatigue),warSupport:p.warSupport}}}}};
    }
    next={...next,world:applyAggressionPoliticalCost(next.world,war)};
    for(const f of war.fronts){if(war.status==='active')next={...next,world:applyOccupationImpact(next.world,f,war.monthsAtWar)};
      const old=game.world.warfare!.wars[war.id].fronts.find(old=>old.regionId===f.regionId);if(old&&old.controllerCountryId!==f.controllerCountryId)next=recordWarHistory(next,war.id,`${countryName(next.world,f.controllerCountryId)} 편대가 ${next.world.regions[f.regionId]?.regionIdentity?.name??f.regionId}의 관제권을 확보했습니다. 법적 영유권은 유지됩니다.`);
    }
  }
  return next;
}

export function declareWar(...args:Parameters<typeof declareWarCore>):GameState { return collectHistory(args[0],declareWarCore(...args)); }

export function applyWarAction(...args:Parameters<typeof applyWarActionCore>):GameState { return collectHistory(args[0],applyWarActionCore(...args)); }

export function respondToAllyRequest(...args:Parameters<typeof respondToAllyRequestCore>):GameState { return collectHistory(args[0],respondToAllyRequestCore(...args)); }

