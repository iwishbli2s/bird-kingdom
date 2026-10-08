import { countriesAtWar } from './military';
import { countryName, getBilateralRelation, getDiplomaticActionBlock, hasSanctions, isRecognized } from './diplomacy';
import type { DiplomaticAction, EventContext, EventEffect, GameEventDefinition } from './types';
export const diplomaticActor=(c:EventContext)=>c.jurisdiction.kind==='country'?c.jurisdiction.id:c.game.world.regions[c.jurisdiction.id].ownerCountryId;
const actionAllowed=(c:EventContext,id:string,action:DiplomaticAction)=>!getDiplomaticActionBlock(c.game,diplomaticActor(c),id,action,true);
const stages=[
  {id:'corridor',title:'공동 비행회랑 협상',description:'양국 대표편대가 안전한 공동 비행회랑 운영을 논의합니다. 대사 횃대의 협의와 상호 관제는 우호관계를 조금씩 개선할 수 있습니다.',action:'improve',eligible:(c:EventContext,id:string)=>actionAllowed(c,id,'improve')},
  {id:'passage',title:'철새 이동협정',description:'계절 이동을 앞둔 철새 대표들이 이동권 보장을 요청했습니다. 공동 협정은 순이동을 조금 개선하고 임시 둥지터의 부담을 줄입니다.',action:'passage',eligible:(c:EventContext,id:string)=>actionAllowed(c,id,'passage')},
  {id:'grain',title:'곡물 교역 확대 제안',description:'곡물 운송 항로의 안전한 연결을 바탕으로 교역을 확대하자는 제안이 왔습니다. 무역의 장점과 향후 관계 악화에 따른 의존 위험을 함께 고려합니다.',action:'trade',eligible:(c:EventContext,id:string)=>actionAllowed(c,id,'trade')},
  {id:'perch',title:'대사 횃대 개설',description:'양국 대표가 상설 대사 횃대를 통해 교류를 넓히려 합니다. 작은 외교 비용을 감수하면 관계와 장기 신뢰가 조금 개선됩니다.',action:'improve',eligible:(c:EventContext,id:string)=>actionAllowed(c,id,'improve')},
  {id:'boundary',title:'비행경계 침범 논란',description:'관제 경계를 넘은 비행편대를 둘러싸고 양측이 항의하고 있습니다. 공동 조사와 회담 또는 강경 대응은 서로 다른 외교적 결과를 남깁니다.',action:'improve',eligible:(c:EventContext,id:string)=>actionAllowed(c,id,'improve')},
  {id:'recognition',title:'신생국 승인 요구',description:'신생 독립국이 대사 횃대를 보내 독립국 승인을 요청했습니다. 승인은 그 국가와의 관계를 개선하지만 출신 부모국이 항의할 수 있습니다.',action:'recognize',eligible:(c:EventContext,id:string)=>actionAllowed(c,id,'recognize')},
  {id:'protest',title:'독립국 승인에 대한 항의',description:'제3국의 독립 승인 이후 부모국 대표편대가 항의했습니다. 기존 영토 분쟁과 외교적 승인은 별도 문제이며 중재 또는 강경 대응을 선택할 수 있습니다.',action:'improve',eligible:(c:EventContext,id:string)=>actionAllowed(c,id,'improve')&&c.game.world.diplomacy!.history.some(h=>h.action==='recognize'&&h.actorId===diplomaticActor(c)&&c.game.world.countries[h.targetId]?.identity?.originCountryId===id&&c.game.turn-h.turn<=12)},
  {id:'defense',title:'상호방위조약 제안',description:'오랜 불가침 협력을 바탕으로 상호방위조약 제안이 도착했습니다. 수락 시 외교적 약속을 기록하지만 공격받으면 방위조약국에 참전을 요청합니다.',action:'defense',eligible:(c:EventContext,id:string)=>actionAllowed(c,id,'defense')},
  {id:'trade-dispute',title:'곡물 항로 무역분쟁',description:'곡물 운송 항로의 조건을 둘러싼 이견이 양국 교역을 흔들고 있습니다. 조정 회담으로 관계를 개선하거나 항의로 외교적 긴장을 높일 수 있습니다.',action:'improve',eligible:(c:EventContext,id:string)=>{const r=getBilateralRelation(c.game.world,diplomaticActor(c),id)!;return r.tradeLevel>10&&r.relations<20&&actionAllowed(c,id,'improve');}},
  {id:'retaliation',title:'제재 보복 비행회랑 제한',description:'제재에 대한 항의로 비행회랑 접근이 제한되고 있습니다. 양국의 교역 손실을 줄이려면 회담 또는 기존 제재 해제를 검토해야 합니다.',action:'improve',eligible:(c:EventContext,id:string)=>hasSanctions(getBilateralRelation(c.game.world,diplomaticActor(c),id)!)&&actionAllowed(c,id,'improve')},
  {id:'wetland',title:'공동 습지관리 협정',description:'오리 공동체가 습지 이용권과 곡물 운송망의 공동 관리를 제안했습니다. 제한된 협력은 농업과 오리 만족도, 계절 이동에 작은 도움이 됩니다.',action:'improve',eligible:(c:EventContext,id:string)=>!!(c.runtime.population.species.duck||c.game.world.countries[id].population.species.duck)&&actionAllowed(c,id,'improve')},
  {id:'control',title:'국경 비행회랑 공동관제',description:'양국 관제 대표편대가 경계 회랑의 공동 관리 절차를 제안했습니다. 신뢰가 충분하다면 불가침 약속을 통해 위협을 줄일 수 있습니다.',action:'non_aggression',eligible:(c:EventContext,id:string)=>actionAllowed(c,id,'non_aggression')},
] as const;
export function diplomaticTarget(c:EventContext,eventId?:string):string|undefined {
  if(c.diplomaticTargetId&&c.game.world.countries[c.diplomaticTargetId])return c.diplomaticTargetId;
  const stage=stages.find(s=>`diplomacy-${s.id}`===eventId),actor=diplomaticActor(c);
  return Object.keys(c.game.world.countries).sort().find(id=>id!==actor&&!!getBilateralRelation(c.game.world,actor,id)&&(!stage||stage.eligible(c,id)));
}
export const diplomacyEventDefinitions:readonly GameEventDefinition[]=stages.map(stage=>({
  id:`diplomacy-${stage.id}`,title:stage.title,description:stage.description,category:'governance',tone:['boundary','protest','trade-dispute','retaliation'].includes(stage.id)?'negative':'positive',
  baseMonthlyChance:.006,cooldownMonths:12,diplomacyEvent:true,tags:['diplomacy'],nonPlayerChoiceId:'balance',
  eligible:c=>!!diplomaticTarget(c,`diplomacy-${stage.id}`),calculateChance:c=>{const id=diplomaticTarget(c,`diplomacy-${stage.id}`)!;const r=getBilateralRelation(c.game.world,diplomaticActor(c),id)!;return stage.id==='retaliation'?.02:stage.id==='boundary'?.006+r.threat*.0002:.006;},severity:()=>2,
  choices:[
    {id:'invest',label:'협력 제안 수용',labelFor:c=>`${countryName(c.game.world,diplomaticTarget(c,`diplomacy-${stage.id}`)!)}과 협력 추진`,preview:'승인·무역·조약은 조건과 상대 수락 점수를 적용합니다. 회담은 작은 국고 비용을 사용합니다.',effects:c=>{
      const id=diplomaticTarget(c,`diplomacy-${stage.id}`)!;const effects:EventEffect[]=[{kind:'diplomacy',targetId:id,action:stage.action}];
      if(stage.id==='wetland'){effects.push({kind:'industry',industryId:'agriculture',multiplier:1.001});if(c.runtime.population.species.duck)effects.push({kind:'species',speciesId:'duck',metric:'satisfaction',delta:.5},{kind:'population',speciesId:'duck',flow:'migration',ratio:.00001});}
      return {immediate:effects};}},
    {id:'balance',label:'대표편대 조정 회담',preview:'관계 +1 · 신뢰 +0.2, 별도 조약·승인·제재 변경 없음.',effects:c=>({immediate:[{kind:'diplomacy',targetId:diplomaticTarget(c,`diplomacy-${stage.id}`)!,relations:1,trust:.2}]})},
    {id:'restrict',label:'강경 항의·제안 거절',preview:'관계 -4 · 신뢰 -1 · 위협이 6개월 상승합니다. 전쟁은 발생하지 않습니다.',effects:c=>{const targetId=diplomaticTarget(c,`diplomacy-${stage.id}`)!;const immediate:EventEffect[]=[{kind:'diplomacy',targetId,relations:-4,trust:-1,threatShockMonths:6}];if(stage.id==='boundary'||stage.id==='retaliation')immediate.push({kind:'casus_belli',targetId,type:stage.id==='boundary'?'border_incident':'sanctions_escalation',regionId:stage.id==='boundary'&&c.game.world.countries[targetId].identity?.isDynamic?Object.values(c.game.world.regions).find(r=>r.ownerCountryId===targetId&&r.simulationRole!=='administrative')?.id:undefined});return {immediate};}},
  ],
}));
export function hasMigratoryPassage(c:EventContext):boolean {
  const actor=diplomaticActor(c);return Object.values(c.game.world.diplomacy?.relations??{}).some(r=>(r.countryA===actor||r.countryB===actor)&&r.migratoryPassageAgreement&&!countriesAtWar(c.game.world,r.countryA,r.countryB)&&!hasSanctions(r)&&isRecognized(r,r.countryA)&&isRecognized(r,r.countryB));
}
