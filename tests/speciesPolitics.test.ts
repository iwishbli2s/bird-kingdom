import { updateSocialState } from '../src/game/social';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGame, advanceMonth } from './legacyEngine';
import { aggregateFederationSpeciesPolitics, calculateAutonomyTarget, calculateIndependenceTarget, calculateInfluenceTarget, calculateSatisfactionTarget, representationGap, updateSpeciesPolitics, updateWorldSpeciesPolitics } from '../src/game/speciesPolitics';
import { getSpeciesPoliticalBaseline, initialSpeciesPolitics } from '../src/game/speciesPoliticsConfig';
import { speciesDefinitions } from '../src/game/populationConfig';
import { createInitialPopulation, updatePopulation } from '../src/game/population';
import { createSeededRandom } from '../src/game/random';
import { politicalMetricCategory } from '../src/components/speciesPoliticsLabels';
import type { SpeciesPoliticsContext } from '../src/game/speciesPolitics';
import type { SpeciesPoliticsState } from '../src/game/types';

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const eagle = () => createGame('pigeon', 'eagle-state').world.regions['eagle-state'];
const definition = speciesDefinitions.find(d => d.id === 'eagle')!;
const baseline = getSpeciesPoliticalBaseline('eagle-state', 'eagle');
function neutral(): SpeciesPoliticsContext { const r = eagle(); return { ...r, economy: { ...r.economy, growth: 2, unemployment: 5, inflation: 2 }, social: { ...r.social, livingStandard: 50, education: 50, healthcare: 50, publicSafety: 50, inequality: 50 } }; }
function freeze<T>(value: T): T { if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze); } return value; }
function verify(politics: SpeciesPoliticsState) {
  for (const p of Object.values(politics)) {
    for (const key of ['satisfaction', 'politicalInfluence', 'autonomyDemand', 'independenceSentiment'] as const) assert.ok(Number.isFinite(p[key]) && p[key] >= 0 && p[key] <= 100);
    for (const [key, limit] of [['satisfactionDeltaLastMonth', 2], ['influenceDeltaLastMonth', .5], ['autonomyDeltaLastMonth', 1], ['independenceDeltaLastMonth', .5]] as const) assert.ok(Number.isFinite(p[key]) && Math.abs(p[key]) <= limit + 1e-10);
  }
}
for (const [id, expected] of Object.entries({ sparrow: { sparrow: [68,63,5,2], crow: [61,17,20,7], swallow: [65,12,14,4], magpie: [64,10,12,4] }, 'pigeon-state': { pigeon: [70,72,6,2], eagle: [61,7,16,6], owl: [65,10,12,4], duck: [64,11,11,4] }, 'eagle-state': { eagle: [64,72,32,14], pigeon: [60,15,7,3], owl: [63,8,10,4], duck: [62,7,10,4] }, 'owl-state': { owl: [69,68,18,6], pigeon: [63,18,7,3], eagle: [60,5,11,4], duck: [64,9,9,3] }, 'duck-state': { duck: [67,72,21,8], pigeon: [61,15,7,3], eagle: [59,5,11,4], owl: [64,8,9,3] } })) {
  test(`${id} 모든 인구 종족의 초기 네 정치값·월 변화0 정확`, () => {
    const w = createGame('sparrow').world; const r = id === 'sparrow' ? w.countries.sparrow : w.regions[id]; const p = r.speciesPolitics!;
    assert.deepEqual(Object.keys(p).sort(), Object.keys(r.population.species).sort());
    for (const [species, values] of Object.entries(expected)) { const entry = p[species as keyof typeof p]!; assert.deepEqual([entry.satisfaction, entry.politicalInfluence, entry.autonomyDemand, entry.independenceSentiment], values); assert.deepEqual([entry.satisfactionDeltaLastMonth, entry.influenceDeltaLastMonth, entry.autonomyDeltaLastMonth, entry.independenceDeltaLastMonth], [0,0,0,0]); }
    verify(p); assert.notEqual(p, initialSpeciesPolitics[id]);
  });
}
test('연방은 정치 authoritative state를 저장하지 않으며 인구와 분리', () => {
  const g = createGame('sparrow'); assert.equal('speciesPolitics' in g.world.countries.pigeon, false); assert.equal('satisfaction' in g.world.regions['eagle-state'].population.species.eagle!, false);
  const a = g.world.regions['eagle-state'].speciesPolitics; const b = eagle().speciesPolitics; a.eagle!.satisfaction = 0; assert.equal(b.eagle!.satisfaction, 64);
});
test('중립 만족도 목표는 구조 기준값', () => near(calculateSatisfactionTarget(baseline, definition, neutral()), 64));
test('호황은 목표 상승, 실업·물가 상승은 목표 하락이며 실업>물가>성장', () => {
  const c = neutral(); const target = (growth: number, unemployment: number, inflation: number) => calculateSatisfactionTarget(baseline, definition, { ...c, economy: { ...c.economy, growth, unemployment, inflation } });
  assert.ok(target(6, 2, 2) > 64); assert.ok(target(2, 10, 2) < 64); assert.ok(target(2, 5, 7) < 64);
  assert.ok(64-target(2,6,2) > 64-target(2,5,3)); assert.ok(64-target(2,5,3) > target(3,5,2)-64);
});
test('소득·소비 증세는 작은 부담, 법인세는 직접 만족도 효과 없음', () => {
  const c = neutral(); for (const field of ['incomeTaxRate', 'consumptionTaxRate'] as const) { const changed = { ...c, fiscal: { ...c.fiscal, taxPolicy: { ...c.fiscal.taxPolicy, [field]: c.fiscal.taxPolicy[field] + 5 } } }; const t = calculateSatisfactionTarget(baseline, definition, changed); assert.ok(t < 64 && t > 62); }
  assert.equal(calculateSatisfactionTarget(baseline, definition, { ...c, fiscal: { ...c.fiscal, taxPolicy: { ...c.fiscal.taxPolicy, corporateTaxRate: 35 } } }), 64);
});
for (const category of ['welfare', 'healthcare', 'education'] as const) test(`${category} 증액과 삭감이 만족도 목표에 반영`, () => {
  const c = neutral(); for (const sign of [-1,1]) { const changed = { ...c, fiscal: { ...c.fiscal, budgetPolicy: { ...c.fiscal.budgetPolicy, [category]: c.fiscal.budgetPolicy[category] + sign * .5 } } }; near(calculateSatisfactionTarget(baseline,definition,changed),64); const reference=updateSocialState('eagle-state',c); const social=updateSocialState('eagle-state',changed); const effect=calculateSatisfactionTarget(baseline,definition,{...changed,social})-calculateSatisfactionTarget(baseline,definition,{...c,social:reference}); assert.ok(effect*sign>0); }
});
test('예산의 직접 만족도 효과 제거, 국방·산업지원·연구는 직접 만족도 영향 없음', () => {
  const c = neutral(); for (const category of ['defense', 'industrySupport', 'research'] as const) assert.equal(calculateSatisfactionTarget(baseline, definition, { ...c, fiscal: { ...c.fiscal, budgetPolicy: { ...c.fiscal.budgetPolicy, [category]: 5 } } }), 64);
  const t = calculateSatisfactionTarget(baseline, definition, { ...c, fiscal: { ...c.fiscal, budgetPolicy: { ...c.fiscal.budgetPolicy, security: c.fiscal.budgetPolicy.security+1 } } }); near(t,64);
});
test('기존 경제 민감도와 생활수준을 만족도에 사용', () => {
  const c = neutral(); c.economy.unemployment = 10;
  assert.ok(calculateSatisfactionTarget(baseline,{ ...definition, economicSensitivity: 1.2 },c) < calculateSatisfactionTarget(baseline,{ ...definition, economicSensitivity: .7 },c));
  assert.ok(calculateSatisfactionTarget(baseline,definition,{ ...neutral(), social:{ ...c.social, livingStandard:80 } }) >64);
});
test('만족도는 목표의8%로 이동하며 월2포인트 제한 및 실제 delta 기록', () => {
  const r = eagle(); const c = neutral(); c.economy.unemployment=1000; const next=updateSpeciesPolitics(r.id,r.speciesPolitics,c);
  assert.equal(next.eagle!.satisfaction,62); assert.equal(next.eagle!.satisfactionDeltaLastMonth,-2); verify(next);
  const good=updateSpeciesPolitics(r.id,r.speciesPolitics,{ ...neutral(), economy:{ ...c.economy, growth:1000, unemployment:0 } }); assert.equal(good.eagle!.satisfactionDeltaLastMonth,2);
});
test('영향력 목표는 인구비율+고정 bias, 월 이동은 완만', () => {
  near(baseline.influenceBias,7); near(calculateInfluenceTarget(baseline,65),72); near(calculateInfluenceTarget(baseline,60),67);
  const r=eagle(); const p=createInitialPopulation({ eagle:60, pigeon:40 }); const next=updateSpeciesPolitics(r.id,r.speciesPolitics,{ ...r, population:p }); near(next.eagle!.politicalInfluence,71.85);
  assert.equal(calculateInfluenceTarget(baseline,100),100); assert.equal(calculateInfluenceTarget({ ...baseline,influenceBias:-100 },0),0);
});
test('representation gap는 인구비율-영향력, 양수만 자치 압력', () => {
  assert.equal(representationGap(30,15),15); assert.equal(representationGap(30,40),-10);
  const normal=calculateAutonomyTarget(baseline,50,0,60); assert.ok(calculateAutonomyTarget(baseline,50,15,60)>normal); assert.equal(calculateAutonomyTarget(baseline,50,-10,60),normal);
});
test('자치 목표는 낮은 만족도·낮은 통합도에 상승, 높은 만족도·통합도에 감소', () => {
  const t=(s:number,i:number)=>calculateAutonomyTarget(baseline,s,0,i);
  assert.equal(t(50,60),32); assert.ok(t(20,60)>t(35,60)); assert.ok(t(35,60)>t(50,60)); assert.ok(t(70,60)<t(50,60)); assert.ok(t(50,90)<t(50,30));
});
test('자치는 만족도보다 느리고 월1포인트 제한', () => {
  const r=eagle(); r.speciesPolitics.eagle!.satisfaction=0; r.speciesPolitics.eagle!.politicalInfluence=0; r.governance.integration=0;
  const next=updateSpeciesPolitics(r.id,r.speciesPolitics,r); assert.ok(next.eagle!.autonomyDeltaLastMonth>0); assert.ok(next.eagle!.autonomyDeltaLastMonth<=1); verify(next);
});
test('낮은 자치에서는 독립 상승 제한, 높은 자치+낮은 만족은 상승', () => {
  near(calculateIndependenceTarget(baseline,20,30,30,30),14);
  assert.ok(calculateIndependenceTarget(baseline,20,80,30,30)>14); assert.ok(calculateIndependenceTarget(baseline,20,80,30,30)>calculateIndependenceTarget(baseline,70,80,30,30));
});
test('독립 임계 압력은40·60·75 이후 커지고 조건 개선 시 회복', () => {
  const t=(a:number)=>calculateIndependenceTarget(baseline,20,a,15,30);
  assert.ok(t(40)<t(60)&&t(60)<t(75)&&t(75)<t(90));
  assert.ok(calculateIndependenceTarget(baseline,80,20,0,90)<14);
  assert.ok(calculateIndependenceTarget(baseline,20,80,0,30)<calculateIndependenceTarget(baseline,20,80,20,30));
});
test('독립은 느리게 감소하고 월0.5 제한, 극단 target100 가능', () => {
  const r=eagle(); r.speciesPolitics.eagle!.independenceSentiment=90; const next=updateSpeciesPolitics(r.id,r.speciesPolitics,r); assert.ok(next.eagle!.independenceSentiment<90 && next.eagle!.independenceSentiment>=89.5);
  assert.equal(calculateIndependenceTarget(baseline,0,100,100,0),100); verify(next);
});
test('0~100 clamp와 없는 인구 종족을 생성하지 않음', () => {
  const r=eagle(); for(const p of Object.values(r.speciesPolitics)){p.satisfaction=100;p.politicalInfluence=100;p.autonomyDemand=100;p.independenceSentiment=100;}
  const next=updateSpeciesPolitics(r.id,r.speciesPolitics,r);verify(next);assert.equal(next.sparrow,undefined);
});
test('연방 모든 지표·delta는 해당 종족 인구 가중 집계', () => {
  const a=eagle(); const b=eagle(); a.population=createInitialPopulation({eagle:100}); b.population=createInitialPopulation({eagle:300});
  a.speciesPolitics.eagle={speciesId:'eagle',satisfaction:20,politicalInfluence:10,autonomyDemand:40,independenceSentiment:60,satisfactionDeltaLastMonth:1,influenceDeltaLastMonth:.1,autonomyDeltaLastMonth:.2,independenceDeltaLastMonth:.3};
  b.speciesPolitics.eagle={...a.speciesPolitics.eagle,satisfaction:60,politicalInfluence:30,autonomyDemand:80,independenceSentiment:20,satisfactionDeltaLastMonth:-1};
  const p=aggregateFederationSpeciesPolitics([a,b]).eagle!;near(p.satisfaction,50);near(p.politicalInfluence,25);near(p.autonomyDemand,70);near(p.independenceSentiment,30);near(p.satisfactionDeltaLastMonth,-.5);
});
test('집계는 종족 부재·정치 부재·0 인구·빈 주 배열을 안전하게 처리', () => {
  const a=eagle(); const b=eagle(); b.population=createInitialPopulation({duck:10});delete b.speciesPolitics.eagle;
  assert.equal(aggregateFederationSpeciesPolitics([a,b]).eagle!.satisfaction,64);
  assert.deepEqual(aggregateFederationSpeciesPolitics([]),{});
  const zero={population:createInitialPopulation({eagle:0}),speciesPolitics:a.speciesPolitics};assert.equal(aggregateFederationSpeciesPolitics([zero]).eagle!.satisfaction,0);
});
for(const mode of ['sparrow','eagle'] as const) test(`${mode} 플레이에서도 모든 독립 정치 주체 갱신, 연방 비저장`,()=>{
  const g=mode==='sparrow'?createGame('sparrow'):createGame('pigeon','eagle-state');const next=advanceMonth(g,{eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom:()=>.5,electionRandom:()=>0, mortalityRandom:()=>.99});
  assert.notDeepEqual(next.world.countries.sparrow.speciesPolitics,g.world.countries.sparrow.speciesPolitics);
  for(const id of Object.keys(g.world.regions))assert.notDeepEqual(next.world.regions[id].speciesPolitics,g.world.regions[id].speciesPolitics);
  assert.equal('speciesPolitics' in next.world.countries.pigeon,false);
});
test('세계 함수 불변성·정적 baseline 보존·결정론적 재현',()=>{
  const w=freeze(createGame('sparrow').world);const snapshot=structuredClone(w);const next=updateWorldSpeciesPolitics(w);assert.deepEqual(w,snapshot);assert.deepEqual(next,updateWorldSpeciesPolitics(w));
  assert.equal(next.regions['eagle-state'].economy,w.regions['eagle-state'].economy);assert.equal(next.regions['eagle-state'].population,w.regions['eagle-state'].population);
});
test('새 경제·인구로 계산하며 역방향 경제·재정·개인 사망 효과와 정치 로그 없음',()=>{
  const g=createGame('sparrow');const changed=structuredClone(g);changed.world.countries.sparrow.speciesPolitics!.sparrow!.satisfaction=0;
  let economy=0,death=0;const a=advanceMonth(g,{eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom:()=>{economy++;return .5},electionRandom:()=>0, mortalityRandom:()=>{death++;return .99}});const b=advanceMonth(changed,{eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom:()=>.5,electionRandom:()=>0, mortalityRandom:()=>.99});
  assert.deepEqual(a.world.countries.sparrow.economy,b.world.countries.sparrow.economy);assert.deepEqual(a.world.countries.sparrow.fiscal,b.world.countries.sparrow.fiscal);assert.deepEqual(a.world.countries.sparrow.population,b.world.countries.sparrow.population);assert.deepEqual({...a.player,career:undefined},{...b.player,career:undefined});assert.equal(economy,30);assert.equal(death,1);assert.equal(a.logs.length,2);
  assert.deepEqual(a.world.countries.sparrow.speciesPolitics,updateSpeciesPolitics('sparrow',g.world.countries.sparrow.speciesPolitics!,{...a.world.countries.sparrow,governance:g.world.countries.sparrow.governance!}));
});
test('독립 성향100에도 자동 사건·국가 생성·로그 증가 없음',()=>{
  const g=createGame('sparrow');g.world.countries.sparrow.speciesPolitics!.crow!.independenceSentiment=100;const next=advanceMonth(g,{eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom:()=>.5,electionRandom:()=>0, mortalityRandom:()=>.99});assert.deepEqual(Object.keys(next.world.countries).sort(),Object.keys(g.world.countries).sort());assert.equal(next.logs.length,2);assert.equal(next.player.alive,true);
});
test('UI 범주 경계와 연속 소수 정치값 분류',()=>{
  assert.equal(politicalMetricCategory('satisfaction',80),'매우 높음');assert.equal(politicalMetricCategory('satisfaction',64.9),'보통');assert.equal(politicalMetricCategory('autonomyDemand',40),'주의');assert.equal(politicalMetricCategory('independenceSentiment',80),'극심');assert.equal(politicalMetricCategory('independenceSentiment',0),'미미');
});
test('600개월 정상 운영의 정치 범위·완만한 경로·집계·로그 회귀',()=>{
  let g=createGame('sparrow');const rng=createSeededRandom(2030);
  for(let month=0;month<600;month++){g=advanceMonth(g,{eventOccurrenceRandom:()=>.999999,eventOutcomeRandom:()=>.5,economyRandom:rng,electionRandom:()=>0, mortalityRandom:()=>.99});verify(g.world.countries.sparrow.speciesPolitics!);for(const r of Object.values(g.world.regions))verify(r.speciesPolitics);assert.equal(g.world.countries.pigeon.population.total,Object.values(g.world.regions).reduce((sum,r)=>sum+r.population.total,0));}
  for(const r of Object.values(g.world.regions))assert.ok(Object.values(r.speciesPolitics).every(p=>p.independenceSentiment<40));
  assert.equal(g.player.alive,true);assert.deepEqual(Object.keys(g.world.countries).sort(),['pigeon','sparrow']);
  console.log('NORMAL600 eagle:',JSON.stringify(g.world.regions['eagle-state'].speciesPolitics.eagle));
});
test('240개월 재현 가능한 독수리 위기에서 불만→자치→독립 축적',()=>{
  const r=eagle();const start=structuredClone(r.speciesPolitics);r.economy={...r.economy,growth:-6,unemployment:25,inflation:10};r.fiscal={...r.fiscal,taxPolicy:{incomeTaxRate:40,corporateTaxRate:35,consumptionTaxRate:25},budgetPolicy:{...r.fiscal.budgetPolicy,welfare:0,healthcare:0,education:0}};r.governance={...r.governance,integration:30};
  for(let month=0;month<240;month++){r.population=updatePopulation(r.population,r.economy,r.fiscal,r.social);r.social=updateSocialState(r.id,r);r.speciesPolitics=updateSpeciesPolitics(r.id,r.speciesPolitics,r);verify(r.speciesPolitics);}
  const end=r.speciesPolitics.eagle!;assert.ok(end.satisfaction<start.eagle!.satisfaction);assert.ok(end.autonomyDemand>50);assert.ok(end.independenceSentiment>start.eagle!.independenceSentiment);assert.ok(end.independenceSentiment<100);
  console.log('CRISIS240 eagle:',JSON.stringify(end));
});

