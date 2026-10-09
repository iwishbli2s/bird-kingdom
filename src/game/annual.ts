import type {GameState} from './types';
import type {AnnualSnapshot,AnnualReportState,AnnualMetricChange,AnnualSummary,AnnualSummaryEvent} from './annualTypes';
import {controlledGovernmentId,getGovernment,governmentRuntime,governmentName} from './government';
import {species} from './data';
export const annualConfig={maxEvents:6,maxAdditionalMetrics:6,thresholds:{unemployment:.5,inflation:.5,treasury:2,debt:3,debtRatio:3,approval:5,stability:5,integration:5,livingStandard:3,education:3,healthcare:3,publicSafety:3,inequality:3,autonomyDemand:5,independenceSentiment:5,technologyScore:1,species:2}};
const labels:Record<string,string>={gdp:'GDP',population:'총인구',unemployment:'실업률',inflation:'물가상승률',treasury:'정부 재정',debt:'국가부채',debtRatio:'부채 / GDP',approval:'정부 지지도',stability:'안정도',integration:'통합도',livingStandard:'생활 수준',education:'교육',healthcare:'의료',publicSafety:'공공 안전',inequality:'불평등',autonomyDemand:'자치권 요구',independenceSentiment:'독립성향',technologyScore:'기술 수준'};
export function captureAnnualSnapshot(game:GameState):AnnualSnapshot {
 const id=controlledGovernmentId(game),descriptor=getGovernment(game.world,id),r=governmentRuntime(game.world,descriptor);
 const regionIds=id.startsWith('region:')?[descriptor.jurisdiction.id]:Object.values(game.world.regions).filter(x=>x.ownerCountryId===descriptor.countryId).map(x=>x.id).sort();
 const values:Record<string,number>={gdp:r.economy.gdp,population:r.population.total,unemployment:r.economy.unemployment,inflation:r.economy.inflation,treasury:r.fiscal.treasury,debt:r.fiscal.debt,debtRatio:r.economy.gdp>0?r.fiscal.debt/r.economy.gdp*100:0};
 for(const key of ['approval','stability','integration'] as const)if(r.governance)values[key]=r.governance[key];
 for(const key of ['livingStandard','education','healthcare','publicSafety','inequality'] as const)if(r.social)values[key]=r.social[key];
 if(r.technology)values.technologyScore=Object.values(r.technology.domains).reduce((s,d)=>s+d.level,0);
 for(const key of ['autonomyDemand','independenceSentiment'] as const){let total=0,weight=0;for(const p of Object.values(r.speciesPolitics??{})){if(!p)continue;const n=r.population.species[p.speciesId]?.population??0;total+=p[key]*n;weight+=n;}if(weight>0)values[key]=total/weight;}
 for(const p of Object.values(r.population.species))if(p&&r.population.total>0)values['species:'+p.speciesId]=p.population/r.population.total*100;
 return {date:{...game.date},turn:game.turn,year:game.date.year,jurisdictionId:id,jurisdictionName:governmentName(game,descriptor),countryId:descriptor.countryId,regionIds,signature:id+'|'+regionIds.join(','),values};
}
export function initializeAnnualReports(game:GameState):AnnualReportState {const snapshot=captureAnnualSnapshot(game);return {snapshot,periodStartTurn:game.turn,eventStartOrder:game.history?.nextHistoricalEventId??1,countryIds:[snapshot.countryId],regionIds:[...snapshot.regionIds],summaries:[]};}
/** Called after a jurisdiction changes too; only the small comparison baseline is reset. */
export function synchronizeAnnualJurisdiction(game:GameState):GameState {
 if(!game.annual)return {...game,annual:initializeAnnualReports(game)};
 const id=controlledGovernmentId(game),regions=id.startsWith('region:')?[id.slice(7)]:Object.values(game.world.regions).filter(r=>r.ownerCountryId===game.player.controlledCountryId).map(r=>r.id).sort();
 if(id+'|'+regions.join(',')===game.annual.snapshot.signature)return game;
 let current:AnnualSnapshot;try{current=captureAnnualSnapshot(game);}catch{return game;}
 return {...game,annual:{...game.annual,snapshot:current,countryIds:[...new Set([...game.annual.countryIds,current.countryId])],regionIds:[...new Set([...game.annual.regionIds,...current.regionIds])]}};
}
export function selectAnnualMetrics(start:AnnualSnapshot,end:AnnualSnapshot):AnnualMetricChange[]{
 const changes=Object.entries(end.values).flatMap(([key,endValue])=>{const startValue=start.values[key];if(startValue===undefined||![startValue,endValue].every(Number.isFinite))return [];
 const absoluteChange=endValue-startValue;if(!Number.isFinite(absoluteChange))return [];const percentageChange=startValue===0?undefined:absoluteChange/Math.abs(startValue)*100;
 const unit=key==='gdp'||key==='treasury'||key==='debt'?'십억 BK':key==='population'?'명':key==='unemployment'||key==='inflation'||key==='debtRatio'||key.startsWith('species:')?'%p':'점';
 return [{key,label:labels[key]??((species.find(s=>s.id===key.slice(8))?.name??key.slice(8))+' 구성비'),startValue,endValue,absoluteChange,...(percentageChange!==undefined&&Number.isFinite(percentageChange)?{percentageChange}:{}),unit}];});
 const threshold=(m:AnnualMetricChange)=>m.key.startsWith('species:')?annualConfig.thresholds.species:annualConfig.thresholds[m.key as keyof typeof annualConfig.thresholds]??1;
 const score=(m:AnnualMetricChange)=>['treasury','debt'].includes(m.key)?Math.abs(m.absoluteChange)/Math.max(start.values.gdp,1)*100/threshold(m):Math.abs(m.absoluteChange)/threshold(m);
 const debtRatio=changes.find(m=>m.key==='debtRatio');
 return [...changes.filter(m=>['gdp','population'].includes(m.key)),...changes.filter(m=>!['gdp','population'].includes(m.key)&&score(m)>=1&&!(m.key==='debt'&&debtRatio&&score(debtRatio)>=1)).sort((a,b)=>score(b)-score(a)||a.key.localeCompare(b.key)).slice(0,annualConfig.maxAdditionalMetrics)];
}
export function annualEventPriority(e:{category:string;title:string;sourceKey?:string}):number {
 if(['war','peace'].includes(e.category))return 0;
 if(/referendum|주민투표/.test((e.sourceKey??'')+e.title))return 4;
 if(['independence','country'].includes(e.category))return 1;
 return ({election:2,crisis:3,politics:5,technology:6} as Record<string,number>)[e.category]??7;
}
export function selectAnnualMajorEvents(game:GameState,state:AnnualReportState):AnnualSummaryEvent[]{
 return (game.history?.timeline??[]).filter(e=>e.order>=state.eventStartOrder&&e.importance!=='minor'&&(e.regionIds?.length?e.regionIds.some(id=>state.regionIds.includes(id)):e.countryIds.some(id=>state.countryIds.includes(id))))
 .sort((a,b)=>annualEventPriority(a)-annualEventPriority(b)|| (a.importance==='historic'?0:1)-(b.importance==='historic'?0:1)||b.order-a.order).slice(0,annualConfig.maxEvents).map(e=>({historyId:e.id,date:{...e.date},title:e.title,description:e.description,category:e.category}));
}
export function buildAnnualHeadline(metrics:AnnualMetricChange[],events:AnnualSummaryEvent[]):string {
 if(events.some(e=>e.category==='war'||e.category==='peace'))return '전쟁과 평화의 해';
 if(events.some(e=>e.category==='independence'||e.category==='country'))return '통치 질서가 변화한 해';
 if(events.some(e=>e.category==='crisis'))return '위기에 대응한 해';
 if(metrics.some(m=>['autonomyDemand','independenceSentiment'].includes(m.key)&&m.absoluteChange>=5)||events.some(e=>e.category==='politics'))return '정치적 변화의 해';
 const growth=metrics.find(m=>m.key==='gdp')?.percentageChange??0;return growth<0?'경제가 위축된 해':growth>=1?'경제가 성장한 해':'완만한 변화의 해';
}
/** January-to-January is twelve completed advances in the existing date-first engine.
 * Reports are labelled with the year just closed; no monthly calculation is reordered.
 * Reporting observes the completed month, never draws random values or changes simulation state. */
