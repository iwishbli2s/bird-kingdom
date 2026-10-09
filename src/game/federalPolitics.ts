import {applySecessionAction} from './secession';
import {strategicConflictProfile} from './strategicConflictProfile';
import {calculateConflictCapability,calculateWarSupport} from './conflict';
import {derivedCountryRuntime,refreshCountryAggregates,regionInfo} from './runtime';
import {appendGameLog} from './logs';
import {collectHistory,recordHistoricalEvent,historicalCountryName} from './history';
import type {GameState,SpeciesId,RegionRuntimeState} from './types';
import type {FederalAction,AutonomyDemandLevel,FederalResponse,FederalConfrontationAssessment} from './federalPoliticsTypes';
export const federalActionLabels:Record<FederalAction,string>={criticize:'연방정책 공개 비판',autonomy:'자치권 확대 요구',defy:'연방 지침 거부',renegotiate:'재정·권한 재협상 요구',referendum:'주민투표 요구',confront:'강경 대치 선언',declare:'일방 독립 선언'};
export const federalResponseLabels:Record<FederalResponse,string>={ignore:'대응 유보',negotiate:'협상 제안',partial_concession:'부분 양보',accept:'요구 수용',political_pressure:'정치적 압박',economic_pressure:'경제적 압박',hardline_rejection:'강경 거부'};
export const federalPoliticsConfig={cooldownMonths:3,highRiskCooldownMonths:6,repeatWindowMonths:24,historyLimit:80,weakDemandApprovalCost:1.5} as const;
const clamp=(n:number)=>Math.max(0,Math.min(100,n));
const intensity:Record<FederalAction,number>={criticize:1,autonomy:2,defy:3,renegotiate:1.5,referendum:4,confront:5,declare:7};
export function isFederalState(game:GameState,id:string):boolean {const r=game.world.regions[id];return !!r&&r.ownerCountryId==='pigeon'&&r.simulationRole!=='administrative'&&!!game.world.countries.pigeon;}
export function federalPrimarySpecies(r:RegionRuntimeState):SpeciesId {return Object.values(r.population.species).sort((a,b)=>b.population-a.population)[0].speciesId;}
function state(game:GameState,id:string){if(!isFederalState(game,id))throw new Error('비둘기민주연방 소속 주정부만 사용할 수 있습니다.');return game.world.regions[id];}
function weighted(r:RegionRuntimeState,key:'satisfaction'|'autonomyDemand'|'independenceSentiment') {return Object.values(r.population.species).reduce((sum,p)=>sum+p.population*(r.speciesPolitics[p.speciesId]?.[key]??0),0)/Math.max(1,r.population.total);}
/** Derived assessment only; none of these scores become persistent resources. */
export function assessFederalConfrontation(game:GameState,id:string):FederalConfrontationAssessment {
 const r=state(game,id),g=r.governance,e=r.economy,f=r.fiscal,p=r.speciesPolitics[federalPrimarySpecies(r)]!,m=r.secession?.[p.speciesId];
 const satisfaction=weighted(r,'satisfaction'),autonomy=weighted(r,'autonomyDemand'),independence=weighted(r,'independenceSentiment');
 const politicalBacking=clamp(g.approval*.3+g.stability*.2+satisfaction*.15+autonomy*.15+independence*.1+(100-g.integration)*.1);
 const economicBacking=clamp(35+Math.log1p(e.gdp)*3+e.growth*2-e.unemployment*1.2+Math.min(20,f.treasury/Math.max(1,e.gdp)*100)-Math.min(35,f.debt/Math.max(1,e.gdp)*25));
 const institutionalBacking=clamp(r.social.publicSafety*.45+g.stability*.35+Math.min(10,f.budgetPolicy.security*3)+calculateConflictCapability(r)*.1);
 const phase=m&&m.phase!=='inactive'?m.phase==='organizing'?4:10:0;
 const independenceBacking=clamp(p.independenceSentiment*.5+p.autonomyDemand*.25+(100-p.satisfaction)*.1+independence*.15+phase);
 const overallViability=clamp(politicalBacking*.4+economicBacking*.2+institutionalBacking*.15+independenceBacking*.25);
 const reasonCodes=[g.approval>=65?'popular_governor':'weak_approval',autonomy>=60?'autonomy_mandate':'limited_autonomy_mandate',independence>=60?'separatist_backing':'federal_loyalty',g.stability<40?'domestic_instability':'stable_institutions',f.debt/e.gdp>1?'fiscal_fragility':'fiscal_capacity'];
 return {politicalBacking,economicBacking,institutionalBacking,independenceBacking,overallViability,reasonCodes};
}
export function recentFederalConfrontations(game:GameState,id:string,months=24){return (game.world.federalPolitics?.[id]?.history??[]).filter(h=>game.turn-h.turn<=months).slice().reverse();}
export function evaluateFederalActionSupport(game:GameState,id:string,action:FederalAction){
 const r=state(game,id),a=assessFederalConfrontation(game,id),separatist=['referendum','confront','declare'].includes(action);
 const bySpecies=Object.fromEntries(Object.entries(r.speciesPolitics).map(([species,p])=>[species,clamp((separatist?p.independenceSentiment*.65+p.autonomyDemand*.25:p.autonomyDemand*.65+p.independenceSentiment*.25)+r.governance.approval*.1+(50-p.satisfaction)*.1)])) as Partial<Record<SpeciesId,number>>;
 const publicSupport=Object.values(r.population.species).reduce((s,p)=>s+p.population*(bySpecies[p.speciesId]??0),0)/Math.max(1,r.population.total);
 const repeatCount=recentFederalConfrontations(game,id,federalPoliticsConfig.repeatWindowMonths).filter(h=>h.action===action).length;
 return {publicSupport,bySpecies,repeatCount,effectiveness:1/(1+repeatCount*.8),risk:clamp(intensity[action]*10+(100-a.overallViability)*.5+repeatCount*6),reaction:publicSupport>=60?'긍정적':publicSupport<40?'부정적':'엇갈림'};
}
export function evaluateFederalResponses(game:GameState,id:string,action:FederalAction,level:AutonomyDemandLevel='limited'):Record<FederalResponse,number>{
 const r=state(game,id),a=assessFederalConfrontation(game,id),parent=derivedCountryRuntime(game.world,r.ownerCountryId),g=parent.governance!;
 const members=Object.values(game.world.regions).filter(x=>x.ownerCountryId===parent.id&&x.id!==id&&x.simulationRole!=='administrative');
 const unrest=members.reduce((s,x)=>s+100-x.governance.stability,0)/Math.max(1,members.length);
 const war=Object.values(game.world.warfare?.wars??{}).some(w=>w.status!=='resolved'&&[...w.attackers,...w.defenders].includes(parent.id));
 const crisis=Object.values(game.world.crises?.activeCrises??{}).filter(c=>c.jurisdictionKind==='country'?c.jurisdictionId===parent.id:game.world.regions[c.jurisdictionId]?.ownerCountryId===parent.id).length;
 const fiscalStress=Math.min(25,parent.fiscal.debt/Math.max(1,parent.economy.gdp)*15)+Math.max(0,-parent.fiscal.monthlyBalance)/Math.max(1,parent.economy.gdp)*100;
 const vulnerability=(100-g.stability)*.3+fiscalStress+unrest*.15+(war?18:0)+Math.min(15,crisis*3);
 const blocBacking=Math.min(12,(game.world.statePolitics?.blocs??[]).filter(b=>b.active&&b.purpose==='autonomy'&&b.memberStateIds.includes(id)).reduce((s,b)=>s+b.cohesion*.12,0));
 const leverage=blocBacking+a.overallViability*.6+a.independenceBacking*.3+Math.min(15,r.economy.gdp/Math.max(1,parent.economy.gdp)*30)+calculateConflictCapability(r)*.05+vulnerability;
 const severity=intensity[action]+(action==='autonomy'?{limited:0,substantial:1,maximum:2}[level]:0);
 const history=recentFederalConfrontations(game,id),concessions=history.filter(h=>['accept','partial_concession'].includes(h.response)).length,repression=history.filter(h=>['hardline_rejection','political_pressure','economic_pressure'].includes(h.response)).length;
 const widespread=members.filter(x=>weighted(x,'autonomyDemand')>=60&&weighted(x,'satisfaction')<45).length;
 const profile=strategicConflictProfile(game,parent.id),compromise=widespread*7+Math.min(14,repression*3)+(profile.autonomyTolerance-50)*.15;
 const fatigue=Math.min(15,concessions*4),hardCost=widespread*9+Math.min(18,repression*4)+blocBacking*.4;
 return {ignore:action==='criticize'?48:war&&crisis>1?40:0,negotiate:leverage*.65+10+compromise,partial_concession:leverage-10-severity*2+compromise-fatigue,accept:leverage*1.3-35-severity*2+compromise-fatigue,political_pressure:65-leverage*.55+severity*2-hardCost,economic_pressure:50-leverage*.45+severity*2+(action==='defy'?24:0)-hardCost,hardline_rejection:80-leverage*.8+severity*3-hardCost};
}
export function selectFederalResponse(game:GameState,id:string,action:FederalAction,level:AutonomyDemandLevel='limited'):FederalResponse {
 const scores=evaluateFederalResponses(game,id,action,level);
 if(action==='declare'){scores.accept=-Infinity;scores.partial_concession=-Infinity;scores.ignore=-Infinity;}
 return (Object.entries(scores) as [FederalResponse,number][]).sort((a,b)=>b[1]-a[1])[0][0];
}
export function federalActionBlock(game:GameState,id:string,action:FederalAction):string|null {
 if(!isFederalState(game,id))return '비둘기민주연방 소속 주정부만 사용할 수 있습니다.';
 if(game.gameOverReason||!game.player.alive)return '종료된 게임입니다.';
 if(game.events.pendingEvent)return '사건 선택을 먼저 완료하세요.';
 const remaining=(game.world.federalPolitics?.[id]?.nextActionTurn??0)-game.turn;
 if(remaining>0)return `다음 연방정치 행동까지 ${remaining}개월`;
 const r=state(game,id),phase=r.secession?.[federalPrimarySpecies(r)]?.phase;
 if(action==='referendum'&&['referendum_campaign','referendum_scheduled','transition'].includes(phase??''))return '이미 주민투표 또는 독립 이행 절차가 진행 중입니다.';
 return null;
}
/** Single state-effect boundary, preserving federation aggregates and immutable inputs. */
function updateState(game:GameState,id:string,transform:(r:RegionRuntimeState)=>RegionRuntimeState):GameState {
 return {...game,world:refreshCountryAggregates({...game.world,regions:{...game.world.regions,[id]:transform(game.world.regions[id])}})};
}
export function performFederalAction(game:GameState,id:string,action:FederalAction,level:AutonomyDemandLevel='limited'):GameState {
 if(!Object.hasOwn(federalActionLabels,action)||!['limited','substantial','maximum'].includes(level))throw new Error('알 수 없는 연방정치 행동입니다.');
 const blocked=federalActionBlock(game,id,action);if(blocked)throw new Error(blocked);
 const r=state(game,id),primary=federalPrimarySpecies(r),j={kind:'region' as const,id},assessment=assessFederalConfrontation(game,id),support=evaluateFederalActionSupport(game,id,action),response=selectFederalResponse(game,id,action,level);
 const severity=intensity[action]+(action==='autonomy'?{limited:0,substantial:1,maximum:2}[level]:0),mandate=(support.publicSupport-50)/50;
 const change=mandate*severity*support.effectiveness-support.repeatCount*.5;
 let next=updateState(game,id,x=>({...x,governance:{...x.governance,approval:clamp(x.governance.approval+change),stability:clamp(x.governance.stability+Math.min(0,change)-severity*.2),integration:clamp(x.governance.integration-severity*support.effectiveness*.35)},speciesPolitics:Object.fromEntries(Object.entries(x.speciesPolitics).map(([species,p])=>{
  const local=((support.bySpecies[species as SpeciesId]??0)-50)/50,enthusiasm=Math.max(0,local)*support.effectiveness;
  return [species,{...p,satisfaction:clamp(p.satisfaction+local*severity*.35-support.repeatCount*.2),autonomyDemand:clamp(p.autonomyDemand+enthusiasm*severity*.6-support.repeatCount*.3),independenceSentiment:clamp(p.independenceSentiment+enthusiasm*severity*.35-support.repeatCount*.4)}];
 }))}));
 if(action==='referendum')next=applySecessionAction(next,j,primary,'governor_request');
 if(action==='autonomy'||action==='renegotiate'){
  if(response==='accept'||response==='partial_concession')next=applySecessionAction(next,j,primary,response==='accept'&&level!=='limited'?'expand':'concede');
  if(action==='renegotiate'&&(response==='accept'||response==='partial_concession')){
   const relief=Math.min(next.world.countries.pigeon.fiscal.treasury*.01,r.economy.gdp*.001);
   next=updateState(next,id,x=>({...x,fiscal:{...x.fiscal,treasury:x.fiscal.treasury+relief}}));
   next={...next,world:{...next.world,countries:{...next.world.countries,pigeon:{...next.world.countries.pigeon,fiscal:{...next.world.countries.pigeon.fiscal,treasury:Math.max(0,next.world.countries.pigeon.fiscal.treasury-relief)}}}}};
  }
 }
 if(action==='referendum'&&(response==='accept'||response==='partial_concession'||response==='negotiate'&&support.publicSupport>=65))next=applySecessionAction(next,j,primary,'approve');
 if(['hardline_rejection','political_pressure','economic_pressure'].includes(response)){
  // Existing refusal effect applies only with a real popular mandate; weak demands lose credibility.
  if(support.publicSupport>=60&&support.repeatCount<2)next=applySecessionAction(next,j,primary,'refuse');
  if(action==='referendum')next=updateState(next,id,x=>({...x,secession:{...x.secession,[primary]:{...x.secession![primary]!,phase:'autonomy_campaign',lastRefusalTurn:game.turn,lastNegotiationTurn:game.turn,monthsInPhase:0}}}));
  if(support.publicSupport<60)next=updateState(next,id,x=>({...x,governance:{...x.governance,approval:clamp(x.governance.approval-severity*federalPoliticsConfig.weakDemandApprovalCost),stability:clamp(x.governance.stability-severity*.4)},speciesPolitics:{...x.speciesPolitics,[primary]:{...x.speciesPolitics[primary]!,independenceSentiment:clamp(x.speciesPolitics[primary]!.independenceSentiment-severity*.3)}},secession:action==='referendum'?{...x.secession,[primary]:{...x.secession![primary]!,phase:'autonomy_campaign',lastRefusalTurn:game.turn,lastNegotiationTurn:game.turn,monthsInPhase:0}}:x.secession}));
  if(response==='economic_pressure')next=updateState(next,id,x=>({...x,fiscal:{...x.fiscal,treasury:Math.max(0,x.fiscal.treasury-x.economy.gdp*.0005)}}));
 }
 if(action==='declare'){
  // Support translates to actual governing capacity before the existing founding/conflict pipeline.
  next=updateState(next,id,x=>({...x,governance:{...x.governance,approval:clamp(x.governance.approval+(support.publicSupport-50)*.2),stability:clamp(x.governance.stability+(assessment.independenceBacking-60)*.45)}}));
  next=applySecessionAction(next,j,primary,'governor_declare');
  const childId=next.world.regions[id].ownerCountryId,child=next.world.countries[childId];
  next={...next,world:{...next.world,countries:{...next.world.countries,[childId]:{...child,identity:{...child.identity!,territorialDispute:next.world.countries[r.ownerCountryId]?(response==='hardline_rejection'?'parent_claims_reunification':'negotiating'):'none'}}},internalConflicts:Object.fromEntries(Object.entries(next.world.internalConflicts??{}).map(([key,c])=>[key,c.breakawayCountryId===childId?{...c,breakawayWarSupport:calculateWarSupport(derivedCountryRuntime(next.world,childId),c,'breakaway'),tension:clamp(c.tension+(response==='hardline_rejection'?15:0))}:c]))}};
 }
 const prior=game.world.federalPolitics?.[id],record={id:`federal:${id}:${game.turn}`,stateId:id,parentCountryId:r.ownerCountryId,date:{...game.date},turn:game.turn,action,level,response};
 next={...next,world:{...next.world,federalPolitics:{...next.world.federalPolitics,[id]:{nextActionTurn:game.turn+(severity>=5?6:3),history:[...(prior?.history??[]),record].slice(-federalPoliticsConfig.historyLimit)}}}};
 const title=`${regionInfo(game,id)!.name}: ${federalActionLabels[action]} · 연방 ${federalResponseLabels[response]}`;
 next=appendGameLog(next,{category:'political',type:'event',message:title});
 next=collectHistory(game,next);
 if(action!=='criticize')next=recordHistoricalEvent(next,{sourceKey:record.id,date:game.date,category:'politics',importance:action==='declare'?'historic':'major',title,description:title+(support.publicSupport>=60?' · 주민들의 높은 자치·독립 요구가 행동의 기반이 되었다.':' · 주민 지지가 충분하지 않아 정치적 위험이 크다.')+(recentFederalConfrontations(game,id).some(h=>h.response==='hardline_rejection')?' 연방의 최근 거부로 대립이 누적되어 있다.':''),countryIds:[r.ownerCountryId,next.world.regions[id].ownerCountryId],countryNames:[historicalCountryName(next,r.ownerCountryId),historicalCountryName(next,next.world.regions[id].ownerCountryId)],regionIds:[id],metadata:{action,response,level}});
 return next;
}
