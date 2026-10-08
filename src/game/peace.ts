import { collectHistory } from './history';
import { transferWarTerritory } from './warfareEffects';
import { getBilateralRelation, getDiplomaticPairKey } from './diplomacy';
import { ownedRegions, refreshCountryAggregates } from './runtime';
import { recordWarHistory } from './warfare';
import { clampMilitary as clamp } from './militaryPower';
import { warfareConfig as config } from './warfareConfig';
import type { GameState, WarResolution, WorldState } from './types';
export function getPeaceBlock(game:GameState,warId:string,resolution:WarResolution):string|null {
  const war=game.world.warfare?.wars[warId];if(!war||war.status==='resolved'||game.gameOverReason)return '진행 중인 전쟁이 없습니다.';
  if(war.status!=='peace_negotiation')return '평화협상을 먼저 시작해야 합니다.';
  if(resolution==='territory_transfer'){
    if(!['border_claim','reunification'].includes(war.warGoal)||!war.fronts.length)return '영토 전쟁목표가 필요합니다.';
    if(!war.fronts.every(f=>f.controllerCountryId===war.primaryAttacker&&f.decisiveMonths>=config.decisiveMonths))return '목표 영토의 90% 통제를 3개월 유지해야 합니다.';
    const losers=new Set(war.fronts.map(f=>game.world.regions[f.regionId]?.ownerCountryId));for(const id of losers){if(!id||!game.world.countries[id])return '영토 소유국이 유효하지 않습니다.';}
  }
  if(resolution==='defense_success'&&war.strategicControl>25)return '공격측을 저지한 방어 우세가 필요합니다.';
  if(resolution==='recognition'&&!['recognition','reunification'].includes(war.warGoal))return '독립 승인 또는 재통합 관련 전쟁목표가 필요합니다.';
  if(resolution==='reparations'&&!['punitive','border_claim'].includes(war.warGoal))return '응징 또는 영토 경계 전쟁목표에서 배상을 협의할 수 있습니다.';
  if(resolution==='recognition'&&!Object.values(war.participants).some(p=>game.world.countries[p.countryId]?.identity?.isDynamic))return '승인할 신생국이 없습니다.';
  if(resolution==='abandon_reunification'&&war.warGoal!=='reunification')return '재통합 전쟁목표가 아닙니다.';
  if(resolution==='reparations'&&war.strategicControl<75&&Math.min(...war.defenders.map(id=>war.participants[id].warSupport))>20)return '결정적 우세 또는 상대 지지도 붕괴가 필요합니다.';
  return null;
}
function treasuryTransfer(world:WorldState,payer:string,receiver:string):WorldState {
  const a=world.countries[payer];const amount=Math.min(a.fiscal.treasury,a.economy.gdp*.01);
  let next=world;for(const [id,delta] of [[payer,-amount],[receiver,amount]] as const){const c=next.countries[id],members=ownedRegions(next,id);if(c.identity?.isDynamic&&members.length){const r=members[0];next={...next,regions:{...next.regions,[r.id]:{...r,fiscal:{...r.fiscal,treasury:r.fiscal.treasury+delta}}}};}else next={...next,countries:{...next.countries,[id]:{...c,fiscal:{...c.fiscal,treasury:c.fiscal.treasury+delta}}}};}
  return refreshCountryAggregates(next);
}
function resolvePeaceCore(game:GameState,warId:string,resolution:WarResolution):GameState {
  const block=getPeaceBlock(game,warId,resolution);if(block)throw new Error(block);const war=game.world.warfare!.wars[warId];
  let next:GameState={...game,world:{...game.world,warfare:{...game.world.warfare!,wars:{...game.world.warfare!.wars,[warId]:{...war,status:'resolved',resolution,resolvedDate:{...game.date},fronts:war.fronts.map(f=>({...f,controllerCountryId:game.world.regions[f.regionId]?.ownerCountryId??f.originalOwnerCountryId}))}},allyRequests:game.world.warfare!.allyRequests.filter(r=>r.warId!==warId)}}};
  if(resolution==='territory_transfer')next=transferWarTerritory(next,war.fronts.map(f=>f.regionId),war.primaryAttacker);
  if(resolution==='reparations')next={...next,world:treasuryTransfer(next.world,war.primaryDefender,war.primaryAttacker)};
  for(const a of war.attackers)for(const b of war.defenders){if(!next.world.countries[a]||!next.world.countries[b])continue;const key=getDiplomaticPairKey(a,b),r=getBilateralRelation(next.world,a,b)!;
    let relation={...r,relations:Math.min(r.relations,-30),trust:clamp(r.trust-10),threatShockMonths:12};
    if(resolution==='recognition'||resolution==='abandon_reunification'){
      if(next.world.countries[a].identity?.isDynamic)relation.recognizedAbyB=r.countryA===a?true:r.recognizedAbyB;
      if(next.world.countries[b].identity?.isDynamic)relation.recognizedAbyB=r.countryA===b?true:relation.recognizedAbyB;
      if(next.world.countries[a].identity?.isDynamic)relation.recognizedBbyA=r.countryB===a?true:r.recognizedBbyA;
      if(next.world.countries[b].identity?.isDynamic)relation.recognizedBbyA=r.countryB===b?true:relation.recognizedBbyA;
      for(const id of [a,b]){const c=next.world.countries[id];if(c.identity?.isDynamic)next={...next,world:{...next.world,countries:{...next.world.countries,[id]:{...c,identity:{...c.identity,status:'established',territorialDispute:'none'}}}}};}
    }
    next={...next,world:{...next.world,diplomacy:{...next.world.diplomacy!,relations:{...next.world.diplomacy!.relations,[key]:relation}},warfare:{...next.world.warfare!,truces:{...next.world.warfare!.truces,[key]:{countryA:r.countryA,countryB:r.countryB,remainingMonths:config.truceMonths}}}}};
  }
  next={...next,world:{...next.world,countries:Object.fromEntries(Object.entries(next.world.countries).map(([id,c])=>[id,{...c,military:{...c.military!,activeWars:c.military!.activeWars.filter(id=>id!==warId)}}])),warfare:{...next.world.warfare!,casusBelli:Object.fromEntries(Object.entries(next.world.warfare!.casusBelli).map(([id,b])=>[id,war.attackers.includes(b.holderCountryId)&&war.defenders.includes(b.targetCountryId)||war.defenders.includes(b.holderCountryId)&&war.attackers.includes(b.targetCountryId)?{...b,consumed:true}:b]))}}};
  if(resolution==='recognition'||resolution==='abandon_reunification')next={...next,world:{...next.world,internalConflicts:Object.fromEntries(Object.entries(next.world.internalConflicts??{}).map(([id,c])=>[id,c.status!=='resolved'&&war.participants[c.parentCountryId]&&war.participants[c.breakawayCountryId]?{...c,status:'resolved' as const,resolution:'independence_recognized' as const,resolvedDate:{...next.date}}:c]))}};
  const closed=next.world.warfare!.wars[warId];next={...next,world:{...next.world,warfare:{...next.world.warfare!,wars:{...next.world.warfare!.wars,[warId]:{...closed,fronts:closed.fronts.map(f=>({...f,controllerCountryId:next.world.regions[f.regionId]?.ownerCountryId??f.controllerCountryId}))}}}}};
  return recordWarHistory(next,warId,`${war.countryNames[war.primaryAttacker]} — ${war.countryNames[war.primaryDefender]} 평화협정 · ${resolution==='territory_transfer'?'둥지권 영토 이전':resolution==='reparations'?'일시 국고 배상':resolution==='recognition'?'독립 승인':resolution==='abandon_reunification'?'재통합 주장 포기':'현상유지·방어 평화'} · 전쟁 종료`);
}

export function resolvePeace(...args:Parameters<typeof resolvePeaceCore>):GameState { return collectHistory(args[0],resolvePeaceCore(...args)); }

