import {synchronizeMilitary} from './military';
import {synchronizeDiplomacy} from './diplomacy';
import {refreshCountryAggregates} from './runtime';
import {sovereignTerritories} from './territory';
import type {GameState} from './types';

/** Command-internal cleanup after an explicit, completed sovereignty transfer.
 * The calling command collects history once the complete outcome is installed. */
export function dissolveCountry(game:GameState,id:string,context:{successorId:string;reintegrationConflictId?:string}):GameState {
  const successor=context.successorId,c=game.world.countries[id];
  if(!c||id===successor||!game.world.countries[successor]||Object.keys(game.world.countries).length<=1||sovereignTerritories(game.world,id).length)throw new Error('영토 이전을 완료한 서로 다른 소멸국·승계국이 필요합니다.');
  const countries={...game.world.countries};delete countries[id];
  let world:GameState['world']={...game.world,countries,retiredCountryIdentities:{...game.world.retiredCountryIdentities,[id]:structuredClone(c.identity!)}};
  world={...world,internalConflicts:Object.fromEntries(Object.entries(world.internalConflicts??{}).map(([key,x])=>[key,x.status==='resolved'||key===context.reintegrationConflictId?x:x.breakawayCountryId===id?{...x,status:'resolved' as const,resolution:'forced_reintegration' as const,resolvedDate:{...game.date}}:x.parentCountryId===id?{...x,parentCountryId:successor,parentName:world.countries[successor].identity!.name}:x]))};
  const old=world.warfare;
  if(old){const closed=Object.values(old.wars).filter(w=>w.status!=='resolved'&&w.participants[id]);world={...world,warfare:{...old,wars:{...old.wars,...Object.fromEntries(closed.map(w=>[w.id,{...w,status:'resolved' as const,resolution:'status_quo' as const,resolvedDate:{...game.date},fronts:w.fronts.map(f=>({...f,controllerCountryId:world.regions[f.regionId]?.ownerCountryId??successor}))}]))},history:[...closed.map(w=>({id:`war-removed-${w.id}-${game.turn}`,date:{...game.date},turn:game.turn,warId:w.id,countryNames:{...w.countryNames},summary:context.reintegrationConflictId?'참전국 재통합에 따른 전쟁 종료':`${c.identity!.name} 소멸에 따른 전쟁 종료`})),...old.history]}};}
  const entry={id:`diplomacy-remove-${id}-${game.turn}`,date:{...game.date},turn:game.turn,actorId:successor,targetId:id,actorName:world.countries[successor].identity!.name,targetName:c.identity!.name,action:'country_removed' as const,accepted:true,relationSnapshots:Object.values(game.world.diplomacy?.relations??{}).filter(r=>r.countryA===id||r.countryB===id).map(r=>({...r})),summary:`${c.identity!.name} 소멸: 활성 외교관계 정리`};
  world={...world,diplomacy:{...world.diplomacy!,history:[entry,...(world.diplomacy?.history??[])]}};
  world=refreshCountryAggregates(synchronizeMilitary(synchronizeDiplomacy(world)));
  const removed=(j:{kind:string;id:string})=>j.kind==='country'?j.id===id:world.regions[j.id]?.simulationRole==='administrative';
  const p=game.events.pendingEvent;
  const events={...game.events,pendingEvent:p&&(removed(p.jurisdiction)||p.diplomaticTargetId===id||(p.warId&&world.warfare?.wars[p.warId]?.status==='resolved')||(p.conflictId&&world.internalConflicts?.[p.conflictId]?.status==='resolved'))?null:p,activeEffects:game.events.activeEffects.filter(e=>!removed(e.jurisdiction)&&!e.effects.some(x=>x.kind==='diplomacy'&&x.targetId===id)),cooldowns:Object.fromEntries(Object.entries(game.events.cooldowns).filter(([k])=>!k.startsWith(`country:${id}:`)))};
  const defeated=game.player.controlledCountryId===id;
  return {...game,world,events,gameOverReason:defeated?'state_defeat':game.gameOverReason,player:defeated?{...game.player,controlledCountryId:successor,controlledRegionId:null,defeatedCountryId:id}:game.player};
}
