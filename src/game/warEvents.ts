import { activeWars } from './military';
import { getPeaceBlock } from './peace';
import { warfareConfig } from './warfareConfig';
import type { EventContext, GameEventDefinition, WarAction, WarResolution } from './types';
export function contextWar(c:EventContext){
  if(c.warId)return c.game.world.warfare?.wars[c.warId];
  const owner=c.jurisdiction.kind==='country'?c.jurisdiction.id:c.game.world.regions[c.jurisdiction.id].ownerCountryId;
  return activeWars(c.game.world).filter(w=>w.participants[owner]).sort((a,b)=>a.id.localeCompare(b.id))[0];
}
export function suggestedPeace(c:EventContext):WarResolution {
  const w=contextWar(c)!;
  for(const result of (w.warGoal==='reunification'?['territory_transfer','abandon_reunification']:w.warGoal==='border_claim'?['territory_transfer']:w.warGoal==='recognition'?['recognition']:w.warGoal==='defense'?['defense_success']:['reparations']) as WarResolution[])if(!getPeaceBlock(c.game,w.id,result))return result;
  return 'status_quo';
}
const labels:Record<WarAction|string,string>={supply:'곡물·횃대 보급 부담 감수',protest:'전쟁 지속 반대 여론 수용',ceasefire:'대편대 휴전',negotiate:'평화편대 협상',resume:'비행회랑 충돌 재개',tailwind:'순풍 비행회랑 활용',headwind:'역풍 수송 차질 감수',peace:'전쟁목표에 따른 평화협정',status_quo:'현상유지 평화 확정',wait:'평화 중재안 검토'};
const stages:[string,string,string,WarAction[],(c:EventContext)=>boolean][]=[
 ['blockade','공동 비행회랑 봉쇄','북부 곡물 수송편대가 이용하던 회랑이 폐쇄되어 전선 횃대 비축량이 빠르게 줄고 있습니다.',['supply','negotiate','ceasefire'],()=>true],
 ['grain','전시 곡물비축 부족','대형 횃대의 곡물 창고가 장기 수송 부담으로 비축량을 소진하고 있습니다.',['supply','negotiate','ceasefire'],()=>true],
 ['transport','수송 편대 과부하','안전한 휴식 횃대를 찾는 수송 편대의 우회 거리가 늘어나고 있습니다.',['supply','ceasefire','negotiate'],()=>true],
 ['control','주요 횃대 관제권 상실','공동 둥지권의 관제권 변화가 양측 대표편대의 협상 요구를 높이고 있습니다.',['headwind','negotiate','ceasefire'],c=>contextWar(c)!.fronts.some(f=>f.control>=50)],
 ['refuge','철새 피난 무리 급증','전선 둥지권을 떠난 철새 무리가 임시 횃대와 공동 습지에 모였습니다.',['supply','ceasefire','negotiate'],c=>contextWar(c)!.monthsAtWar>=12],
 ['budget','국방예산 확대 요구','방위산업 공동체가 전시 곡물 보급망과 관제 횃대의 추가 지원을 요청합니다.',['supply','negotiate','ceasefire'],()=>true],
 ['ceasefire','휴전 여론 증가','피로가 누적된 대표편대가 회랑 운항 정지와 상호 휴식을 요구하고 있습니다.',['ceasefire','negotiate','supply'],c=>Object.values(contextWar(c)!.participants).some(p=>p.fatigue>=20)],
 ['protest','전쟁 지속 반대 집회','공동 횃대의 시민 무리가 장기전과 둥지권 생활 부담에 항의하고 있습니다.',['protest','negotiate','ceasefire'],c=>contextWar(c)!.monthsAtWar>=12],
 ['allies','동맹 편대 공동관제 요청','참전한 동맹 편대가 보급 분담과 공동 관제 횃대 운영을 논의합니다.',['supply','negotiate','ceasefire'],c=>Object.keys(contextWar(c)!.participants).length>2],
 ['pact','방위조약 불이행 논란','참전 요청 거부 이후 대사 횃대에서 방위 약속의 신뢰성이 논의되고 있습니다.',['protest','negotiate','ceasefire'],c=>c.game.world.warfare!.allyRequests.some(r=>r.warId===contextWar(c)!.id&&r.status==='declined')],
 ['tailwind','전선 순풍 형성','안정적인 순풍이 곡물 수송편대의 전선 횃대 접근을 조금 돕고 있습니다.',['tailwind','negotiate','ceasefire'],()=>true],
 ['headwind','장기 역풍으로 수송 차질','역풍이 비행회랑 운항을 늦추어 안전한 휴식지 확보 부담이 늘어났습니다.',['headwind','negotiate','ceasefire'],()=>true],
 ['wetland','습지 보급로 단절','오리 공동체가 관리하던 습지 보급망이 끊겨 곡물 수송편대가 우회하고 있습니다.',['supply','ceasefire','negotiate'],()=>true],
 ['occupation','점령지 행정 마찰','점령 둥지권의 법적 소유국과 관제 편대 사이에 행정 조정이 필요합니다.',['protest','negotiate','ceasefire'],c=>contextWar(c)!.fronts.some(f=>f.controllerCountryId!==f.originalOwnerCountryId)],
 ['exchange','귀환 편대 교환 회담','양측 대표가 고립된 비행편대의 안전한 귀환과 회랑 휴식을 협의합니다.',['ceasefire','negotiate','supply'],()=>true],
 ['mediation','평화편대 회담','공동 중재 횃대에서 양측 대표가 둥지권 통제와 전쟁 종결을 논의합니다.',['negotiate','ceasefire','supply'],()=>true],
];
export const warEventDefinitions:readonly GameEventDefinition[]=[...stages.map(([id,title,description,actions,eligible]):GameEventDefinition=>({id:'war-'+id,title,description,category:'governance',tone:'mixed',baseMonthlyChance:.025,cooldownMonths:6,warEvent:true,tags:['interstate_war'],nonPlayerChoiceId:'balance',eligible:c=>!!contextWar(c)&&contextWar(c)!.status==='active'&&eligible(c),calculateChance:c=>id==='ceasefire'?.025+Math.max(...Object.values(contextWar(c)!.participants).map(p=>p.fatigue))*.001:id==='refuge'?.025+Math.min(.05,contextWar(c)!.monthsAtWar*.001):.025,severity:()=>3,choices:actions.map((action,i)=>({id:['invest','balance','restrict'][i],label:labels[action],preview:action==='ceasefire'?'전선 통제를 고정하고 전시비용을 줄이며 피로를 회복합니다.':action==='negotiate'?'현재 전황에 따른 종결 협정을 검토합니다.':action==='tailwind'||action==='headwind'?'공격측 통제에 1%p의 작은 편차를 적용합니다.':'전시 보급·여론 부담이 피로와 지지도에 반영됩니다.',effects:c=>({immediate:[{kind:'war',warId:contextWar(c)!.id,action}]})}))})),
 {id:'war-final-mediation',title:'전쟁 종결 중재 횃대',description:'전쟁 지지도 붕괴, 장기 휴전 또는 결정적 관제권 확보에 따라 공동 중재 횃대가 종결 협상을 요청했습니다.',category:'governance',tone:'mixed',baseMonthlyChance:1,cooldownMonths:1,priority:true,warEvent:true,tags:['interstate_war'],nonPlayerChoiceId:'balance',eligible:c=>{const w=contextWar(c);return !!w&&w.status!=='peace_negotiation'&&(w.monthsAtWar>=warfareConfig.mandatoryPeaceMonths||(w.monthsAtWar>=6&&Object.values(w.participants).some(p=>p.warSupport<=10))||(w.status==='ceasefire'&&w.monthsInStatus>=12)||w.fronts.some(f=>f.decisiveMonths>=3));},calculateChance:()=>1,severity:()=>3,choices:['invest','balance','restrict'].map(id=>({id,label:'종결 협상 시작',preview:'전선 통제를 유지하고 평화협정 선택지를 검토합니다.',effects:c=>({immediate:[{kind:'war',warId:contextWar(c)!.id,action:'negotiate'}]})}))},
 {id:'war-peace-treaty',title:'둥지권 평화편대 협정',description:'평화편대가 현재 전쟁목표와 관제권을 검토했습니다. 합의 이후 법적 소유권이 변경되며 12개월 재선전포고 금지 기간이 시작됩니다.',category:'governance',tone:'mixed',baseMonthlyChance:1,cooldownMonths:1,priority:true,warEvent:true,tags:['interstate_war'],nonPlayerChoiceId:'invest',eligible:c=>contextWar(c)?.status==='peace_negotiation',calculateChance:()=>1,severity:()=>2,choices:[
 {id:'invest',label:'전쟁목표에 따른 협정 수용',labelFor:c=>'협정 수용: '+({status_quo:'현상유지',territory_transfer:'목표 둥지권 이전',recognition:'독립 승인',abandon_reunification:'재통합 포기',defense_success:'방어 성공',reparations:'일시 국고 배상'}[suggestedPeace(c)]),preview:'현재 전황에서 가능한 목표 협정을 확정합니다. 영토 이전이면 영토를 잃은 신생국 운영이 종료될 수 있습니다.',effects:c=>({immediate:[{kind:'war',warId:contextWar(c)!.id,resolution:suggestedPeace(c)}]})},
 {id:'balance',label:'현상유지 평화 확정',preview:'영토 소유권을 유지하고 전쟁을 종료합니다.',effects:c=>({immediate:[{kind:'war',warId:contextWar(c)!.id,resolution:'status_quo'}]})},
 {id:'restrict',label:'중재안 검토 후 현상유지',preview:'장기 교착을 종결하며 기존 둥지권 소유권을 보존합니다.',effects:c=>({immediate:[{kind:'war',warId:contextWar(c)!.id,resolution:'status_quo'}]})},]},
];
