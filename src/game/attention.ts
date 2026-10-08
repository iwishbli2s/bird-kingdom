import type {GameState} from './types';
import {selectControlledRuntime} from './world';
import {controlledPolicySchedule} from './policySchedule';
export interface AttentionItem {id:string;level:'critical'|'warning'|'info';label:string;menu:string}
export function selectAttention(game:GameState):AttentionItem[]{
 const items:AttentionItem[]=[],id=game.player.controlledCountryId,r=selectControlledRuntime(game),s=controlledPolicySchedule(game);
 if(game.events.pendingEvent)items.push({id:'event',level:'critical',label:'사건 대응 필요 · 선택 전 월 진행 중단',menu:'history'});
 if(game.world.foreignProposals?.some(p=>p.targetId===id)||game.world.warfare?.allyRequests.some(p=>p.status==='pending'&&p.allyCountryId===id))items.push({id:'proposal',level:'critical',label:'외교·동맹 제안 답변 필요',menu:'diplomacy'});
 const crises=Object.values(game.world.crises?.activeCrises??{}).filter(c=>c.jurisdictionKind===(game.player.controlledRegionId?'region':'country')&&c.jurisdictionId===(game.player.controlledRegionId??id));
 if(crises.some(c=>c.severity>=60))items.push({id:'crisis',level:'warning',label:'위기 대응 확인 · 강도와 회복 진척',menu:'society'});
 if(Object.values(game.world.warfare?.wars??{}).some(w=>w.status!=='resolved'&&w.participants[id]))items.push({id:'war',level:'warning',label:'진행 중 전쟁 · 전황과 보급 확인',menu:'military'});
 const remaining=game.player.career.termLengthMonths-game.player.career.monthsInCurrentTerm;
 if(remaining<=6)items.push({id:'election',level:'warning',label:`선거까지 ${Math.max(0,remaining)}개월 · 재선 전망 확인`,menu:'politics'});
 if(s&&(s.taxNextChangeTurn<=game.turn||s.budgetNextChangeTurn<=game.turn))items.push({id:'policy',level:'info',label:'정책 변경 가능 · 초안과 비용 확인',menu:'budget'});
 if(r.technology&&Object.values(r.technology.domains).filter(d=>d.currentResearchId).length<3)items.push({id:'research',level:'info',label:'빈 연구 슬롯 · 추가 연구 지정 가능',menu:'technology'});
 return items;
}
