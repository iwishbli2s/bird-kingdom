import { technologyDomains } from './technologyConfig';
import type { TechnologyDefinition, TechnologyDomain, TechnologyEffect } from './technologyTypes';
const names:Record<TechnologyDomain,string[]>={
 agriculture:['씨앗 선별 저장법','습지 공동급수망','고밀도 씨앗저장법','습지 자동급수망','공중 농경 관측망','자율 습지 농경망'],
 industry:['둥지재 규격 공정','깃털 공동가공 설비','경량 둥지재 합성','자동 깃털가공 설비','고효율 비행물류 공정','순환 둥지재 정밀공정'],
 infrastructure:['공동 횃대 배치법','회랑 고도 분리체계','다층 횃대 도시설계','고밀도 비행회랑 관제','내풍 둥지구조','자율 공중도시 연결망'],
 medicine:['깃털 위생 관리법','공동 둥지 보건체계','깃털 기생충 방제','조류 호흡기 치료체계','고급 깃갈이 재활','통합 깃털의학 진료망'],
 information:['횃대 신호 규약','장거리 통신 횃대','전국 비행관제망','자동 항로조정 시스템','학술 편대 정보망','분산 공중관제 지능망'],
 military:['공동 경계 신호법','곡물 보급 표준체계','편대 지휘체계','장거리 보급편대','통합 공중경계망','자율 공동방위 관제망']};
const purpose:Record<TechnologyDomain,string>={agriculture:'곡물 저장과 습지 관측을 개선해 식량 생산과 공급의 안정성을 높입니다.',industry:'둥지재와 깃털 가공의 정밀도를 높여 제조·첨단산업 생산성을 개선합니다.',infrastructure:'다층 횃대와 안전한 비행회랑을 연결해 서비스와 수송 보급을 개선합니다.',medicine:'깃털의학과 공동 둥지 보건을 개선해 자연사망 부담을 낮춥니다.',information:'통신 횃대와 공중관제를 연결해 연구 교류와 첨단산업 효율을 높입니다.',military:'편대 지휘와 공동 경계망을 개선해 국가전략 수행력과 곡물 보급을 높입니다.'};
const levels=[1,3,5,7,9,10],costs=[300,700,1400,2400,2800,9000];
function effects(domain:TechnologyDomain):TechnologyEffect[]{switch(domain){
 case 'agriculture':return [{type:'productivity',industry:'agriculture',value:.04},{type:'industry_growth',industry:'agriculture',value:.0008},{type:'event_damage_modifier',tag:'food',value:.05}];
 case 'industry':return [{type:'productivity',industry:'manufacturing',value:.04},{type:'productivity',industry:'advanced',value:.02}];
 case 'infrastructure':return [{type:'productivity',industry:'services',value:.03},{type:'military_logistics',value:1},{type:'social_target',metric:'livingStandard',value:.5},{type:'event_damage_modifier',tag:'corridor',value:.05},{type:'event_damage_modifier',tag:'wind',value:.04}];
 case 'medicine':return [{type:'social_target',metric:'healthcare',value:.6},{type:'population_mortality',value:.025},{type:'event_damage_modifier',tag:'disease',value:.05}];
 case 'information':return [{type:'productivity',industry:'advanced',value:.025},{type:'productivity',industry:'services',value:.015},{type:'research_bonus',value:.025},{type:'social_target',metric:'publicSafety',value:.4},{type:'military_readiness',value:.5}];
 case 'military':return [{type:'military_readiness',value:1},{type:'military_logistics',value:.8},{type:'military_capability',value:.6}];}}
export const technologyDefinitions:TechnologyDefinition[]=technologyDomains.flatMap(domain=>names[domain].map((name,i)=>({id:domain+'-'+(i+1),domain,name,description:name+' — '+purpose[domain],requiredLevel:i?levels[i-1]:0,resultLevel:levels[i],researchCost:costs[i],prerequisites:i?[domain+'-'+i]:[],effects:effects(domain)})));
export function technologyDefinition(id:string){const t=technologyDefinitions.find(t=>t.id===id);if(!t)throw new Error('존재하지 않는 기술입니다.');return t;}
