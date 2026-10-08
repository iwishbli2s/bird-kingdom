import type { GameEventDefinition, TechnologyDomain, EventEffect } from './types';
const stages:[string,string,TechnologyDomain,boolean,string][]=[
 ['nest-material','신형 둥지재 개발 성공','industry',true,'경량 둥지재의 시험 생산이 성공해 공동 가공 횃대가 실용화 검증을 제안합니다.'],
 ['algorithm','비행관제 알고리즘 돌파','information',true,'혼잡 회랑의 자동 항로 조정 모형이 실험 관제에서 개선 성과를 보였습니다.'],
 ['academy','부엉이 학술원의 연구성과','medicine',true,'깃털의학 학술 편대가 재활과 보건 연구의 공동 검증 결과를 제출했습니다.'],
 ['wetland','습지 농경법 혁신','agriculture',true,'습지 관측과 씨앗 비축을 결합한 새로운 공동 농경법이 시험 수확을 개선했습니다.'],
 ['mites','깃털 진드기 방제법 발견','medicine',true,'공동 둥지의 깃털 관리 연구가 안전한 방제 절차 개선에 기여했습니다.'],
 ['logistics','공중물류 자동화 실험','industry',true,'비행물류 편대의 가공·배차 절차를 자동화하는 시험 공정이 성과를 냈습니다.'],
 ['budget','연구예산 논쟁','information',false,'학술 횃대가 장기 연구비와 당장의 생활 지원 사이에서 재원 배분을 논의합니다.'],
 ['facility','연구시설 횃대 확충','infrastructure',true,'안정적인 실험 횃대와 공동 관제 설비 확충안이 실용 연구를 돕습니다.'],
 ['communication','장거리 통신망 시범운영','information',true,'통신 횃대 연결망이 연구 자료와 항로 정보를 안정적으로 전송했습니다.'],
 ['defense','군수 연구편대 성과','military',true,'보급편대 연구진이 곡물 수송과 공동 경계 신호의 운용 효율을 개선했습니다.'],
 ['delay','연구 프로젝트 지연','industry',false,'둥지재 시제품의 규격 검증이 늦어져 예정된 연구 일정 조정이 필요합니다.'],
 ['exchange','학술 편대 국제교류','information',true,'대사 횃대를 통한 연구 자료 교류가 공중관제 실험의 작은 개선을 돕습니다.'],
];
export const technologyEventDefinitions:GameEventDefinition[]=stages.map(([id,title,domain,positive,description])=>({id:'research-'+id,title,description,category:'economy',tone:positive?'positive':'mixed',baseMonthlyChance:.004,cooldownMonths:18,tags:['research'],nonPlayerChoiceId:'balance',eligible:c=>!!c.runtime.technology?.domains[domain].currentResearchId&&(id!=='academy'||!!c.runtime.population.species.owl),calculateChance:c=>.004*(.5+(c.runtime.technology?.researchCapacity??0)/100),severity:()=>1,choices:['invest','balance','restrict'].map((choice,i)=>({id:choice,label:positive?['실용화 검증 지원','공동 횃대에서 검증','기존 일정에 반영'][i]:['추가 검증 지원','연구 일정 조정','지원 축소'][i],preview:positive?'작은 국고 비용과 함께 연구 진척을 개선합니다. 기술을 즉시 해금하지 않습니다.':'현재 연구 진척에 작은 지연을 반영하며 누적 연구를 보존합니다.',effects:c=>{const immediate:EventEffect[]=[{kind:'research',domain,progress:positive?[1,.4,.1][i]:[-.2,-.6,-1][i]}];if(i<2)immediate.push({kind:'treasury',amount:-c.runtime.economy.gdp*[.0004,.0001][i]});return {immediate};}}))}));

export const technologyDiscoveryDefinition:GameEventDefinition={id:'technology-discovery',title:'학술 횃대 기술 실용화',description:'누적 연구를 완료해 기술을 확보했습니다.',category:'economy',tone:'positive',baseMonthlyChance:0,cooldownMonths:0,tags:['research_unlock'],nonPlayerChoiceId:'completed',eligible:()=>false,calculateChance:()=>0,severity:()=>1,choices:[{id:'completed',label:'연구 완료',preview:'누적 연구가 완료되었습니다.',effects:()=>({immediate:[]})}]};
