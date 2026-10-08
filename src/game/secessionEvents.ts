import { speciesDefinitions } from './populationConfig';
import { canOrganize, canRequestReferendum, canDeclareUnilaterally, centralResponse } from './secession';
import { secessionConfig as config } from './secessionConfig';
import { hasRecentEvent, scaleAbove, scaleBelow } from './eventHelpers';
import type { EventChoiceDefinition, EventContext, EventEffect, GameEventDefinition, SecessionAction, SpeciesId } from './types';
const movement=(c:EventContext,id:SpeciesId)=>c.runtime.secession?.[id];
const local=(c:EventContext)=>c.jurisdiction.kind==='region';
const effect=(id:SpeciesId,action:SecessionAction):EventEffect=>({kind:'movement',speciesId:id,action});
function options(id:SpeciesId,stage:string):EventChoiceDefinition[] {
  return ['invest','balance','restrict'].map((choiceId,index)=>({id:choiceId,
    labelFor:c=>stage==='negotiation'?(local(c)?['연방정부에 자치권 확대 요구','현 자치 수준 유지','자치 협의 중단']:['자치권 확대','제한적 양보','자치 요구 거부'])[index]:stage==='approval'?(local(c)?['중앙정부 기본 응답 수용','추가 자치협상 요청','주민투표 청원 철회']:['주민투표 허용','추가 자치협상 제안','주민투표 요구 거부'])[index]:stage==='declaration'?(local(c)?['독립선언 지지','분리 선언 후 협상 지속','분리 선언과 기존 영토권 주장']:['일단 분리 현실 인정','협상 계속 요구','재통합 방침 선언'])[index]:stageNames[stage as keyof typeof stageNames]+[' · 공동 절차',' · 지역 절차',' · 질서 유지'][index],
    label:stage==='negotiation'?['자치권 확대 / 주정부는 확대 요구','제한적 양보 / 주정부는 현 수준 유지','요구 거부 / 주정부는 협의 중단'][index]:stage==='approval'?['주민투표 승인 / 중앙정부 응답 수용','추가 자치협상 제안','주민투표 요구 거부'][index]:stage==='declaration'?['분리 현실 인정 / 독립선언 지지','협상 계속 요구','재통합 방침 선언'][index]:stage==='ballot'?['공동 횃대 개표와 결과 수용','지역 둥지권 개표와 결과 수용','독립 참관 개표와 결과 수용'][index]:stage==='foundation'?['독립 행정 깃발 게양','둥지권 행정 이관','새 국가 비행헌장 공표'][index]:['공동 둥지권 협의','대표 편대 공식 응답','질서 유지와 절차 확인'][index],
    preview:stage==='ballot'?'예정된 주민투표 결과 확정 · 결과에 따라 이행 또는 자치운동 복귀':stage==='foundation'?'이행 기간 종료 · 국가 수립 · 기존 임기와 상태 승계':stage==='negotiation'?['재정 부담 · 자치권 확대 · 단기 통합 부담','작은 비용 · 제한적 자치 조정','단기 안정 · 불만과 독립 성향 증가'][index]:stage==='declaration'?'일방 독립 국가 생성 · 영토 분쟁 방침 기록 · 전투 없음':'정치 절차 진행 · 대응 비용과 안정도 변화',
    effects:c=>{
      let actions:EventEffect[]=[];
      const m=movement(c,id)!;
      if(stage==='organize')actions=[effect(id,'organize')];
      if(stage==='charter')actions=[effect(id,'charter')];
      if(stage==='negotiation')actions=index===0?[effect(id,local(c)?'concede':'expand')]:index===1?(local(c)?[]:[effect(id,'concede')]):[effect(id,local(c)?'withdraw':'refuse')];
      if(stage==='request')actions=[effect(id,'request')];
      if(stage==='approval')actions=[effect(id,index===0?(local(c)?centralResponse(c.game,c.jurisdiction,id,c.strategicAIEnabled):'approve'):index===1?'concede':local(c)?'withdraw':'refuse')];
      if(stage==='ballot')actions=[effect(id,'vote')];
      if(stage==='agreement')actions=[effect(id,'agreement')];
      if(stage==='foundation')actions=[effect(id,'found')];
      if(stage==='declaration')actions=[{kind:'movement',speciesId:id,action:'declare',dispute:index===0?'none':index===1?'negotiating':'parent_claims_reunification'}];
      if(stage==='celebration')actions=[effect(id,'celebrate')];
      // 투표·국가 수립은 별도 비용 없이 자산 분할 보존을 유지합니다.
      const immediate:EventEffect[]= ['ballot','foundation','declaration'].includes(stage)?[]:[{kind:'treasury',amount:-c.runtime.economy.gdp*[.0004,.0002,.0001][index]}, {kind:'governance',metric:'stability',delta:index===2?.3:.1}];
      if(stage==='refusal')immediate.push({kind:'species',speciesId:id,metric:'satisfaction',delta:index===0?1:index===1?0:-1});
      if(stage==='celebration')immediate.push({kind:'governance',metric:'integration',delta:1});
      if(stage==='approval'&&m.phase!=='referendum_campaign')throw new Error('주민투표 요구가 필요합니다.');
      return {immediate:[...immediate,...actions]};
    },
  }));
}
const stageDescriptions={
  organize:'주요 둥지권과 비행 회랑의 자체 운영을 요구하는 자치연맹이 결성됐습니다. 대표 무리는 공동 횃대에서 장기적인 권한 협상을 준비합니다.',
  charter:'자치연맹이 둥지구역 행정·교육·비행 회랑 관리에 관한 헌장을 제출했습니다. 최소 조직 기간을 거친 운동이 공식적인 자치권 요구로 발전합니다.',
  negotiation:'대표 편대가 둥지권 행정과 지역 비행 회랑 운영권을 논의합니다. 중앙정부는 권한 배분을, 주정부는 연방에 전달할 요구의 범위를 결정합니다.',
  request:'장기간 이어진 자치운동이 공동 둥지권의 독립 주민투표를 청원했습니다. 투표 운동을 시작하되 일정은 별도의 정부 응답 이후 확정됩니다.',
  approval:'주민투표 청원에 대한 공식 응답이 도착했습니다. 주정부 관할에서는 정해진 중앙정부 기본 규칙이 적용되며, 승인 시 6개월 뒤 투표합니다.',
  refusal:'주민투표 또는 자치 요구 거부 이후 공동 횃대의 대표 무리가 향후 대응을 논의합니다. 거부 이력은 극단적인 분리주의 위기에서 중요해집니다.',
  ballot:'둥지권별 공동 횃대에서 독립 주민투표가 실시됩니다. 현재 독립 성향·자치 요구·정부 통합도와 분리된 투표 난수로 찬성 비율을 계산합니다.',
  agreement:'주민투표 가결 이후 둥지권 행정과 재정의 이관 협정이 진행됩니다. 이행 기간이 끝나기 전에는 국가와 영토 소유권이 변경되지 않습니다.',
  foundation:'독립 이행 기간이 끝났습니다. 새 행정 깃발 아래 둥지권·비행 회랑 운영이 이전되며, 인구와 산업·재정 상태를 보존한 신생국이 출범합니다.',
  declaration:'장기간의 자치운동과 최근 요구 거부 이후 대표단이 부모국의 비행권을 더 이상 인정하지 않는 선언을 공표했습니다. 분쟁 상태의 신생국과 향후 대응 방침만 기록합니다.',
  celebration:'신생 공화국의 여러 종족이 공동 독립 기념 비행을 준비했습니다. 기존 둥지권 주민과 새 행정을 잇는 공동 행사입니다.',
};
const stageNames={organize:'자치연맹 결성',charter:'둥지권 자치헌장 제출',negotiation:'비행권 자치 협상',request:'독립 주민투표 요구',approval:'주민투표 승인·응답',refusal:'자치·주민투표 거부 후 대표회의',ballot:'독립 주민투표',agreement:'독립 이행 협정',foundation:'공화국 수립',declaration:'일방 독립선언',celebration:'독립 기념 비행'};
export const secessionEventDefinitions:readonly GameEventDefinition[]=speciesDefinitions.flatMap(species=>(Object.keys(stageNames) as (keyof typeof stageNames)[]).map(stage=>({
  id:`secession-${species.id}-${stage}`,title:`${species.name} ${stageNames[stage]}`,description:stageDescriptions[stage],category:'governance' as const,
  tone:stage==='celebration'?'positive' as const:'mixed' as const,baseMonthlyChance:.025,cooldownMonths:stage==='negotiation'?12:36,
  priority:['ballot','foundation'].includes(stage),nonPlayerChoiceId:stage==='approval'?'invest':'balance',tags:['crow-petition','eagle-petition','eagle-assembly','duck-protest','nest-conflict'],
  eligible:c=>{
    const m=movement(c,species.id);if(!m)return false;
    // 주의 소수 종족은 자치 협상까지 지원하며 주 전체 독립은 주류 종족 운동만 수행합니다.
    const lead=c.jurisdiction.kind==='country'||Object.values(c.runtime.population.species).sort((a,b)=>b.population-a.population)[0]?.speciesId===species.id;
    if(stage==='organize')return canOrganize(c.runtime,species.id);
    if(stage==='charter')return m.phase==='organizing'&&m.monthsInPhase>=config.charterMonths;
    if(stage==='negotiation')return m.phase==='autonomy_campaign'&&m.monthsInPhase>=6&&(m.lastNegotiationTurn===null||c.game.turn-m.lastNegotiationTurn>=12);
    if(stage==='request')return lead&&canRequestReferendum(c.runtime,species.id);
    if(stage==='approval')return m.phase==='referendum_campaign'&&(m.lastRefusalTurn===null||c.game.turn-m.lastRefusalTurn>=12);
    if(stage==='refusal')return m.lastRefusalTurn!==null&&c.game.turn-m.lastRefusalTurn<=2;
    if(stage==='ballot')return m.phase==='referendum_scheduled'&&m.referendumScheduledInMonths===0;
    if(stage==='agreement')return m.phase==='transition'&&m.monthsInPhase>=1&&m.monthsInPhase<config.transitionMonths;
    if(stage==='foundation')return m.phase==='transition'&&m.monthsInPhase>=config.transitionMonths;
    if(stage==='declaration')return lead&&canDeclareUnilaterally(c.game,c.runtime,species.id);
    return m.phase==='completed'&&m.createdCountryId===c.runtime.secession?.[species.id]?.parentCountryId&&m.monthsInPhase<=12;
  },
  calculateChance:c=>{
    if(['ballot','foundation'].includes(stage))return 1;
    const p=c.runtime.speciesPolitics[species.id]!,m=movement(c,species.id)!;
    const recent=['crow-petition','eagle-petition','eagle-assembly','duck-protest','nest-conflict'].some(id=>hasRecentEvent(c.game,c.jurisdiction,id,24));
    return Math.min(.4,.025+scaleAbove(p.autonomyDemand,45)*.07+scaleAbove(p.independenceSentiment,25)*.10+scaleBelow(p.satisfaction,45)*.06+scaleBelow(c.runtime.governance.integration,60)*.05+(recent?.035:0)+(m.lastRefusalTurn!==null&&c.game.turn-m.lastRefusalTurn<=24?.04:0));
  },severity:c=>c.runtime.speciesPolitics[species.id]!.independenceSentiment>=80?3:2,choices:options(species.id,stage),
})));
