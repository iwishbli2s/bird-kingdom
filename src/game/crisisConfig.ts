import type { CrisisCategory, CrisisType, IndustryId } from './types';
export interface CrisisDefinition { name:string; category:CrisisCategory; activeMonths:number; maxMonths:number; industries:IndustryId[]; mortality:number; impacts:string; resilience:'infrastructure'|'medical'|'foodSecurity' }
export const crisisDefinitions:Record<CrisisType,CrisisDefinition>={
 great_storm:{name:'거대 폭풍 전선',category:'disaster',activeMonths:3,maxMonths:14,industries:['agriculture','services','manufacturing'],mortality:.06,impacts:'비행회랑 폐쇄 · 곡물 수송 지연 · 피난 횃대 과밀',resilience:'infrastructure'},
 hail_damage:{name:'우박 둥지피해',category:'disaster',activeMonths:1,maxMonths:5,industries:['agriculture'],mortality:.02,impacts:'둥지 수선 · 먹이 공급 · 생활 기반',resilience:'infrastructure'},
 wetland_drought:{name:'습지 가뭄',category:'disaster',activeMonths:5,maxMonths:18,industries:['agriculture'],mortality:.02,impacts:'습지 먹이 감소 · 오리 무리 이동 · 생활 부담',resilience:'foodSecurity'},
 reed_fire:{name:'갈대밭 대형 화재',category:'disaster',activeMonths:2,maxMonths:12,industries:['agriculture','services'],mortality:.07,impacts:'습지 서식권 손상 · 급수 편대 차질 · 치안 부담',resilience:'infrastructure'},
 nest_cliff_failure:{name:'둥지 절벽 붕괴',category:'disaster',activeMonths:2,maxMonths:16,industries:['manufacturing','services'],mortality:.04,impacts:'임시 횃대 이동 · 둥지권 재건 · 안전 부담',resilience:'infrastructure'},
 corridor_icing:{name:'고고도 비행회랑 결빙',category:'disaster',activeMonths:2,maxMonths:8,industries:['services','manufacturing'],mortality:.02,impacts:'화물 편대 지연 · 무역 효율 감소 · 군수 회랑 차질',resilience:'infrastructure'},
 seed_blight:{name:'곡물 종자병',category:'disease',activeMonths:4,maxMonths:16,industries:['agriculture'],mortality:0,impacts:'씨앗 공급 차질 · 먹이 가격 상승 · 생활 부담',resilience:'foodSecurity'},
 respiratory_outbreak:{name:'계절성 조류 호흡기 유행',category:'disease',activeMonths:4,maxMonths:16,industries:['services','manufacturing','advanced'],mortality:.55,impacts:'검역 둥지 부족 · 자연사망 증가 · 작업 비행 감소',resilience:'medical'},
 feather_mite_outbreak:{name:'깃털 진드기 유행',category:'disease',activeMonths:3,maxMonths:14,industries:['services','manufacturing'],mortality:.08,impacts:'공동 횃대 소독 · 깃갈이 휴식 · 보건 편대 부담',resilience:'medical'},
 wetland_contamination:{name:'습지 오염 위기',category:'disease',activeMonths:4,maxMonths:16,industries:['agriculture','services'],mortality:.22,impacts:'급수 둥지 오염 · 습지 생산 감소 · 무리 이동',resilience:'medical'},
};
export const legacyCrisisEvents:Record<string,CrisisType>={'storm':'great_storm','hail':'hail_damage','wetland-drought':'wetland_drought','nest-cliff':'nest_cliff_failure','seed-disease':'seed_blight','feather-mites':'feather_mite_outbreak'};
export const crisisConfig={maxCombinedDamage:1.5,maxMortalityMultiplier:1.8,maxMigrationPenalty:.35,maxGrowthPenalty:-.09,maxLeaderMortalityAddition:.0003,spreadChanceScale:.035};
export const crisisSeverityLabel=(n:number)=>n<25?'경미':n<50?'주의':n<75?'심각':'재난적';
export const leaderRiskLabel=(n:number)=>n<20?'평온':n<40?'주의':n<60?'높음':n<80?'위험':'극심';