export function collectAnnualReport(previous:GameState,next:GameState):GameState {
 if(next.turn===previous.turn)return next;
 const source=synchronizeAnnualJurisdiction(previous);let tracked=synchronizeAnnualJurisdiction({...next,annual:source.annual});const state=tracked.annual!;
 if(next.date.month!==1||next.date.year<=previous.date.year||state.summaries.some(s=>s.year===previous.date.year))return tracked;
 let end:AnnualSnapshot;try{end=captureAnnualSnapshot(next);}catch{return tracked;}
 const metrics=selectAnnualMetrics(state.snapshot,end),majorEvents=selectAnnualMajorEvents(next,state),year=previous.date.year;
 const changed=state.snapshot.turn>state.periodStartTurn;
 const growth=metrics.find(m=>m.key==='gdp')?.percentageChange;
 const economicSentence=growth===undefined?'GDP의 기준값과 현재값을 비교했습니다.':'GDP는 비교 기간 동안 '+Math.abs(growth).toFixed(1)+'% '+(growth<0?'감소':'증가')+'했습니다.';
 const summary:AnnualSummary={id:'annual:'+year+':'+next.turn,year,jurisdictionId:end.jurisdictionId,jurisdictionName:end.jurisdictionName,headline:buildAnnualHeadline(metrics,majorEvents),description:economicSentence+' '+(majorEvents.length?majorEvents.length+'건의 중요한 사건이 기록되었습니다.':'기록된 주요 사건은 없습니다.'),comparisonLabel:changed?'관할 변경 이후':state.snapshot.date.month!==1?'기록 시작 이후':'연초 대비',startDate:{...state.snapshot.date},endDate:{...end.date},metrics,majorEvents,createdTurn:next.turn,...(previous.tutorial?.mode==='active'?{suppressAutomaticDisplay:true}:{})};
 return {...tracked,annual:{snapshot:end,periodStartTurn:next.turn,eventStartOrder:next.history?.nextHistoricalEventId??1,countryIds:[end.countryId],regionIds:[...end.regionIds],summaries:[...state.summaries,summary]}};
}
export function annualPopupBlocked(game:GameState):boolean {return !!(game.gameOverReason||!game.player.alive||game.tutorial?.mode==='active'||game.events.pendingEvent||game.world.foreignProposals?.some(p=>p.targetId===game.player.controlledCountryId)||game.world.warfare?.allyRequests.some(r=>r.status==='pending'&&r.allyCountryId===game.player.controlledCountryId));}

export function selectPendingAnnualReport(game:GameState,seenTurn:number,enabled:boolean):AnnualSummary|undefined {return enabled&&!annualPopupBlocked(game)?game.annual?.summaries.find(r=>!r.suppressAutomaticDisplay&&r.createdTurn>seenTurn):undefined;}
