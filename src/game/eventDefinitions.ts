import { crisesFor, calculateCrisisSeverity } from './crisis';
import { legacyCrisisEvents } from './crisisConfig';
import { activeWars } from './military';
import { activeConflicts } from './conflict';
import { eventConfig } from './eventConfig';
import type { EventCategory, EventChoiceDefinition, EventContext, EventEffect, GameEventDefinition } from './eventTypes';
import type { IndustryId, SpeciesId } from './types';
import { growthPressure, hasRecentEvent, isMigrationSeason, majoritySpecies, minoritySpecies, migrantSpecies, populationShare, scaleAbove as above, scaleBelow as below, speciesMetric } from './eventHelpers';

const social=(metric:Extract<EventEffect,{kind:'social'}>['metric'],delta:number):EventEffect=>({kind:'social',metric,delta});
const political=(speciesId:SpeciesId,metric:Extract<EventEffect,{kind:'species'}>['metric'],delta:number):EventEffect=>({kind:'species',speciesId,metric,delta});
type Response = 'refuge'|'housing'|'supply'|'corridor'|'molt'|'harvest'|'disease'|'tailwind'|'headwind'|'disaster'|'wetland'|'restoration'|'mites'|'care'|'conflict'|'petition'|'festival'|'rescue'|'nesting';
const previews:Record<Response,readonly [string,string,string]>={
 refuge:['큰 수용 비용 · 유입 인구 증가 · 해당 무리 만족과 통합 개선','중간 비용 · 제한된 유입 · 둥지 생활에 작은 부담','적은 비용 · 최소 유입 · 해당 무리 만족과 통합 악화'],
 housing:['큰 재정 부담 · 둥지 생활·보건 보호','중간 비용 · 임시 생활과 보건 완화','적은 지출 · 둥지 생활·보건과 해당 무리 만족 하락'],
 supply:['비축·지원 비용 · 공급 피해 최소화 · 다음 달부터 제조 회복 지원','중간 지원 비용 · 생산·가격 부담 일부 지속','적은 지출 · 가격·생산 압박 · 이후 제조 부담'],
 corridor:['회랑 확장 비용 · 생활·안전 개선 · 생산 부담 완화','관제 조정 비용 · 일부 생산 부담 지속','적은 지출 · 생활·안전 하락 · 생산 부담 지속'],
 molt:['휴식 지원 비용 · 보건·생활 보호 · 생산 부담 완화','중간 비용 · 생활 보호와 보건 부담이 함께 발생','적은 지출 · 보건·생활과 생산 악화'],
 harvest:['비축 비용 · 농업 생산 확대 · 먹이 가격 완화','공급 관리 비용 · 먹이 가격과 생활 개선','수출 지원 비용 · 농업 생산 확대 · 생활 격차 확대'],
 disease:['방제 비용 · 농업 피해·가격 압박 최소화','보조 비용 · 농업·가격 부담 일부 지속','적은 지출 · 농업 생산·먹이 가격·생활 악화'],
 tailwind:['지원 비용 · 지속적인 생산 기회 · 관련 무리 만족 상승','중간 비용 · 완만한 생산 기회와 만족 상승','운항 확대 비용 · 큰 생산 기회 · 생활 격차 확대'],
 headwind:['우회 회랑 비용 · 생산·생활 피해 완화','중간 비용 · 생산 부담 일부 지속','적은 지출 · 장기간 제조·생활 부담'],
 disaster:['큰 복구 비용 · 생산·이주 피해 최소화 · 생활·안전 보호','중간 복구 비용 · 생산 손실과 일부 무리 유출','적은 복구 지출 · 큰 생산 피해·유출 · 생활·안전 악화'],
 wetland:['물길 복원 비용 · 농업·무리 이동 피해 완화','급수 비용 · 농업·오리 만족·이동 부담 일부 지속','적은 지출 · 농업·가격·오리 만족 악화와 유출'],
 restoration:['회복지 보호 비용 · 농업·정착·오리 만족 개선','중간 비용 · 제한적 농업·정착 개선','적은 관리 비용 · 작은 생산·정착 혜택'],
 mites:['소독 비용 · 보건 보호 · 자연사망·생산 피해 최소화','치료 비용 · 일부 보건·사망·생산 부담','적은 지출 · 보건 악화 · 자연사망·생산 부담 증가'],
 care:['돌봄 비용 · 생활·보건과 해당 무리 만족 개선','위탁 비용 · 생활·보건 부담 일부 완화','적은 지출 · 생활·보건과 해당 무리 만족 악화'],
 conflict:['중재 비용 · 소수 무리 만족·통합 개선 · 다수 무리 일부 불만','중간 비용 · 다수 무리 만족 상승 · 제한적 통합 개선','적은 지출 · 단기 안정 개선 · 소수 무리 자치·독립 압력 증가'],
 petition:['협상 비용 · 해당 무리 만족·통합 개선 · 자치·독립 압력 완화','중간 비용 · 제한적인 만족·통합 개선','적은 지출 · 단기 질서 개선 · 해당 무리 자치·독립 압력 증가'],
 festival:['행사 비용 · 모든 무리 만족과 통합·지지도 개선','지역 행사 비용 · 완만한 화합 효과','적은 지출 · 화합 효과 축소 · 무리 만족·지지도 부담'],
 rescue:['구조 지원 비용 · 혼성 협력과 국민 만족·지지도 개선','표창 비용 · 제한적 공동체 회복','적은 지출 · 협력 효과 축소 · 국민 만족·지지도 부담'],
 nesting:['새끼 지원 비용 · 출생·농업·생활·무리 만족 개선','지역 협력 비용 · 제한적 출생·생활 개선','적은 지출 · 작은 번식·생산 혜택'],
};
/** 공통 적용 코드는 effects에 있으며 이 helper는 콘텐츠별 결과 데이터만 생성합니다. */
function choices(labels:readonly [string,string,string],response:Response,industry:IndustryId='services',target?:(c:EventContext)=>SpeciesId):EventChoiceDefinition[] {
  return labels.map((label,i)=>({id:['invest','balance','restrict'][i],label,
    preview:previews[response][i],
    effects:(c,severity,outcome)=>{
      const magnitude=severity*(eventConfig.outcomeMin+outcome*eventConfig.outcomeSpread),s=target?.(c)??migrantSpecies(c),p=majoritySpecies(c),r=c.runtime;
      const immediate:EventEffect[]=[{kind:'treasury',amount:-r.economy.gdp*[.0025,.001,.0002][i]*magnitude}];
      const ongoing:{months:number;effects:EventEffect[]}[]=[];
      const benefit=[2,.5,-2][i]*magnitude;
      if(response==='refuge')immediate.push({kind:'population',speciesId:s,ratio:[.006,.003,.0003][i]*magnitude,flow:'migration'},social('livingStandard',[.5,-.5,-1][i]*magnitude),political(s,'satisfaction',[2,0,-3][i]*magnitude),{kind:'governance',metric:'integration',delta:[1,0,-1][i]*magnitude});
      else if(response==='harvest')immediate.push({kind:'industry',industryId:'agriculture',multiplier:1+[.02,.015,.025][i]*magnitude},{kind:'inflation',delta:-[.3,.5,.1][i]*magnitude},social('livingStandard',[1,2,.5][i]*magnitude),social('inequality',[0,-.5,1][i]*magnitude));
      else if(response==='tailwind'){ongoing.push({months:4,effects:[{kind:'industry',industryId:industry,multiplier:1+[.003,.002,.004][i]*magnitude}]});immediate.push(political(s,'satisfaction',[2,1,0][i]*magnitude),social('inequality',[0,0,1][i]*magnitude));}
      else if(response==='restoration'||response==='nesting'){immediate.push({kind:'population',speciesId:s,ratio:[.001,.0005,.0002][i]*magnitude,flow:response==='nesting'?'birth':'migration'},{kind:'industry',industryId:'agriculture',multiplier:1+[.01,.005,.002][i]*magnitude},social('livingStandard',[1.5,1,.2][i]*magnitude),political(s,'satisfaction',[2,1,0][i]*magnitude));}
      else if(response==='petition'||response==='conflict'){
        immediate.push(political(s,'satisfaction',[4,1,-4][i]*magnitude),political(s,'autonomyDemand',[-3,-1,4][i]*magnitude),political(s,'independenceSentiment',[-1.5,0,2][i]*magnitude),{kind:'governance',metric:'integration',delta:[2,.5,-2][i]*magnitude},{kind:'governance',metric:'stability',delta:[.5,1,2][i]*magnitude});
        if(response==='conflict'&&s!==p)immediate.push(political(p,'satisfaction',[-1,2,-1][i]*magnitude));
      }else if(response==='festival'||response==='rescue'){
        immediate.push({kind:'governance',metric:'integration',delta:[3,1.5,.2][i]*magnitude},{kind:'governance',metric:'approval',delta:[2,1,-.5][i]*magnitude});for(const id of Object.keys(r.population.species) as SpeciesId[])immediate.push(political(id,'satisfaction',[2,1,-.5][i]*magnitude));
      }else{
        immediate.push(social('livingStandard',benefit),social('publicSafety',[1,0,-1][i]*magnitude));
        if(response==='housing'||response==='care')immediate.push(social('healthcare',[1,.5,-1][i]*magnitude),political(s,'satisfaction',[2,.5,-2][i]*magnitude));
        if(response==='supply'||response==='disease'||response==='wetland')immediate.push({kind:'inflation',delta:[.1,.3,.6][i]*magnitude},{kind:'industry',industryId:industry,multiplier:1-[.002,.008,.015][i]*magnitude});
        if(response==='wetland')immediate.push(political(s,'satisfaction',[0,-1,-3][i]*magnitude),{kind:'population',speciesId:s,ratio:-[.0001,.0003,.0006][i]*magnitude,flow:'migration'});
        if(['corridor','molt','headwind','mites'].includes(response))ongoing.push({months:response==='headwind'?6:3,effects:[{kind:'industry',industryId:industry,multiplier:1-[.0005,.0015,.003][i]*magnitude,productivityMultiplier:1-[.0001,.0003,.0006][i]*magnitude}]});
        if(response==='mites'||response==='molt')immediate.push(social('healthcare',[1,-.5,-2][i]*magnitude));
        if(response==='mites')immediate.push({kind:'population',speciesId:s,ratio:[.00003,.00008,.0002][i]*magnitude,flow:'death'});
        if(response==='disaster')immediate.push({kind:'industry',industryId:industry,multiplier:1-[.005,.012,.025][i]*magnitude},{kind:'population',speciesId:s,ratio:-[.0002,.0006,.001][i]*magnitude,flow:'migration'});
        if(response==='supply')ongoing.push({months:3,effects:[{kind:'industry',industryId:'manufacturing',multiplier:1+[.001,.0005,-.001][i]*magnitude}]});
      }
      return {immediate,ongoing};
    }}));
}
const conflictPressure=(c:EventContext)=>(activeWars(c.game.world).some(w=>w.status==='active'&&!!w.participants[c.jurisdiction.kind==='country'?c.jurisdiction.id:c.game.world.regions[c.jurisdiction.id].ownerCountryId])||activeConflicts(c.game.world).some(x=>x.status==='armed_conflict'&&(c.jurisdiction.kind==='country'?[x.parentCountryId,x.breakawayCountryId].includes(c.jurisdiction.id):[x.parentCountryId,x.breakawayCountryId].includes(c.game.world.regions[c.jurisdiction.id].ownerCountryId))))?1.5:0;
const lowInfrastructure=(c:EventContext)=>below(c.runtime.fiscal.budgetPolicy.infrastructure,c.runtime.fiscal.baselineBudgetPolicy.infrastructure,2);
const badSafety=(c:EventContext)=>below(c.runtime.social.publicSafety,60);
const disasterSeverity=(c:EventContext)=>c.runtime.social.publicSafety<35||hasRecentEvent(c.game,c.jurisdiction,'storm',6)?3:c.runtime.social.publicSafety<65||lowInfrastructure(c)>0?2:1;
function event(id:string,title:string,description:string,category:EventCategory,tone:GameEventDefinition['tone'],base:number,cooldown:number,pressure:(c:EventContext)=>number,options:EventChoiceDefinition[],eligible:(c:EventContext)=>boolean=()=>true,chains:readonly string[]=[]):GameEventDefinition {
  return {id,title,description,category,tone,baseMonthlyChance:base,cooldownMonths:cooldown,eligible,
    calculateChance:c=>base*(1+Math.max(0,pressure(c)))+chains.filter(parent=>hasRecentEvent(c.game,c.jurisdiction,parent,12)).length*.035,
    severity:c=>category==='disaster'?disasterSeverity(c):pressure(c)>3?3:pressure(c)>1.4?2:1,
    choices:options,nonPlayerChoiceId:'balance',tags:chains};
}
const crow=(c:EventContext)=>populationShare(c,'crow')>0;
const eagle=(c:EventContext)=>populationShare(c,'eagle')>0;
const duck=(c:EventContext)=>populationShare(c,'duck')>.03;
const owl=(c:EventContext)=>populationShare(c,'owl')>0;
const originalEventDefinitions:readonly GameEventDefinition[]=[
 event('migrant-refuge','철새 피난 무리의 도착','북부 비행 회랑을 따라 피난 무리가 도착했습니다. 도시 주변 임시 횃대가 차오르고 있어 수용 범위를 결정해야 합니다.','population','mixed',.012,18,c=>conflictPressure(c)+(isMigrationSeason(c.game.date.month)?1.4:0)+above(c.runtime.social.livingStandard,60)+below(c.runtime.economy.unemployment,5,5)+Number(Object.values(c.game.world.regions).some(r=>r.id!==c.jurisdiction.id&&r.governance.stability<40))*1.5,choices(['임시 둥지터 개방','제한적 수용','비행 경계 강화'],'refuge')),
 event('nest-overcrowding','도시권 둥지터 과밀','도시의 둥지구역이 과밀해져 공동 횃대와 급수 지점에 부담이 커졌습니다. 신규 무리와 기존 주민의 둥지 접근을 조정해야 합니다.','social','negative',.009,18,c=>conflictPressure(c)+growthPressure(c)+below(c.runtime.social.livingStandard,55)+lowInfrastructure(c),choices(['공공 둥지단지 확충','임시 횃대 설치','둥지 임대시장에 맡기기'],'housing'),()=>true,['migrant-refuge']),
 event('nest-materials','둥지재 가격 폭등','가지·갈대·결속 섬유의 공급이 줄어 둥지 수선비가 급등했습니다. 번식기 이전에 둥지재 공급을 확보하라는 요구가 늘고 있습니다.','economy','negative',.01,12,c=>above(c.runtime.economy.inflation,3,5)+growthPressure(c)+below(c.runtime.economy.industries.manufacturing.productivity,100,20),choices(['비축 둥지재 방출','둥지재 생산업체 지원','시장가격 허용'],'supply','manufacturing'),()=>true,['storm']),
 event('flight-corridor','주요 비행 회랑 과밀','출근 무리와 화물 편대가 같은 고도에 몰리며 공중 통로의 대기 시간이 늘었습니다. 관제와 회랑 확장 중 우선 대응이 필요합니다.','social','negative',.01,12,c=>conflictPressure(c)+growthPressure(c)+lowInfrastructure(c)+above(c.runtime.economy.industries.services.output/c.runtime.economy.gdp*100,40,40),choices(['비행 회랑 확장','횃대별 출발시간 분산','현행 관제 유지'],'corridor')),
 event('long-molt','이례적으로 긴 깃갈이철','깃갈이가 길어져 장거리 비행과 작업 편대 유지가 어려워졌습니다. 휴식 지원과 생산 부담의 균형을 결정해야 합니다.','ecology','mixed',.012,18,c=>below(c.runtime.social.healthcare,60)+(c.game.date.month>=7&&c.game.date.month<=9?1:0),choices(['깃갈이 휴식 지원','근무 비행 기준 완화','기존 생산체계 유지'],'molt','manufacturing')),
 event('grain-harvest','곡물과 씨앗의 대풍작','곡물·씨앗 수확량이 예상을 웃돌았습니다. 비축, 국내 공급, 장거리 수출 중 풍작의 혜택을 배분해야 합니다.','economy','positive',.016,12,c=>c.runtime.economy.industries.agriculture.output/c.runtime.economy.gdp*3+([8,9,10].includes(c.game.date.month)?1:0),choices(['국립 씨앗 비축 확대','먹이 공급가격 안정','순풍 편대 수출 확대'],'harvest')),
 event('seed-disease','곡물 종자병 확산','씨앗 저장고와 재배지에서 종자병이 확인됐습니다. 감염 씨앗의 비행 운송을 제한하면 식량 공급도 줄어들 수 있습니다.','ecology','negative',.011,18,c=>below(c.runtime.social.healthcare,60)+c.runtime.economy.industries.agriculture.output/c.runtime.economy.gdp*2,choices(['긴급 종자 방제','피해 농가 보조','수급 정상화까지 대기'],'disease','agriculture')),
 event('tailwind','장거리 순풍대 형성','주요 무역 항로에 안정적인 순풍대가 형성됐습니다. 화물 편대 운항을 늘릴 기회지만 둥지권역의 작업 부담도 고려해야 합니다.','economy','positive',.016,12,c=>above(c.runtime.economy.growth,2,5)+(isMigrationSeason(c.game.date.month)?.5:0),choices(['공동 화물편대 지원','기존 항로 활용','운항량 대폭 확대'],'tailwind')),
 event('headwind','대륙풍 역전','주요 비행 회랑에 역풍이 지속되고 있습니다. 화물 편대가 먼 경로로 우회하면서 제조·서비스 생산이 압박받고 있습니다.','ecology','negative',.012,12,c=>lowInfrastructure(c)+([1,2,12].includes(c.game.date.month)?1:0),choices(['대체 비행 회랑 확보','화물편대 운항 조정','기존 항로 유지'],'headwind','manufacturing')),
 event('nest-cliff','대규모 둥지 절벽 붕괴','절벽 둥지권역의 균열이 확대돼 여러 무리가 둥지를 떠났습니다. 재건을 기다릴지 임시 이동을 지원할지 결정해야 합니다.','disaster','negative',.006,24,c=>lowInfrastructure(c)+badSafety(c),choices(['둥지 절벽 전면 재건','임시 무리 이주 지원','최소 안전 복구'],'disaster','manufacturing'),()=>true,['storm']),
 event('storm','거대 폭풍 전선 접근','폭풍 전선이 비행 회랑과 둥지권역을 가로지르고 있습니다. 둥지 고정, 화물편대 정지, 긴급 횃대 확보의 우선순위를 정해야 합니다.','disaster','negative',.012,18,c=>lowInfrastructure(c)+badSafety(c)+([6,7,8].includes(c.game.date.month)?.7:0),choices(['둥지권역 전면 보호','취약 둥지와 편대 우선 보호','최소 대피 지침 시행'],'disaster','services')),
 event('hail','대규모 우박으로 둥지 피해','우박이 외곽 둥지의 지붕과 공중 횃대를 손상시켰습니다. 새끼 보호와 둥지 수선을 위한 지원 요청이 이어지고 있습니다.','disaster','negative',.01,12,c=>lowInfrastructure(c)+below(c.runtime.social.livingStandard,55),choices(['긴급 둥지 수선 지원','취약 둥지 우선 복구','주민 자력 수선 지원'],'disaster','agriculture')),
 event('wetland-drought','주요 습지 수위 급감','습지의 먹이 지점과 물길이 마르고 있습니다. 물길 복원 비용과 농업 편대의 운용 축소를 함께 검토해야 합니다.','ecology','negative',.009,18,c=>populationShare(c,'duck')*2+([6,7,8].includes(c.game.date.month)?1:0),choices(['습지 물길 긴급 복원','농업 무리 급수 지원','현행 물 사용 유지'],'wetland','agriculture',()=> 'duck'),duck),
 event('wetland-recovery','대규모 습지 회복','갈대밭과 얕은 물길이 회복돼 먹이 공급과 둥지 서식지가 늘었습니다. 이용 확대와 회복지 보호의 균형이 필요합니다.','ecology','positive',.016,18,c=>populationShare(c,'duck')*2+above(c.runtime.social.healthcare,60),choices(['습지 보호와 둥지 지원','제한적 공동 이용','농업 이용 확대'],'restoration','agriculture',()=> 'duck'),duck),
 event('feather-mites','깃털 진드기 유행','공동 횃대에서 깃털 진드기가 번지고 있습니다. 보건 무리는 둥지 소독과 휴식 편대 운영을 요청했습니다.','social','negative',.009,18,c=>below(c.runtime.social.healthcare,65)*4+below(c.runtime.social.livingStandard,50),choices(['공동 횃대 전면 소독','취약 무리 치료 지원','기존 보건체계 대응'],'mites','services')),
 event('chick-care','새끼 돌봄 둥지 부족','번식기 새끼 돌봄 둥지가 부족해 보호자들의 작업 비행이 줄었습니다. 공공 둥지 확대와 민간 위탁을 검토해야 합니다.','population','negative',.01,12,c=>growthPressure(c)+(c.runtime.population.total>0?above(c.runtime.population.birthsLastMonth/c.runtime.population.total*1200,1.5,1):0)+below(c.runtime.fiscal.budgetPolicy.welfare,c.runtime.fiscal.baselineBudgetPolicy.welfare,2)+below(c.runtime.social.healthcare,60),choices(['공공 돌봄 둥지 확대','민간 돌봄 둥지 위탁','현행 돌봄체계 유지'],'care')),
 event('nest-conflict','공동 둥지구역 충돌','서로 다른 무리가 공동 둥지 경계를 놓고 충돌했습니다. 다수 무리의 요구와 소수 무리의 둥지 접근권이 맞서고 있습니다.','species','negative',.007,18,c=>below(c.runtime.governance.integration,65)*4+above(c.runtime.social.inequality,40)*2+below(speciesMetric(c,minoritySpecies(c),'satisfaction'),50)*2+above(speciesMetric(c,minoritySpecies(c),'autonomyDemand'),25)*2,choices(['혼성 중재위원회 구성','다수 무리 요구 일부 수용','강한 치안조치'],'conflict','services',minoritySpecies),()=>true,['nest-overcrowding']),
 event('crow-petition','까마귀 자치 청원','까마귀 무리 대표들이 둥지권역 행정과 공동 횃대 운영권을 요구했습니다. 제도 신설 없이 협상과 행정 대응을 결정합니다.','species','mixed',.008,24,c=>above(speciesMetric(c,'crow','autonomyDemand'),18)*5+below(speciesMetric(c,'crow','satisfaction'),50)*2,choices(['제한적 자치 협상','행정권 일부 이양 검토','청원 거부'],'petition','services',()=> 'crow'),c=>crow(c)&&speciesMetric(c,'crow','autonomyDemand')>=18),
 event('eagle-petition','독수리 비행권 자치 청원','독수리 무리 대표들이 지역 비행권과 군집 횃대 운영에 관한 청원을 제출했습니다. 불만이 누적되면 대편대 집회로 확대될 수 있습니다.','species','mixed',.006,24,c=>above(speciesMetric(c,'eagle','autonomyDemand'),20)*3+below(speciesMetric(c,'eagle','satisfaction'),50)*2,choices(['비행권 협의 개시','기존 행정권 내 절충','자치 청원 거부'],'petition','defense',()=> 'eagle'),c=>eagle(c)&&speciesMetric(c,'eagle','autonomyDemand')>=20),
 event('eagle-assembly','독수리 대편대 집회','독수리 대편대가 주요 비행구역에 모여 지역 운영권 확대를 요구하고 있습니다. 질서 유지와 협상 사이의 대응을 정해야 합니다.','species','negative',.009,24,c=>above(speciesMetric(c,'eagle','autonomyDemand'),25)*4+below(speciesMetric(c,'eagle','satisfaction'),50)*3+above(speciesMetric(c,'eagle','independenceSentiment'),20)*3+below(c.runtime.governance.integration,60),choices(['대편대 대표와 협상','질서 유지 중심 대응','비행 집회 제한'],'petition','defense',()=> 'eagle'),c=>eagle(c)&&speciesMetric(c,'eagle','autonomyDemand')>=25,['eagle-petition']),
 event('owl-declaration','부엉이 학술원 공동성명','부엉이 학술원들이 교육·연구 둥지의 운영과 지역 참여 확대를 요구했습니다. 높은 전문성과 정치 영향력을 가진 무리의 성명입니다.','governance','mixed',.014,24,c=>above(c.runtime.social.education,65)+above(speciesMetric(c,'owl','politicalInfluence'),40)+below(c.runtime.fiscal.budgetPolicy.research,c.runtime.fiscal.baselineBudgetPolicy.research,1),choices(['학술원 공동 협의','교육 운영권 논의','현행 연구정책 고수'],'petition','advanced',()=> 'owl'),c=>owl(c)&&c.runtime.social.education>=65&&speciesMetric(c,'owl','politicalInfluence')>=30),
 event('duck-protest','오리 습지위원회 시위','오리 습지위원회가 물길과 갈대 둥지 이용권을 요구하며 비행 행렬을 조직했습니다. 습지 피해와 지역 자치 요구가 함께 제기됩니다.','species','negative',.008,24,c=>below(speciesMetric(c,'duck','satisfaction'),55)*3+above(speciesMetric(c,'duck','autonomyDemand'),15)*3,choices(['습지위원회 협상','갈대 둥지 이용권 조정','비행 행렬 제한'],'petition','agriculture',()=> 'duck'),duck,['wetland-drought']),
 event('sparrow-protest','참새 수도 횃대 시위','수도 공동 횃대에 참새 무리가 모여 일자리와 먹이 가격, 세부담을 문제 삼고 있습니다. 주류 무리도 정부 운영에 대한 설명을 요구합니다.','governance','negative',.007,18,c=>above(c.runtime.economy.unemployment,6,10)*3+above(c.runtime.economy.inflation,3,8)*3+above(c.runtime.fiscal.taxPolicy.incomeTaxRate,c.runtime.fiscal.baselineTaxPolicy.incomeTaxRate,15),choices(['수도 무리 대표와 대화','먹이 공급 부담 완화','횃대 집회 제한'],'petition','services',()=> 'sparrow'),c=>populationShare(c,'sparrow')>0,['food-prices']),
 event('flight-festival','공동 비행축제','여러 종족의 혼성 무리가 공동 비행축제를 제안했습니다. 화합의 기회지만 행사 편대와 둥지권역 관리 비용이 필요합니다.','social','positive',.022,12,c=>above(c.runtime.governance.integration,65)*2+above(c.runtime.governance.stability,65),choices(['국가 공동 비행행사 확대','지역행사 유지','예산상 행사 축소'],'festival'),c=>c.runtime.governance.integration>=60&&c.runtime.governance.stability>=55),
 event('mixed-rescue','폭풍 속 혼성 구조편대 활약','서로 다른 종족이 혼성 편대를 꾸려 고립된 둥지와 새끼를 구조했습니다. 구조 경험을 공동체 협력으로 이어갈 방안을 결정해야 합니다.','governance','positive',.012,12,c=>above(c.runtime.governance.integration,60)+above(c.runtime.social.publicSafety,60),choices(['혼성 구조편대 지원','지역 공동 표창','기존 구조예산 유지'],'rescue'),c=>['storm','hail','nest-cliff'].some(id=>hasRecentEvent(c.game,c.jurisdiction,id,12)),['storm','hail','nest-cliff']),
 event('temporary-flock','붕괴 둥지권역의 임시 이동 무리','절벽 둥지를 떠난 무리가 임시 횃대에서 장기 체류하고 있습니다. 새로운 둥지터 정착과 귀환 준비를 지원할 필요가 있습니다.','population','mixed',.006,18,c=>below(c.runtime.social.livingStandard,55)+growthPressure(c),choices(['정착 둥지터 제공','임시 횃대 관리','원래 둥지권역 귀환 권고'],'refuge'),c=>hasRecentEvent(c.game,c.jurisdiction,'nest-cliff',12),['nest-cliff']),
 event('food-prices','국립 씨앗시장 공급 압박','종자병 이후 씨앗 공급 지연이 공동 먹이시장 가격에 반영되고 있습니다. 비축 방출과 공급 편대 지원이 필요합니다.','economy','negative',.006,12,c=>above(c.runtime.economy.inflation,3,5),choices(['비축 씨앗 방출','씨앗 생산무리 지원','가격 조정 허용'],'supply','agriculture'),c=>hasRecentEvent(c.game,c.jurisdiction,'seed-disease',12),['seed-disease']),
 event('federal-autonomy','연방 비행구역 자치권 논쟁','독수리 집회 이후 연방과 지역의 비행구역 운영권을 둘러싼 논쟁이 확대됐습니다. 실제 권한 제도 변경 없이 협상 태도를 정해야 합니다.','governance','mixed',.006,30,c=>above(speciesMetric(c,'eagle','autonomyDemand'),30)*4+above(speciesMetric(c,'eagle','independenceSentiment'),20)*2,choices(['연방·지역 공동 협의','비행구역 운영 절충','지역 요구 거부'],'petition','defense',()=> 'eagle'),c=>eagle(c)&&hasRecentEvent(c.game,c.jurisdiction,'eagle-assembly',12),['eagle-assembly']),
 event('successful-nesting','성공적인 공동 둥지철','여러 둥지구역에서 새끼 생존과 돌봄 협력이 개선됐습니다. 번식 성과를 유지하려면 둥지 지원과 먹이 확보에 투자가 필요합니다.','population','positive',.02,12,c=>above(c.runtime.social.healthcare,60)+above(c.runtime.social.livingStandard,60)+([3,4,5].includes(c.game.date.month)?1:0),choices(['공동 새끼 둥지 지원','지역 돌봄 협력 유지','기존 번식지원 유지'],'nesting'),c=>c.runtime.social.healthcare>=55),
];

// Legacy IDs and immediate response outcomes are retained. Crisis owns sustained damage.
export const eventDefinitions:readonly GameEventDefinition[]=originalEventDefinitions.map(e=>{const type=legacyCrisisEvents[e.id];if(!type)return e;return {...e,eligible:c=>e.eligible(c)&&!crisesFor(c.game.world,c.jurisdiction).some(x=>x.type===type),choices:e.choices.map((choice,i)=>({...choice,...(e.id==='storm'?{label:['전국 비행경보 발령','주요 회랑만 폐쇄','경제활동 유지'][i],preview:['큰 초기 비용 · 활동 축소 · 위기 피해 감소','중간 비용 · 일부 회랑 통제 · 제한적 보호','작은 초기 비용 · 현재 운항 유지 · 후속 피해 증가'][i]}:{}),effects:(c,s,o)=>{const plan=choice.effects(c,s,o);return {...plan,ongoing:[],immediate:[...plan.immediate,{kind:'start_crisis',crisisType:type,severity:calculateCrisisSeverity(c.game,c.jurisdiction,type,s),sourceEventId:e.id,protection:[.4,.2,0][i],activityReduction:e.id==='storm'?[.012,.004,0][i]:0}]};}}))};});
