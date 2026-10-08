import assert from 'node:assert/strict';
import { test } from 'node:test';
import { advanceMonth, createGame } from './legacyEngine';
import { aggregateFederationSocial, calculateEducationTarget, calculateHealthcareTarget, calculateInequalityTarget, calculateLivingStandardTarget, calculatePublicSafetyTarget, updateSocialState, updateWorldSocial } from '../src/game/social';
import { createInitialSocial, socialConfig, socialKeys } from '../src/game/socialConfig';
import { calculateDeathRate, calculateMigrationRate, updatePopulation } from '../src/game/population';
import { speciesDefinitions } from '../src/game/populationConfig';
import { calculateSatisfactionTarget, updateSpeciesPolitics } from '../src/game/speciesPolitics';
import { getSpeciesPoliticalBaseline } from '../src/game/speciesPoliticsConfig';
import { createSeededRandom } from '../src/game/random';
import { socialCategory } from '../src/components/SocialView';
import type { RegionRuntimeState, SocialState } from '../src/game/types';

const near = (a: number,b: number) => assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const runtime = () => createGame('pigeon','eagle-state').world.regions['eagle-state'];
const neutral = () => { const r=runtime(); return { ...r,economy:{ ...r.economy,growth:2,unemployment:5,inflation:2 } }; };
const budget = (r: RegionRuntimeState,key: keyof RegionRuntimeState['fiscal']['budgetPolicy'],delta: number) => ({ ...r, fiscal:{ ...r.fiscal,budgetPolicy:{ ...r.fiscal.budgetPolicy,[key]:r.fiscal.baselineBudgetPolicy[key]+delta } } });
function verify(s: SocialState) {
  for(const key of socialKeys){ assert.ok(Number.isFinite(s[key]) && s[key]>=0 && s[key]<=100);assert.ok(Math.abs(s[`${key}DeltaLastMonth`])<=socialConfig.limit[key]+1e-10); }
}
function freeze<T>(value: T): T { if(value && typeof value==='object'){Object.freeze(value);Object.values(value).forEach(freeze);}return value; }
for(const [id,values] of Object.entries({sparrow:[64,61,62,65,34],'pigeon-state':[70,68,69,67,31],'eagle-state':[63,57,60,70,38],'owl-state':[68,78,68,66,29],'duck-state':[61,55,63,64,35]})) test(`${id} 초기 사회값·0 변화량 및 Governance 생활수준 제거`,()=>{
  const w=createGame('sparrow').world;const r=id==='sparrow'?w.countries.sparrow:w.regions[id];assert.deepEqual(socialKeys.map(key=>r.social![key]),values);assert.equal('livingStandard' in r.governance,false);for(const key of socialKeys) assert.equal(r.social![`${key}DeltaLastMonth`],0);
});
test('기본예산·중립경제에서 각 지역 기준 목표와 느린 관성',()=>{
  const r=neutral();near(calculateLivingStandardTarget(r.id,r),63);near(calculateEducationTarget(r.id,r),57);near(calculateHealthcareTarget(r.id,r),60);near(calculatePublicSafetyTarget(r.id,r),70);near(calculateInequalityTarget(r.id,r),38);assert.deepEqual(updateSocialState(r.id,r),r.social);
});
for(const field of ['unemployment','inflation'] as const) test(`${field} 상승은 생활수준 목표 하락`,()=>{const r=neutral();assert.ok(calculateLivingStandardTarget(r.id,{...r,economy:{...r.economy,[field]:r.economy[field]+5}})<63);});
test('생활수준 복지+1pp 목표+1.5, 작은 보건·조세 및 성장 효과',()=>{
  const r=neutral();near(calculateLivingStandardTarget(r.id,budget(r,'welfare',1)),64.5);assert.ok(calculateLivingStandardTarget(r.id,budget(r,'healthcare',1))>63);assert.ok(calculateLivingStandardTarget(r.id,{...r,economy:{...r.economy,growth:4}})>63);
  for(const key of ['incomeTaxRate','consumptionTaxRate'] as const)assert.ok(calculateLivingStandardTarget(r.id,{...r,fiscal:{...r.fiscal,taxPolicy:{...r.fiscal.taxPolicy,[key]:r.fiscal.taxPolicy[key]+5}}})<63);
});
test('불평등 생활수준 악영향은60 이후 더 강해짐',()=>{const r=neutral();const t=(inequality:number)=>calculateLivingStandardTarget(r.id,{...r,social:{...r.social,inequality}});assert.ok(t(40)>t(60));assert.ok(t(60)-t(70)>t(40)-t(50));});
for(const [key,target,category] of [['education',calculateEducationTarget,'education'],['healthcare',calculateHealthcareTarget,'healthcare'],['publicSafety',calculatePublicSafetyTarget,'security']] as const) test(`${key} 예산 증액·삭감 방향 및 느린 월 변화`,()=>{
  const r=neutral();const high=budget(r,category,1),low=budget(r,category,-1);near(target(r.id,high)-target(r.id,r),key==='publicSafety'?6:5);assert.ok(target(r.id,low)<target(r.id,r));const next=updateSocialState(r.id,high);assert.ok(next[key]>r.social[key]);assert.ok(next[key]-r.social[key]<1);verify(next);
});
test('연구 보조 교육효과는 교육 투자보다 작음',()=>{const r=neutral();assert.ok(calculateEducationTarget(r.id,budget(r,'research',1))>57);assert.ok(calculateEducationTarget(r.id,budget(r,'research',1))<calculateEducationTarget(r.id,budget(r,'education',1)));});
test('보건수준은 생활수준과 경제 여건의 작은 영향을 받음',()=>{const r=neutral();assert.ok(calculateHealthcareTarget(r.id,{...r,social:{...r.social,livingStandard:80}})>60);assert.ok(calculateHealthcareTarget(r.id,{...r,economy:{...r.economy,unemployment:10}})<60);});
test('치안은 고실업·불평등 악화 및10/70 이후 추가압력',()=>{
  const r=neutral();const u=(unemployment:number)=>calculatePublicSafetyTarget(r.id,{...r,economy:{...r.economy,unemployment}});assert.ok(u(5)>u(10)&&u(10)>u(15));assert.ok(u(10)-u(15)>u(5)-u(10));const i=(inequality:number)=>calculatePublicSafetyTarget(r.id,{...r,social:{...r.social,inequality}});assert.ok(i(50)>i(70)&&i(70)>i(80));
});
test('불평등은 실업으로 증가·복지와 소득세로 감소하며 성장효과 작음',()=>{
  const r=neutral();assert.ok(calculateInequalityTarget(r.id,{...r,economy:{...r.economy,unemployment:10}})>38);near(calculateInequalityTarget(r.id,budget(r,'welfare',1)),34);near(calculateInequalityTarget(r.id,{...r,fiscal:{...r.fiscal,taxPolicy:{...r.fiscal.taxPolicy,incomeTaxRate:r.fiscal.taxPolicy.incomeTaxRate+1}}}),37.85);
  assert.ok(Math.abs(calculateInequalityTarget(r.id,{...r,economy:{...r.economy,growth:6}})-38)<1);
});
test('높은 첨단비중은 작은 불평등 압력, 농업이 자동 평등을 만들지 않음',()=>{
  const r=neutral();const advanced={...r,economy:{...r.economy,industries:{...r.economy.industries,advanced:{...r.economy.industries.advanced,output:r.economy.gdp*.8}}}};assert.ok(calculateInequalityTarget(r.id,advanced)>38);assert.ok(calculateInequalityTarget(r.id,advanced)<40);
  near(calculateInequalityTarget(r.id,{...r,economy:{...r.economy,industries:{...r.economy.industries,agriculture:{...r.economy.industries.agriculture,output:r.economy.gdp*.8}}}}),38);
});
test('극단 목표에서도 각 지표 월 상한·범위 및 실제 delta',()=>{
  for(const sign of [-1,1]){const r=neutral();r.economy.unemployment=sign*10000;r.economy.inflation=sign*10000;for(const key of Object.keys(r.fiscal.budgetPolicy) as (keyof typeof r.fiscal.budgetPolicy)[])r.fiscal.budgetPolicy[key]=sign*10000;const next=updateSocialState(r.id,r);verify(next);for(const key of socialKeys)near(next[key]-r.social[key],next[`${key}DeltaLastMonth`]);}
});
test('보건50 중립·좋은 보건 소폭 사망 감소·나쁜 보건 증가',()=>{const d=speciesDefinitions[0];near(calculateDeathRate(d,{healthcare:50}),d.baseAnnualDeathRate);near(calculateDeathRate(d,{healthcare:70}),.98);near(calculateDeathRate(d,{healthcare:30}),1.02);});
test('보건예산은 사회를 거쳐 사망률에 전달되며 직접 중복적용 없음',()=>{
  const r=neutral(),high=budget(r,'healthcare',2);assert.deepEqual(updatePopulation(r.population,r.economy,r.fiscal,r.social),updatePopulation(r.population,high.economy,high.fiscal,r.social));const s=updateSocialState(r.id,high);assert.ok(calculateDeathRate(speciesDefinitions[0],s)<calculateDeathRate(speciesDefinitions[0],r.social));
});
test('생활수준은 순이동에 작은 효과·경제보다 약함',()=>{const r=neutral(),d=speciesDefinitions[0];const t=(livingStandard:number)=>calculateMigrationRate(d,r.economy,{livingStandard});assert.ok(t(70)>t(50)&&t(50)>t(30));assert.ok(t(70)-t(50)<calculateMigrationRate(d,{...r.economy,unemployment:4},{livingStandard:50})-t(50));});
for(const key of socialKeys) test(`${key} 종족 만족도 방향과 가중치`,()=>{
  const r=neutral(),d=speciesDefinitions.find(d=>d.id==='eagle')!,b=getSpeciesPoliticalBaseline(r.id,'eagle');const base=calculateSatisfactionTarget(b,d,r);const changed=calculateSatisfactionTarget(b,d,{...r,social:{...r.social,[key]:r.social[key]+10}});assert.ok((changed-base)*(key==='inequality'?-1:1)>0);
});
test('만족도 사회 가중치 순서: 생활>불평등>치안>보건>교육',()=>{
  const r=neutral(),d=speciesDefinitions[0],b=getSpeciesPoliticalBaseline(r.id,'eagle');const base=calculateSatisfactionTarget(b,d,r);const impacts=['livingStandard','inequality','publicSafety','healthcare','education'].map(key=>Math.abs(calculateSatisfactionTarget(b,d,{...r,social:{...r.social,[key]:r.social[key as keyof SocialState]+10}})-base));for(let n=1;n<impacts.length;n++)assert.ok(impacts[n-1]>impacts[n]);
});
test('연방 모든 사회값·delta 인구 가중 평균, 빈 집계와0인구 안전',()=>{
  const a=runtime(),b=runtime();a.population.total=100;b.population.total=300;a.social={...a.social,livingStandard:20,livingStandardDeltaLastMonth:1};b.social={...b.social,livingStandard:60,livingStandardDeltaLastMonth:-1};const s=aggregateFederationSocial([a,b]);near(s.livingStandard,50);near(s.livingStandardDeltaLastMonth,-.5);for(const v of Object.values(aggregateFederationSocial([])))assert.equal(v,0);a.population.total=0;b.population.total=0;assert.deepEqual(aggregateFederationSocial([a,b]),aggregateFederationSocial([]));
});
test('연방 별도 사회 저장 없음·소유권 기반 집계 및 평균에 한 주 변화 반영',()=>{
  const w=createGame('sparrow').world;assert.equal('social' in w.countries.pigeon,false);const a=aggregateFederationSocial(Object.values(w.regions));w.regions['eagle-state'].social.livingStandard+=10;const b=aggregateFederationSocial(Object.values(w.regions));near(b.livingStandard-a.livingStandard,10*13/52);const next=updateWorldSocial(w);assert.equal('social' in next.countries.pigeon,false);
});
for(const mode of ['sparrow','eagle'] as const)test(`${mode} 플레이 여부 무관 모든 사회주체 갱신`,()=>{const g=mode==='sparrow'?createGame('sparrow'):createGame('pigeon','eagle-state');const n=advanceMonth(g,{eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom:()=>.5,electionRandom:()=>0, mortalityRandom:()=>.99});assert.notDeepEqual(n.world.countries.sparrow.social,g.world.countries.sparrow.social);for(const id of Object.keys(g.world.regions))assert.notDeepEqual(n.world.regions[id].social,g.world.regions[id].social);});
test('동결 입력 불변성과 결정론·사회 객체 공유 없음',()=>{const g=createGame('sparrow');const w=freeze(g.world),snapshot=structuredClone(w);assert.deepEqual(updateWorldSocial(w),updateWorldSocial(w));assert.deepEqual(w,snapshot);assert.notEqual(createInitialSocial('sparrow'),createInitialSocial('sparrow'));});
test('엔진은 이전 사회로 인구·새 사회로 종족정치 계산, 경제 역효과와 추가 RNG·로그 없음',()=>{
  const g=createGame('sparrow');let economy=0,death=0;const n=advanceMonth(g,{eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom:()=>{economy++;return .5},electionRandom:()=>0, mortalityRandom:()=>{death++;return .99}});const before=g.world.regions['eagle-state'],r=n.world.regions['eagle-state'];assert.deepEqual(r.population,updatePopulation(before.population,r.economy,r.fiscal,before.social));assert.deepEqual(r.speciesPolitics,updateSpeciesPolitics(r.id,before.speciesPolitics,{...r,governance:before.governance}));assert.notDeepEqual(r.speciesPolitics,updateSpeciesPolitics(r.id,before.speciesPolitics,{...r,social:before.social,governance:before.governance}));assert.equal(economy,30);assert.equal(death,1);assert.equal(n.logs.length,2);
  const changed=structuredClone(g);for(const key of socialKeys)changed.world.regions['eagle-state'].social[key]=0;const other=advanceMonth(changed,{eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom:()=>.5,electionRandom:()=>0, mortalityRandom:()=>.99});assert.deepEqual(r.economy,other.world.regions['eagle-state'].economy);assert.deepEqual(r.fiscal,other.world.regions['eagle-state'].fiscal);assert.notDeepEqual(r.governance,before.governance);assert.deepEqual(other.player,n.player);
});
test('사회 UI 범주 경계는 소수값과 역방향 불평등을 정확히 분류',()=>{for(const [v,label] of [[0,'매우 낮음'],[25,'낮음'],[45,'보통'],[64.9,'보통'],[65,'높음'],[80,'매우 높음']] as const)assert.equal(socialCategory('livingStandard',v),label);for(const [v,label] of [[19.9,'매우 낮음'],[20,'낮음'],[35,'보통'],[50,'높음'],[70,'매우 높음']] as const)assert.equal(socialCategory('inequality',v),label);});
test('소유 국가가 변경되면 해당 국가의 사회 authoritative 중복을 제거',()=>{
  const w=createGame('sparrow').world;w.countries.other={...w.countries.sparrow,id:'other'};w.regions['eagle-state'].ownerCountryId='other';const n=updateWorldSocial(w);assert.equal('social' in n.countries.other,false);assert.ok(n.countries.sparrow.social);assert.equal('social' in n.countries.pigeon,false);
});
test('사망 월 사회 계산을 완료하고 사망 후 추가 계산·RNG 차단',()=>{
  const g=createGame('sparrow');const dead=advanceMonth(g,{eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom:()=>.5,electionRandom:()=>0, mortalityRandom:()=>.5,mortalityRiskOverride:1});assert.equal(dead.player.alive,false);assert.notDeepEqual(dead.world.countries.sparrow.social,g.world.countries.sparrow.social);const unexpected=()=>{throw new Error('사망 후 RNG 호출');};assert.equal(advanceMonth(dead,{eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom:unexpected,electionRandom:()=>0, mortalityRandom:unexpected}),dead);
});
test('600개월 기본정책 사회·기존 세계 안정성 및 완만한 경로',()=>{
  let g=createGame('sparrow');const random=createSeededRandom(2030);for(let i=0;i<600;i++){g=advanceMonth(g,{eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom:random,electionRandom:()=>0, mortalityRandom:()=>.99});for(const r of [g.world.countries.sparrow,...Object.values(g.world.regions)]){verify(r.social!);assert.ok(r.economy.gdp>0);assert.ok(Number.isSafeInteger(r.population.total));for(const key of ['approval','stability','integration'] as const)assert.ok(Number.isFinite(r.governance![key])&&r.governance![key]>=0&&r.governance![key]<=100);}}
  for(const r of [g.world.countries.sparrow,...Object.values(g.world.regions)])for(const key of socialKeys)assert.ok(r.social![key]>0&&r.social![key]<100);assert.equal(g.logs.filter(l=>l.category==='social').length,0);console.log('SOCIAL NORMAL600',JSON.stringify({sparrow:g.world.countries.sparrow.social,federation:aggregateFederationSocial(Object.values(g.world.regions)),population:g.world.countries.sparrow.population.total}));
});
test('240개월 사회투자 시나리오 교육·보건·생활 개선과 불평등 완화',()=>{
  let r=neutral();const initial=structuredClone(r);for(const key of ['education','healthcare','welfare'] as const)r=budget(r,key,1);for(let i=0;i<240;i++){r.population=updatePopulation(r.population,r.economy,r.fiscal,r.social);r.social=updateSocialState(r.id,r);r.speciesPolitics=updateSpeciesPolitics(r.id,r.speciesPolitics,r);verify(r.social);}for(const key of ['education','healthcare','livingStandard'] as const)assert.ok(r.social[key]>initial.social[key]);assert.ok(r.social.inequality<initial.social.inequality);assert.ok(r.social.education-initial.social.education<6);console.log('SOCIAL INVEST240',JSON.stringify(r.social));
});
test('240개월 긴축·고실업은 사회 악화와 종족 불만 축적',()=>{
  let r=neutral();const initial=structuredClone(r);for(const key of ['healthcare','welfare','security'] as const)r=budget(r,key,-r.fiscal.baselineBudgetPolicy[key]);r.economy.unemployment=18;r.economy.growth=-2;r.economy.inflation=5;for(let i=0;i<240;i++){r.population=updatePopulation(r.population,r.economy,r.fiscal,r.social);r.social=updateSocialState(r.id,r);r.speciesPolitics=updateSpeciesPolitics(r.id,r.speciesPolitics,r);verify(r.social);}for(const key of ['healthcare','livingStandard','publicSafety'] as const)assert.ok(r.social[key]<initial.social[key]);assert.ok(r.social.inequality>initial.social.inequality);assert.ok(r.speciesPolitics.eagle!.satisfaction<initial.speciesPolitics.eagle!.satisfaction);console.log('SOCIAL AUSTERITY240',JSON.stringify({social:r.social,politics:r.speciesPolitics.eagle}));
});
