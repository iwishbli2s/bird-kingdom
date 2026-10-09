import {directCoreId, materializeDirectCore, sovereignTerritories} from './territory';
import { ownedRegions } from './runtime';
import { countriesAtWar, synchronizeMilitary } from './military';
import { getBilateralRelation, getDiplomaticPairKey } from './diplomacy';
import type { CasusBelliType, GameState, WarGoal, WorldState } from './types';
export function addCasusBelli(game:GameState,holder:string,target:string,type:CasusBelliType,regionId:string|null=null,months:number|null=12):GameState {
  if(holder===target||!game.world.countries[holder]||!game.world.countries[target])throw new Error('명분 당사국이 유효하지 않습니다.');
  if(regionId===directCoreId(target))game=materializeDirectCore(game,target);
  if(regionId&&(!game.world.regions[regionId]||game.world.regions[regionId].ownerCountryId!==target))throw new Error('명분의 목표 영토가 유효하지 않습니다.');
  if(months!==null&&(!Number.isInteger(months)||months<=0))throw new RangeError('명분 유효기간은 양의 개월입니다.');
  const world=synchronizeMilitary(game.world),existing=Object.values(world.warfare!.casusBelli).find(b=>b.holderCountryId===holder&&b.targetCountryId===target&&b.type===type&&b.targetRegionId===regionId&&!b.consumed&&b.expiresInMonths!==0);
  if(existing)return {...game,world};let n=1;while(world.warfare!.casusBelli[`cb-${n}`])n++;
  const id=`cb-${n}`;return {...game,world:{...world,warfare:{...world.warfare!,casusBelli:{...world.warfare!.casusBelli,[id]:{id,holderCountryId:holder,targetCountryId:target,type,targetRegionId:regionId,expiresInMonths:months,createdDate:{...game.date},consumed:false}}}}};
}
export function updateCasusBelli(game:GameState):GameState {
  const world=synchronizeMilitary(game.world);let next:GameState={...game,world:{...world,warfare:{...world.warfare!,aggressionHistory:(world.warfare!.aggressionHistory??[]).map(r=>({...r,elapsedMonths:Math.max(0,(game.date.year-r.startedDate.year)*12+game.date.month-r.startedDate.month)})),casusBelli:Object.fromEntries(Object.entries(world.warfare!.casusBelli).map(([id,b])=>[id,{...b,expiresInMonths:b.expiresInMonths===null?null:Math.max(0,b.expiresInMonths-1)}])),truces:Object.fromEntries(Object.entries(world.warfare!.truces).flatMap(([key,t])=>t.remainingMonths>1?[[key,{...t,remainingMonths:t.remainingMonths-1}]]:[]))}}};
  for(const c of Object.values(world.internalConflicts??{}).filter(c=>c.status!=='resolved')){
    const region=ownedRegions(next.world,c.breakawayCountryId)[0];if(!region)continue;
    // 소비한 동일 명분을 매월 재발행하지 않습니다.
    if(!Object.values(next.world.warfare!.casusBelli).some(b=>b.type==='breakaway_claim'&&b.holderCountryId===c.parentCountryId&&b.targetCountryId===c.breakawayCountryId))next=addCasusBelli(next,c.parentCountryId,c.breakawayCountryId,'breakaway_claim',region.id,24);
  }
  return next;
}
export function getAccessibleWarTargets(world:WorldState,belliId:string):string[] {
  if(world.countries[belliId])return sovereignTerritories(world,belliId);
  const b=world.warfare?.casusBelli[belliId];if(!b||b.consumed||b.expiresInMonths===0||!b.targetRegionId)return [];
  const r=world.regions[b.targetRegionId];return r&&r.ownerCountryId===b.targetCountryId?[r.id]:[];
}
export function resolveWarDeclaration(game:GameState,actor:string,reference:string) {
  const direct=game.world.warfare?.casusBelli[reference];
  const target=direct?.targetCountryId??(game.world.countries[reference]?reference:null);
  const belli=direct??Object.values(game.world.warfare?.casusBelli??{}).find(b=>b.holderCountryId===actor&&b.targetCountryId===target&&!b.consumed&&b.expiresInMonths!==0);
  return {target,belli};
}
export function getWarDeclarationBlock(game:GameState,actor:string,belliId:string,goal:WarGoal,ignorePending=false):string|null {
  if(game.gameOverReason||!game.player.alive)return '운영이 종료되었습니다.';
  if(!ignorePending&&(game.events.pendingEvent||game.world.warfare?.allyRequests.some(r=>r.status==='pending'&&r.allyCountryId===actor)))return '사건을 먼저 해결해야 합니다.';
  const {target,belli:b}=resolveWarDeclaration(game,actor,belliId);
  if(!target)return '유효한 상대국 또는 전쟁명분이 필요합니다.';
  if(b&&(b.holderCountryId!==actor||b.consumed||b.expiresInMonths===0))return '유효한 전쟁명분이 필요합니다.';
  if(actor===target)return '자기 국가에 선전포고할 수 없습니다.';
  if(!game.world.countries[actor]||!game.world.countries[target])return '상대국이 존재하지 않습니다.';
  if(countriesAtWar(game.world,actor,target))return '이미 상대국과 전쟁 중입니다.';
  const wars=Object.values(game.world.warfare?.wars??{}).filter(w=>w.status!=='resolved');
  if(wars.some(w=>w.attackers.includes(actor)&&w.attackers.includes(target)||w.defenders.includes(actor)&&w.defenders.includes(target)))return '같은 전쟁 진영의 국가를 공격할 수 없습니다.';
  if(Object.values(game.world.internalConflicts??{}).some(c=>c.status!=='resolved'&&[c.parentCountryId,c.breakawayCountryId].includes(actor)&&[c.parentCountryId,c.breakawayCountryId].includes(target)))return '같은 당사국의 내부 분쟁은 6C 절차로 해결해야 합니다.';
  const r=getBilateralRelation(game.world,actor,target);if(r?.nonAggressionPact||r?.defensePact)return '불가침·방위조약을 먼저 파기해야 합니다.';
  if((game.world.warfare?.truces[getDiplomaticPairKey(actor,target)]?.remainingMonths??0)>0)return '전후 휴전기간에는 선전포고할 수 없습니다.';
  if(['border_claim','reunification'].includes(goal)&&!getAccessibleWarTargets(game.world,b?.id??belliId).length)return '명분과 연결된 목표 영토가 필요합니다.';
  if(goal==='reunification'&&game.world.countries[target].identity?.originCountryId!==actor)return '출신 부모국의 재통합 명분이 필요합니다.';
  if(goal==='reunification'&&b?.type!=='breakaway_claim')return '재통합 청구 명분이 필요합니다.';
  if(goal==='defense'&&b?.type!=='ally_attacked'&&b?.type!=='border_incident')return '방어 관련 명분이 필요합니다.';
  if((b?.targetRegionId||goal==='border_claim')&&wars.some(w=>w.fronts.some(f=>getAccessibleWarTargets(game.world,b?.id??belliId).includes(f.regionId))))return '목표 영토에 이미 국제전쟁 전선이 있습니다.';
  if(goal==='recognition'&&!game.world.countries[actor].identity?.isDynamic&&!game.world.countries[target].identity?.isDynamic)return '독립국 승인과 관련된 목표가 필요합니다.';
  return null;
}
