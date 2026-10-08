import {withGameRandom} from './randomState';
import {synchronizePolicySchedules} from './policySchedule';
import { collectHistory } from './history';
import {dissolveCountry} from './countryDissolution';
import {sovereignTerritories} from './territory';
import { synchronizeGovernmentAI } from './aiState';
import { parentReferendumResponse } from './strategicParent';
import { inheritSplitCrises, recordCrisisTerritoryChange } from './crisis';
import { synchronizeMilitary } from './military';
import { synchronizeDiplomacy } from './diplomacy';
import { createInternalConflict } from './conflict';
import { secessionConfig as config, nationNames } from './secessionConfig';
import { createSecessionState } from './secessionInitial';
import { controlledRegionId, refreshCountryAggregates } from './runtime';
import { appendGameLog } from './logs';
import type { EventRuntime, GameState, Jurisdiction, PopulationState, SecessionAction, SecessionMovementState, SecessionPhase, SpeciesId, WorldState } from './types';
const clamp=(n:number)=>Math.min(100,Math.max(0,n));
export function movementRuntime(game:GameState,j:Jurisdiction):EventRuntime {
  const r=j.kind==='region'?game.world.regions[j.id]:game.world.countries[j.id];
  if(!r?.social||!r.governance||!r.speciesPolitics)throw new Error('직접 운영하는 분리주의 관할이 아닙니다.');
  return {...r,social:r.social,governance:r.governance,speciesPolitics:r.speciesPolitics};
}
function store(game:GameState,j:Jurisdiction,r:EventRuntime):GameState {
  const world:WorldState=j.kind==='region'?{...game.world,regions:{...game.world.regions,[j.id]:{...game.world.regions[j.id],...r}}}:{...game.world,countries:{...game.world.countries,[j.id]:r}};
  return {...game,world:refreshCountryAggregates(world)};
}
export function updateWorldSecession(game:GameState):GameState {
  const tick=(r:typeof game.world.countries[string])=>({...r,secession:Object.fromEntries(Object.entries(r.secession??{}).map(([id,m])=>[id,{...m,
    monthsInPhase:m.monthsInPhase+1,monthsActive:m.monthsActive+(m.phase!=='inactive'&&m.phase!=='completed'?1:0),
    referendumScheduledInMonths:m.referendumScheduledInMonths===null?null:Math.max(0,m.referendumScheduledInMonths-1)}]))});
  return {...game,world:{...game.world,countries:Object.fromEntries(Object.entries(game.world.countries).map(([id,r])=>[id,r.simulationMode==='aggregate_regions'?r:tick(r)])),
    regions:Object.fromEntries(Object.entries(game.world.regions).map(([id,r])=>[id,r.simulationRole==='administrative'?r:{...r,...tick(r)}]))}};
}
export function canOrganize(r:EventRuntime,id:SpeciesId):boolean {
  const m=r.secession?.[id],p=r.speciesPolitics[id];
  return !!m&&m.phase==='inactive'&&!!p&&p.autonomyDemand>=config.organizingAutonomy&&p.independenceSentiment>=config.organizingIndependence;
}
export function canRequestReferendum(r:EventRuntime,id:SpeciesId):boolean {
  const m=r.secession?.[id],p=r.speciesPolitics[id];
  return !!m&&m.phase==='autonomy_campaign'&&m.monthsInPhase>=config.campaignMonths&&m.monthsActive>=config.minimumActiveMonths&&!!p&&p.autonomyDemand>=config.referendumAutonomy&&p.independenceSentiment>=config.referendumIndependence;
}
export function canDeclareUnilaterally(game:GameState,r:EventRuntime,id:SpeciesId):boolean {
  const m=r.secession?.[id],p=r.speciesPolitics[id];
  return !!m&&['autonomy_campaign','referendum_campaign','unilateral_crisis'].includes(m.phase)&&m.monthsActive>=config.minimumActiveMonths&&m.lastRefusalTurn!==null&&game.turn-m.lastRefusalTurn<=config.refusalWindow&&!!p&&p.independenceSentiment>=config.unilateralIndependence&&p.autonomyDemand>=config.unilateralAutonomy&&p.satisfaction<=config.unilateralSatisfaction&&r.governance.integration<=config.unilateralIntegration;
}
export function calculateReferendumSupport(game:GameState,j:Jurisdiction,id:SpeciesId,random:()=>number):number {
  const r=movementRuntime(game,j),p=r.speciesPolitics[id]!,m=r.secession?.[id];
  const roll=random();if(!Number.isFinite(roll)||roll<0||roll>=1)throw new RangeError('분리주의 난수는 0 이상 1 미만이어야 합니다.');
  const recent=game.events.history.some(e=>e.jurisdiction.kind===j.kind&&e.jurisdiction.id===j.id&&game.turn-e.turn<=12&&/petition|assembly|protest|secession/.test(e.eventId));
  return clamp(p.independenceSentiment*.8+p.autonomyDemand*.15+(50-p.satisfaction)*.12+(50-r.governance.integration)*.12+(recent?2:0)+(m?.lastRefusalTurn!==null&&m?.lastRefusalTurn!==undefined?1:0)+(roll-.5)*10);
}
export function centralResponse(game:GameState,j:Jurisdiction,id:SpeciesId,strategic=false):'approve'|'concede'|'refuse' {
  if(strategic)return parentReferendumResponse(game,j,id);
  const r=movementRuntime(game,j),p=r.speciesPolitics[id]!;
  if(p.independenceSentiment>=80&&r.governance.integration<=35)return 'refuse';
  return p.independenceSentiment>=50?'approve':'concede';
}
function applySecessionActionCore(game:GameState,j:Jurisdiction,id:SpeciesId,action:SecessionAction,random:()=>number= Math.random):GameState {
  let r=movementRuntime(game,j);const old=r.secession?.[id];if(!old)throw new Error('분리주의 운동 상태가 없습니다.');
  let m:SecessionMovementState={...old};const phase=(value:SecessionPhase)=>{m={...m,phase:value,monthsInPhase:0};};
  const p=r.speciesPolitics[id]!;
  if(action==='organize'){if(!canOrganize(r,id))throw new Error('자치운동 시작 조건 미충족');phase('organizing');}
  else if(action==='charter'){if(m.phase!=='organizing'||m.monthsInPhase<config.charterMonths)throw new Error('헌장 제출 최소 기간 미충족');phase('autonomy_campaign');}
  else if(action==='request'){if(!canRequestReferendum(r,id))throw new Error('주민투표 운동 최소 조건 미충족');phase('referendum_campaign');}
  else if(action==='expand'||action==='concede'){
    m.grantedAutonomy=clamp(m.grantedAutonomy+(action==='expand'?20:7));m.lastNegotiationTurn=game.turn;
    r={...r,fiscal:{...r.fiscal,treasury:Math.max(0,r.fiscal.treasury-r.economy.gdp*(action==='expand'?.001:.0003))},
      governance:{...r.governance,integration:clamp(r.governance.integration-(action==='expand'?1:.3))},
      speciesPolitics:{...r.speciesPolitics,[id]:{...p,satisfaction:clamp(p.satisfaction+(action==='expand'?5:2)),autonomyDemand:clamp(p.autonomyDemand-(action==='expand'?6:2)),independenceSentiment:clamp(p.independenceSentiment-1)}}};
    const majority=Object.values(r.population.species).sort((a,b)=>b.population-a.population)[0]?.speciesId;
    if(majority&&majority!==id){const majorityPolitics=r.speciesPolitics[majority]!;r={...r,speciesPolitics:{...r.speciesPolitics,[majority]:{...majorityPolitics,satisfaction:clamp(majorityPolitics.satisfaction-.3)}}};}
    if(m.phase==='referendum_campaign')phase('autonomy_campaign');
  }else if(action==='refuse'){
    m.lastRefusalTurn=game.turn;m.lastNegotiationTurn=game.turn;
    r={...r,speciesPolitics:{...r.speciesPolitics,[id]:{...p,satisfaction:clamp(p.satisfaction-4),autonomyDemand:clamp(p.autonomyDemand+4),independenceSentiment:clamp(p.independenceSentiment+3)}}};
  }else if(action==='withdraw'){
    if(!['autonomy_campaign','referendum_campaign'].includes(m.phase))throw new Error('철회할 청원이 없습니다.');
    if(m.phase==='referendum_campaign')phase('autonomy_campaign');
    m.lastNegotiationTurn=game.turn;
  }else if(action==='approve'){
    if(m.phase!=='referendum_campaign')throw new Error('주민투표 요구 절차가 필요합니다.');
    phase('referendum_scheduled');m.referendumScheduledInMonths=config.ballotDelay;
  }else if(action==='vote'){
    if(m.phase!=='referendum_scheduled'||m.referendumScheduledInMonths!==0)throw new Error('주민투표 예정일이 아닙니다.');
    const yesShare=calculateReferendumSupport(game,j,id,random);m.lastReferendumResult={date:{...game.date},yesShare,passed:yesShare>50};m.referendumScheduledInMonths=null;
    phase(yesShare>50?'transition':'autonomy_campaign');
    game=appendGameLog(game,{category:'political',type:'event',message:`${nationNames[id]} 독립 주민투표 ${yesShare>50?'가결':'부결'} · 찬성 ${yesShare.toFixed(1)}%`});
  }else if(action==='declare'){
    if(!canDeclareUnilaterally(game,r,id))throw new Error('일방 독립 위기 조건 미충족');phase('unilateral_crisis');
  }else if(action==='agreement'){
    if(m.phase!=='transition')throw new Error('독립 이행 단계가 아닙니다.');
    m.lastNegotiationTurn=game.turn;
  }else if(action==='found'){
    if(m.phase!=='transition'||!m.lastReferendumResult?.passed||m.monthsInPhase<config.transitionMonths)throw new Error('독립 이행 기간 미충족');
  }else if(action==='celebrate'){
    if(m.phase!=='completed')throw new Error('독립을 먼저 완료해야 합니다.');
  }
  const next=store(game,j,{...r,secession:{...r.secession,[id]:m}});
  return action==='found'||action==='declare'?createBreakawayCountry(next,j,id,action==='declare'):next;
}
function splitPopulation(population:PopulationState,ratios:Partial<Record<SpeciesId,number>>):[PopulationState,PopulationState] {
  const parent=structuredClone(population),child=structuredClone(population);
  for(const p of Object.values(population.species)){
    const share=ratios[p.speciesId]??0,amount=Math.round(p.population*share),a=parent.species[p.speciesId]!,b=child.species[p.speciesId]!;
    a.population=p.population-amount;b.population=amount;
    for(const field of ['birthsLastMonth','deathsLastMonth','migrationLastMonth'] as const){b[field]=Math.round(p[field]*share);a[field]=p[field]-b[field];}
  }
  for(const pop of [parent,child]){const entries=Object.values(pop.species);pop.total=entries.reduce((s,p)=>s+p.population,0);pop.birthsLastMonth=entries.reduce((s,p)=>s+p.birthsLastMonth,0);pop.deathsLastMonth=entries.reduce((s,p)=>s+p.deathsLastMonth,0);pop.netMigrationLastMonth=entries.reduce((s,p)=>s+p.migrationLastMonth,0);}
  return [parent,child];
}
/** 공개 생성 API도 정치 절차와 최소 기간을 검증합니다. */
function createBreakawayCountryCore(game:GameState,j:Jurisdiction,speciesId:SpeciesId,disputed=false):GameState {
  if(game.gameOverReason||!game.player.alive)throw new Error('종료 후에는 국가를 생성할 수 없습니다.');
  const source=movementRuntime(game,j),movement=source.secession?.[speciesId];
  if(!movement||(disputed?movement.phase!=='unilateral_crisis'||!canDeclareUnilaterally(game,source,speciesId):movement.phase!=='transition'||!movement.lastReferendumResult?.passed||movement.monthsInPhase<config.transitionMonths))throw new Error('독립 정치 절차가 완료되지 않았습니다.');
  const parentCountryId=j.kind==='region'?game.world.regions[j.id].ownerCountryId:j.id;
  let suffix=1;while(game.world.countries[`${speciesId}-republic-${suffix}`]||game.history?.countries[`${speciesId}-republic-${suffix}`]||game.world.retiredCountryIdentities?.[`${speciesId}-republic-${suffix}`]||(j.kind==='country'&&game.world.regions[`${speciesId}-nest-${suffix}`]))suffix++;
  const countryId=`${speciesId}-republic-${suffix}`,base=nationNames[speciesId],name=Object.values(game.world.countries).some(c=>c.identity?.name===base)?`${base} ${suffix}`:base;
  const regionId=j.kind==='region'?j.id:`${speciesId}-nest-${suffix}`;
  let parent=source,child=structuredClone(source);
  if(j.kind==='country'){
    const p=source.speciesPolitics[speciesId]!,mainRatio=config.majorityTransferMin+config.majorityTransferRange*(p.independenceSentiment*.6+p.autonomyDemand*.4)/100;
    const ratios=Object.fromEntries(Object.keys(source.population.species).map(id=>[id,id===speciesId?mainRatio:config.minorityTransfer]));
    const [parentPopulation,childPopulation]=splitPopulation(source.population,ratios);const share=source.population.total>0?childPopulation.total/source.population.total:0;
    if(share<=0||share>=1)throw new Error('분리할 인구가 부족합니다.');
    parent=structuredClone(source);parent.population=parentPopulation;child.population=childPopulation;
    for(const id of Object.keys(source.economy.industries) as (keyof typeof source.economy.industries)[]){const output=source.economy.industries[id].output;child.economy.industries[id].output=output*share;parent.economy.industries[id].output=output-child.economy.industries[id].output;}
    for(const r of [parent,child])r.economy.gdp=Object.values(r.economy.industries).reduce((s,i)=>s+i.output,0);
    for(const key of ['treasury','debt','monthlyBalance'] as const){child.fiscal[key]=source.fiscal[key]*share;parent.fiscal[key]=source.fiscal[key]-child.fiscal[key];}
    for(const key of ['incomeTax','corporateTax','consumptionTax','total'] as const){child.fiscal.revenue[key]=source.fiscal.revenue[key]*share;parent.fiscal.revenue[key]=source.fiscal.revenue[key]-child.fiscal.revenue[key];}
    for(const key of ['programTotal','interest','total'] as const){child.fiscal.expenditure[key]=source.fiscal.expenditure[key]*share;parent.fiscal.expenditure[key]=source.fiscal.expenditure[key]-child.fiscal.expenditure[key];}
    for(const key of Object.keys(source.fiscal.expenditure.categories) as (keyof typeof source.fiscal.expenditure.categories)[]){child.fiscal.expenditure.categories[key]=source.fiscal.expenditure.categories[key]*share;parent.fiscal.expenditure.categories[key]=source.fiscal.expenditure.categories[key]-child.fiscal.expenditure.categories[key];}
    if(source.fiscal.expenditure.emergency!==undefined){child.fiscal.expenditure.emergency=source.fiscal.expenditure.emergency*share;parent.fiscal.expenditure.emergency=source.fiscal.expenditure.emergency-child.fiscal.expenditure.emergency;}
    parent.secession={...parent.secession,[speciesId]:{...movement,phase:'completed',monthsInPhase:0,createdCountryId:countryId}};
  }
  const leading=child.speciesPolitics[speciesId]!;
  child.speciesPolitics={...child.speciesPolitics,[speciesId]:{...leading,satisfaction:clamp(leading.satisfaction+8),autonomyDemand:10,independenceSentiment:5}};
  const previousMovements=child.secession;
  child.secession=createSecessionState(regionId,countryId,child.population);
  for(const id of Object.keys(child.secession) as SpeciesId[])child.secession[id]={...child.secession[id]!,grantedAutonomy:previousMovements?.[id]?.grantedAutonomy??child.secession[id]!.grantedAutonomy};
  child.secession[speciesId]={...movement,parentCountryId:countryId,jurisdictionId:regionId,phase:'completed',monthsInPhase:0,referendumScheduledInMonths:null,grantedAutonomy:100,createdCountryId:countryId};
  const region={...child,id:regionId,ownerCountryId:countryId,regionIdentity:j.kind==='region'?game.world.regions[regionId].regionIdentity:{id:regionId,name:`${base.replace('공화국','')} 북부 둥지권`,primarySpeciesId:speciesId,createdDate:{...game.date},isDynamic:true}};
  const {social:_social,governance:_governance,speciesPolitics:_politics,secession:_secession,...aggregate}=child;
  const country={...aggregate,id:countryId,simulationMode:'aggregate_regions' as const,identity:{id:countryId,name,governmentLabel:'대통령제 공화국',primarySpeciesId:speciesId,foundedDate:{...game.date},originCountryId:parentCountryId,status:disputed?'disputed_breakaway' as const:'established' as const,isDynamic:true,territorialDispute:disputed?'negotiating' as const:'none' as const}};
  const world=synchronizeMilitary(synchronizeDiplomacy(refreshCountryAggregates({...game.world,countries:{...game.world.countries,...(j.kind==='country'?{[j.id]:parent}:{}),[countryId]:country},regions:{...game.world.regions,[regionId]:region}})));
  const controlled=controlledRegionId(game)===regionId;
  let next={...game,world,player:controlled?{...game.player,controlledCountryId:countryId,controlledRegionId:null,career:{...game.player.career,office:'president' as const}}:game.player};
  if(j.kind==='country')next=inheritSplitCrises(next,j,{kind:'region',id:regionId},region.population.total/(region.population.total+parent.population.total));
  next={...next,world:synchronizeGovernmentAI(next.world)};
  // Ownership, not the initial federation's four-state definition, determines
  // whether a parent government still has a sovereign jurisdiction.
  if(!sovereignTerritories(next.world,parentCountryId).length){
    next=dissolveCountry(next,parentCountryId,{successorId:countryId});
    if(disputed)next={...next,world:{...next.world,countries:{...next.world.countries,[countryId]:{...next.world.countries[countryId],identity:{...next.world.countries[countryId].identity!,status:'established',territorialDispute:'none'}}}}};
  }
  const withConflict=disputed&&next.world.countries[parentCountryId]?createInternalConflict(next,parentCountryId,countryId,source.speciesPolitics[speciesId]!.independenceSentiment):next;
  return appendGameLog(recordCrisisTerritoryChange(game,withConflict),{category:'political',type:'event',message:`${name} 수립 · ${disputed?'일방 독립, 영토 분쟁 지속':'주민투표와 이행 절차에 따른 독립'}`});
}

export function createBreakawayCountry(...args:Parameters<typeof createBreakawayCountryCore>):GameState { return synchronizePolicySchedules(args[0],collectHistory(args[0],createBreakawayCountryCore(...args))); }

export function applySecessionAction(...args:Parameters<typeof applySecessionActionCore>):GameState { return withGameRandom(args[0],(g,r)=>collectHistory(g,applySecessionActionCore(g,args[1],args[2],args[3],args[4]??r('secession')))); }



