import { calculateCrisisResilience, calculateCrisisSeverity, crisesFor, crisisOwner } from './crisis';
import { crisisDefinitions } from './crisisConfig';
import type { ActiveCrisisState, CrisisType, EventContext, EventEffect, GameEventDefinition } from './types';
export const contextCrisis=(c:EventContext,types?:CrisisType[])=>crisesFor(c.game.world,c.jurisdiction).filter(x=>(!c.crisisId||x.id===c.crisisId)&&(!types||types.includes(x.type))).sort((a,b)=>b.severity-a.severity||a.id.localeCompare(b.id))[0];
const wetland=(c:EventContext)=>(c.runtime.population.species.duck?.population??0)/Math.max(1,c.runtime.population.total)>.03;
export function crisisAidPartner(c:EventContext):string|undefined {
 const owner=crisisOwner(c.game.world,c.jurisdiction)!;
 return Object.values(c.game.world.diplomacy?.relations??{}).filter(r=>[r.countryA,r.countryB].includes(owner)&&r.relations>=35&&r.recognizedAbyB&&r.recognizedBbyA&&!r.sanctionsAtoB&&!r.sanctionsBtoA).map(r=>r.countryA===owner?r.countryB:r.countryA).filter(id=>c.game.world.countries[id]&&!Object.values(c.game.world.warfare?.wars??{}).some(w=>w.status!=='resolved'&&((w.attackers.includes(owner)&&w.defenders.includes(id))||(w.defenders.includes(owner)&&w.attackers.includes(id))))).sort()[0];
}
function trigger(id:string,type:CrisisType,title:string,description:string,eligible:(c:EventContext)=>boolean=()=>true):GameEventDefinition {
 const def=crisisDefinitions[type];return {id,title,description,category:def.category==='disaster'?'disaster':'social',tone:'negative',baseMonthlyChance:.004,cooldownMonths:24,tags:['crisis',type],nonPlayerChoiceId:'balance',
 eligible:c=>eligible(c)&&!crisesFor(c.game.world,c.jurisdiction).some(x=>x.type===type),
 calculateChance:c=>.004*(1+(type==='corridor_icing'&&[12,1,2].includes(c.game.date.month)?2:0)+(type==='reed_fire'?(wetland(c)?1:0)+([6,7,8].includes(c.game.date.month)?1:0)+(crisesFor(c.game.world,c.jurisdiction).some(x=>x.type==='wetland_drought')?4:0):0))*(1-calculateCrisisResilience(c.runtime)[def.resilience]/500),
 severity:c=>c.runtime.social.healthcare<35||c.runtime.social.publicSafety<35?3:2,
 choices:['invest','balance','restrict'].map((choice,i)=>({id:choice,label:['긴급 대응 편대 확대','취약 둥지권 우선 대응','최소 운용 유지'][i],preview:['대응 비용 증가 · 피해 감소 · 작업 비행 축소','중간 비용 · 제한적 보호','낮은 초기 비용 · 더 큰 후속 피해'][i],effects:(c,s)=>({immediate:[{kind:'treasury',amount:-c.runtime.economy.gdp*[.002,.0008,.0001][i]},{kind:'start_crisis',crisisType:type,severity:calculateCrisisSeverity(c.game,c.jurisdiction,type,s),sourceEventId:id,protection:[.4,.2,0][i],activityReduction:[.006,.002,0][i]}]})}))};
}
function response(id:string,title:string,description:string,types?:CrisisType[],extra:(c:EventContext,crisis:ActiveCrisisState)=>boolean=()=>true,mode:'regular'|'field'|'aid'|'end'='regular'):GameEventDefinition {
 return {id,title,description,category:'social',tone:mode==='aid'||mode==='end'?'positive':'mixed',baseMonthlyChance:.015,cooldownMonths:18,tags:['crisis-response'],crisisEvent:true,nonPlayerChoiceId:'balance',
 eligible:c=>{const x=contextCrisis(c,types);return !!x&&extra(c,x)&&(mode!=='aid'||!!crisisAidPartner(c));},calculateChance:()=>.015,severity:c=>contextCrisis(c,types)?.severity!>=75?3:2,
 choices:['invest','balance','restrict'].map((choice,i)=>({id:choice,label:(mode==='field'?['현장 지휘를 강화한다','중앙 지휘체계를 유지한다','지역 대응에 맡긴다']:mode==='aid'?['지원 편대를 수락한다','공동 지원을 조정한다','지원을 정중히 사양한다']:mode==='end'?['둥지권 복구 완료를 확인한다','잔여 취약 횃대를 점검한다','지역 점검을 계속한다']:['대응·복구 예산 확대','핵심 둥지권 우선 지원','기존 대응 예산 유지'])[i],preview:mode==='aid'?(i===2?'별도 관계 페널티 없음':'국고·회복 지원 · 외교관계 개선'):mode==='field'&&i===0?'회복·지지도 개선 · 2개월 지도자 노출 증가':'추가 비용과 복구 속도 사이의 균형',effects:c=>{
  const x=contextCrisis(c,types);if(!x)return {immediate:[]};const effects:EventEffect[]=[];
  if(mode==='aid'){const partner=crisisAidPartner(c);if(partner&&i<2)effects.push({kind:'treasury',amount:c.runtime.economy.gdp*.001},{kind:'crisis_recovery',crisisId:x.id,value:[18,10][i],aid:true},{kind:'diplomacy',targetId:partner,relations:3,trust:1});}
  else {effects.push({kind:'treasury',amount:-c.runtime.economy.gdp*[.0015,.0005,0][i]},{kind:'crisis_recovery',crisisId:x.id,value:[18,8,1][i]},{kind:'governance',metric:'approval',delta:[.6,.2,0][i]});if(mode==='field')effects.push({kind:'leader_risk',value:[12,-5,0][i],months:2});}
  return {immediate:effects};
 }}))};
}
export const crisisEventDefinitions:readonly GameEventDefinition[]=[
 trigger('reed-fire','reed_fire','갈대밭 대형 화재','건조한 갈대밭에 불길이 번져 습지 둥지권과 급수 편대가 위협받고 있습니다. 비행 통제와 대응 범위를 결정해야 합니다.'),
 trigger('corridor-icing','corridor_icing','고고도 비행회랑 결빙','고고도 비행회랑이 얼어 화물·군수 편대의 출발이 지연됩니다. 우회 횃대와 관제 지원을 배분해야 합니다.'),
 trigger('respiratory-outbreak','respiratory_outbreak','계절성 조류 호흡기 유행','공동 횃대에서 호흡기 유행이 확인되었습니다. 임시 검역 둥지 확보와 작업 비행 유지의 균형이 필요합니다.'),
 trigger('wetland-contamination','wetland_contamination','습지 급수 둥지 오염','습지 급수 둥지의 수질 악화로 무리 이동과 먹이 공급이 차질을 빚고 있습니다. 정화 편대와 의료 대응을 준비해야 합니다.',wetland),
 response('storm-warning','전국 비행경보','폭풍 피해가 계속되는 가운데 경보 범위를 조정해야 합니다. 현장 지휘는 복구를 돕지만 지도자의 노출을 늘립니다.',['great_storm'],()=>true,'field'),
 response('storm-reconstruction','폭풍 피해 복구','폐쇄된 비행회랑과 피난 횃대를 복구할 순서를 정해야 합니다. 추가 복구비와 정상 운항 재개의 균형을 검토합니다.',['great_storm']),
 response('cliff-reinforcement','둥지 절벽 긴급보강','붕괴 둥지권의 임시 횃대 체류가 이어지고 있습니다. 절벽 고정과 둥지권 재건에 필요한 자원을 결정해야 합니다.',['nest_cliff_failure']),
 response('drought-water-plan','습지 급수 비상계획','급수 편대의 운항 여력이 줄었습니다. 오리 무리의 서식권을 보호하기 위한 물길 복구와 비행 지원을 검토합니다.',['wetland_drought','reed_fire']),
 response('grain-release','국가 곡물비축 방출','씨앗 공급과 곡물 수송편대의 차질이 이어집니다. 먹이 비축 방출과 재배 둥지 복구에 재원을 배분할 필요가 있습니다.',['seed_blight','wetland_drought']),
 response('quarantine-perches','임시 검역 횃대 설치','질병 위기의 확산을 줄이기 위해 검역 횃대가 필요합니다. 공동 비행을 줄이는 대신 의료 둥지의 대응 여력을 확보합니다.',['respiratory_outbreak','feather_mite_outbreak','wetland_contamination']),
 response('medical-nest-capacity','의료 둥지 포화','치료 둥지와 휴식 횃대의 이용이 집중되고 있습니다. 의료 대응 편대를 늘릴지 핵심 둥지권에 집중할지 결정해야 합니다.',['respiratory_outbreak','feather_mite_outbreak']),
 response('mite-control','깃털 진드기 방제작전','공동 횃대 소독과 깃갈이 휴식 지원을 계속해야 합니다. 무리의 작업 비행 부담과 지속 방제 비용을 함께 검토합니다.',['feather_mite_outbreak']),
 response('disease-slowdown','질병 확산 둔화','검역 둥지와 의료 편대가 확산을 통제하고 있습니다. 대응을 유지하거나 잔여 취약 둥지권에 지원을 집중할 수 있습니다.',['respiratory_outbreak','feather_mite_outbreak','wetland_contamination'],(_c,x)=>x.recoveryProgress>=50),
 response('international-rescue','국제 구조편대 지원','우호국 구조편대가 피해 둥지권 지원을 제안했습니다. 공동 운용을 수락하면 복구 자원과 비행 협력이 늘어납니다.',undefined,(_c,x)=>x.category==='disaster'&&x.severity>=50,'aid'),
 response('international-grain','국제 곡물지원','우호국이 곡물 수송편대를 제안했습니다. 씨앗과 급수 둥지의 공급 부담을 줄이고 공동 복구에 도움을 받을 수 있습니다.',['seed_blight','wetland_drought'],()=>true,'aid'),
 response('crisis-recovery-budget','대규모 복구예산 논쟁','위기 대응이 여러 달 이어지며 복구 예산의 우선순위가 논쟁입니다. 현장 대응과 중앙 지휘의 비용·노출 균형을 정해야 합니다.',undefined,(_c,x)=>x.elapsedMonths>=2,'field'),
 response('crisis-end-declaration','위기 종료 선언','주요 둥지권 복구가 마무리되어 잔여 취약 횃대 점검이 필요합니다. 마지막 대응을 정리하고 정상 운영을 준비합니다.',undefined,(_c,x)=>x.recoveryProgress>=80,'end'),
];
