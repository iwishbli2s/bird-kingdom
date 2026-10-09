import {calculateConflictCapability} from './conflict';
import {strategicConflictProfile} from './strategicConflictProfile';
import {derivedCountryRuntime,refreshCountryAggregates,regionInfo} from './runtime';
import {performFederalAction,federalActionBlock,recentFederalConfrontations} from './federalPolitics';
import {collectHistory,recordHistoricalEvent,historicalCountryName} from './history';
import {appendGameLog} from './logs';
import {federalStateIds,statePairKey,isActiveFederalState,initialStateRelations,synchronizeStateRelationsWorld,stateRelationConfig as config} from './stateRelationsModel';
import type {GameState,RegionRuntimeState,StateAction,StateResponse,BlocPurpose,FederalMediation,InterstateFederalRelation,StateInterestConflictAssessment,FederalStateBloc} from './types';
export {statePairKey,isActiveFederalState} from './stateRelationsModel';
const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,n));
export const stateActionLabels:Record<StateAction,string>={criticize:'상대 주 공개 비판',counter_policy:'상대 정책 견제',mediate:'연방 조사·중재 요구',statement:'공동성명 제안',joint_autonomy:'자치 공동전선 제안',cooperate:'정치협력 제안',negotiate:'갈등완화 회담'};
export const stateResponseLabels:Record<StateResponse,string>={ignore:'대응 유보',rebut:'반박',counterattack:'맞비판',mediation:'중재 요청',cooperation:'협력 수락',de_escalation:'갈등 완화'};
export const mediationLabels:Record<FederalMediation,string>={neutral_mediation:'공정한 중재',favor_state_a:'첫째 주 입장 지지',favor_state_b:'둘째 주 입장 지지',ignore:'개입 유보',compromise:'상호 타협'};
export const blocPurposeLabels:Record<BlocPurpose,string>={autonomy:'자치권 확대',fiscal:'연방재정 개편',security:'안보 정책',economic:'공동경제 정책',anti_rival:'특정 주 견제'};
const avg=(r:RegionRuntimeState,key:'autonomyDemand'|'independenceSentiment'|'satisfaction')=>Object.values(r.population.species).reduce((s,p)=>s+p.population*(r.speciesPolitics[p.speciesId]?.[key]??0),0)/Math.max(1,r.population.total);
export function getStateRelation(g:GameState,a:string,b:string):InterstateFederalRelation{return (g.world.statePolitics??initialStateRelations(g.world)).relations[statePairKey(a,b)];}
function states(g:GameState,a:string,b:string){statePairKey(a,b);if(!isActiveFederalState(g.world,a)||!isActiveFederalState(g.world,b))throw new Error('현재 같은 연방에 소속된 두 주가 필요합니다.');return [g.world.regions[a],g.world.regions[b]] as const;}
const budgetWeights:Record<string,Partial<Record<keyof RegionRuntimeState['fiscal']['budgetPolicy'],number>>>={
 'pigeon-state':{infrastructure:.6,industrySupport:.3,welfare:.1},'eagle-state':{defense:.7,security:.2,industrySupport:.1},'owl-state':{research:.55,education:.45},'duck-state':{infrastructure:.3,welfare:.4,industrySupport:.3},
};
export function federalBudgetAffinity(g:GameState,id:string){const p=g.world.countries.pigeon?.fiscal.budgetPolicy;if(!p)return 0;return clamp(Object.entries(budgetWeights[id]).reduce((s,[key,weight])=>s+p[key as keyof typeof p]*weight!,0)*10);}
export function stateInfluence(g:GameState,id:string){const members=federalStateIds.filter(x=>isActiveFederalState(g.world,x)).map(x=>g.world.regions[x]),r=g.world.regions[id];if(!r||!members.includes(r))return 0;
 const ratio=(f:(r:RegionRuntimeState)=>number)=>f(r)/Math.max(1,members.reduce((s,x)=>s+f(x),0));
 return clamp(100*(ratio(x=>x.economy.gdp)*.4+ratio(x=>x.population.total)*.35+ratio(x=>calculateConflictCapability(x))*.15+ratio(x=>(x.governance.stability+x.governance.approval)/2)*.1));
}
export function evaluateStateInterestConflict(g:GameState,a:string,b:string):StateInterestConflictAssessment {
 const [A,B]=states(g,a,b),relation=getStateRelation(g,a,b);
 const fiscalConflict=clamp(Math.abs(federalBudgetAffinity(g,a)-federalBudgetAffinity(g,b))*1.2+(A.fiscal.debt/Math.max(1,A.economy.gdp)+B.fiscal.debt/Math.max(1,B.economy.gdp))*8);
 const economicCompetition=clamp(Object.keys(A.economy.industries).reduce((s,key)=>{const id=key as keyof typeof A.economy.industries;return s+Math.min(A.economy.industries[id].output/Math.max(1,A.economy.gdp),B.economy.industries[id].output/Math.max(1,B.economy.gdp));},0)*65);
 const politicalCompetition=clamp(Math.abs(stateInfluence(g,a)-stateInfluence(g,b))*.6+relation.rivalry*.3+(A.governance.approval+B.governance.approval)*.1);
 const autonomyConflict=clamp(Math.abs(avg(A,'autonomyDemand')-avg(B,'autonomyDemand'))*.6+Math.abs(avg(A,'independenceSentiment')-avg(B,'independenceSentiment'))*.3+Math.abs(A.governance.integration-B.governance.integration)*.1);
 const speciesConflict=clamp(Object.keys(A.speciesPolitics).reduce((s,id)=>s+Math.abs((A.population.species[id as keyof typeof A.population.species]?.population??0)/Math.max(1,A.population.total)-(B.population.species[id as keyof typeof B.population.species]?.population??0)/Math.max(1,B.population.total)),0)*20+(100-Math.min(avg(A,'satisfaction'),avg(B,'satisfaction')))*.2);
 const overallConflict=fiscalConflict*.3+economicCompetition*.2+politicalCompetition*.2+autonomyConflict*.2+speciesConflict*.1;
 const reasonCodes=[...(fiscalConflict>30?['BUDGET_COMPETITION']:[]),...(relation.rivalry>60?['HIGH_RIVALRY']:[]),...(Math.max(stateInfluence(g,a),stateInfluence(g,b))>45?['STATE_DOMINANCE']:[]),...(autonomyConflict<15&&Math.min(avg(A,'autonomyDemand'),avg(B,'autonomyDemand'))>50?['AUTONOMY_ALIGNMENT']:[])];
 return {fiscalConflict,economicCompetition,politicalCompetition,autonomyConflict,speciesConflict,overallConflict,reasonCodes};
}
export function commonStateRival(g:GameState,a:string,b:string){return federalStateIds.filter(x=>x!==a&&x!==b&&isActiveFederalState(g.world,x)).find(x=>{const A=getStateRelation(g,a,x),B=getStateRelation(g,b,x);return A.rivalry>=55&&B.rivalry>=55||stateInfluence(g,x)>45&&Math.min(A.rivalry,B.rivalry)>30;})??null;}
export function evaluateStateCooperation(g:GameState,a:string,b:string,purpose:BlocPurpose='economic'){
 const [A,B]=states(g,a,b),r=getStateRelation(g,a,b),conflict=evaluateStateInterestConflict(g,a,b),commonRival=commonStateRival(g,a,b);
 const grievance=(id:string)=>recentFederalConfrontations(g,id,12).some(h=>['hardline_rejection','political_pressure','economic_pressure'].includes(h.response));
 const sharedGrievance=grievance(a)&&grievance(b),autonomyAlignment=Math.min(avg(A,'autonomyDemand'),avg(B,'autonomyDemand'))*(1-conflict.autonomyConflict/100);
 const utility=r.relations*.4+r.cooperation*.4-r.rivalry*.35+autonomyAlignment*(purpose==='autonomy'?.25:.08)+(commonRival?15:0)+(sharedGrievance?12:0)+(100-conflict.economicCompetition)*.08;
 return {utility,commonRival,reasonCodes:[...(commonRival?['COMMON_RIVAL']:[]),...(sharedGrievance?['COMMON_FEDERAL_GRIEVANCE']:[]),...conflict.reasonCodes]};
}
export function evaluateStateActionSupport(g:GameState,a:string,b:string,action:StateAction){const r=getStateRelation(g,a,b),c=evaluateStateInterestConflict(g,a,b),attack=action==='criticize'||action==='counter_policy';
 const support=clamp(attack?r.rivalry*.55+c.overallConflict*.35+(50-r.relations)*.2:r.relations*.5+r.cooperation*.35+(100-r.rivalry)*.15);
 const repeats=r.history.filter(h=>h.actorId===a&&h.action===action&&g.turn-h.turn<=24).length;
 return {support,repeats,effectiveness:1/(1+repeats*.7),reaction:support>=60?'긍정적':support<40?'부정적':'엇갈림',risk:attack?(repeats>2?'높음':support<40?'높음':'보통'):'낮음',reasonCodes:c.reasonCodes};
}
export function selectStateResponse(g:GameState,a:string,b:string,action:StateAction,purpose:BlocPurpose='economic'):StateResponse {const [A,B]=states(g,a,b),r=getStateRelation(g,a,b),attack=['criticize','counter_policy'].includes(action);
 if(['joint_autonomy','cooperate'].includes(action)&&(r.relations<config.blocMinimumRelations||r.cooperation<config.blocMinimumCooperation||evaluateStateCooperation(g,a,b,action==='joint_autonomy'?'autonomy':purpose).utility<45))return 'rebut';
 if(!attack&&action!=='mediate')return evaluateStateCooperation(g,a,b,action==='joint_autonomy'?'autonomy':purpose).utility>=40&&r.rivalry<80?'cooperation':action==='negotiate'&&r.rivalry<75?'de_escalation':'rebut';
 if(B.governance.approval<30)return 'ignore';if(r.relations>=65&&r.cooperation>=50)return 'de_escalation';
 if(r.rivalry>=75&&B.governance.approval>=50)return 'counterattack';if(evaluateStateInterestConflict(g,a,b).overallConflict>55&&B.governance.integration>60)return 'mediation';
 return action==='mediate'?'mediation':A.governance.approval<30?'ignore':'rebut';
}
export function stateActionBlock(g:GameState,a:string,b:string,action:StateAction,purpose:BlocPurpose='economic',rivalId:string|null=null):string|null {
 try{states(g,a,b);}catch{return '현재 같은 연방에 소속된 서로 다른 주를 선택하세요.';}
 if(!Object.hasOwn(stateActionLabels,action)||!Object.hasOwn(blocPurposeLabels,purpose))return '알 수 없는 행동입니다.';
 if(g.gameOverReason||!g.player.alive)return '종료된 게임입니다.';if(g.events.pendingEvent)return '사건 선택을 먼저 완료하세요.';
 const r=getStateRelation(g,a,b),wait=Math.max(r.actionCooldownUntilTurn,g.world.statePolitics?.actionCooldowns[a]??0)-g.turn;if(wait>0)return `다음 주간 정치행동까지 ${wait}개월`;
 if(purpose==='anti_rival'&&(rivalId===a||rivalId===b||!rivalId||!isActiveFederalState(g.world,rivalId)))return '견제할 제3의 연방 주를 선택하세요.';
 if(action==='joint_autonomy'||action==='cooperate'&&purpose==='autonomy'){const blockA=federalActionBlock(g,a,'autonomy'),blockB=federalActionBlock(g,b,'autonomy');if(blockA||blockB)return `공동 자치요구 대기: ${blockA??blockB}`;}
 if(['cooperate','joint_autonomy'].includes(action)&&g.world.statePolitics?.blocs.some(x=>x.active&&x.purpose===(action==='joint_autonomy'?'autonomy':purpose)&&x.memberStateIds.some(id=>id===a||id===b)))return '이미 같은 목적의 정치블록에 참여 중입니다.';
 return null;
}
function changePair(g:GameState,a:string,b:string,transform:(r:InterstateFederalRelation)=>InterstateFederalRelation):GameState{const p=g.world.statePolitics??initialStateRelations(g.world),key=statePairKey(a,b);return {...g,world:{...g.world,statePolitics:{...p,relations:{...p.relations,[key]:transform(p.relations[key])}}}};}
function changeState(g:GameState,id:string,approval:number,stability:number,integration=0,autonomy=0,independence=0){const r=g.world.regions[id];return {...g,world:refreshCountryAggregates({...g.world,regions:{...g.world.regions,[id]:{...r,governance:{...r.governance,approval:clamp(r.governance.approval+approval),stability:clamp(r.governance.stability+stability),integration:clamp(r.governance.integration+integration)},speciesPolitics:Object.fromEntries(Object.entries(r.speciesPolitics).map(([key,p])=>[key,{...p,autonomyDemand:clamp(p.autonomyDemand+autonomy),independenceSentiment:clamp(p.independenceSentiment+(p.satisfaction<45?independence:0))}]))}}})};}
export function evaluateFederalMediation(g:GameState,a:string,b:string):Record<FederalMediation,number>{states(g,a,b);const r=getStateRelation(g,a,b),parent=derivedCountryRuntime(g.world,'pigeon');
 const war=Object.values(g.world.warfare?.wars??{}).some(w=>w.status!=='resolved'&&[...w.attackers,...w.defenders].includes('pigeon'));
 const crises=Object.values(g.world.crises?.activeCrises??{}).filter(c=>c.jurisdictionKind==='country'?c.jurisdictionId==='pigeon':g.world.regions[c.jurisdictionId]?.ownerCountryId==='pigeon').length;
 const favored=(id:string)=>r.mediations.filter(m=>m.favoredStateId===id&&g.turn-m.turn<=24).length;
 const favor=(id:string,R:RegionRuntimeState)=>10+federalBudgetAffinity(g,id)*.6+R.governance.approval*.12+stateInfluence(g,id)*.1+(R.governance.integration-50)*.15-favored(id)*20-Math.max(0,avg(R,'autonomyDemand')-60)*.1;
 return {neutral_mediation:25+r.rivalry*.35+parent.governance!.stability*.1,compromise:25+r.cooperation*.35+(g.world.statePolitics?.blocs.some(x=>x.active&&x.memberStateIds.includes(a)&&x.memberStateIds.includes(b))?10:0),favor_state_a:favor(r.stateAId,g.world.regions[r.stateAId]),favor_state_b:favor(r.stateBId,g.world.regions[r.stateBId]),ignore:12+(war?45:0)+Math.min(30,crises*12)+Math.min(15,parent.fiscal.debt/Math.max(1,parent.economy.gdp)*10)+(100-parent.governance!.stability)*.1};
}
export function selectFederalMediation(g:GameState,a:string,b:string):FederalMediation{return (Object.entries(evaluateFederalMediation(g,a,b)) as [FederalMediation,number][]).sort((a,b)=>b[1]-a[1])[0][0];}
function applyMediation(g:GameState,a:string,b:string):GameState {
 const r=getStateRelation(g,a,b),outcome=selectFederalMediation(g,a,b),favoredStateId=outcome==='favor_state_a'?r.stateAId:outcome==='favor_state_b'?r.stateBId:null;
 const record={id:`mediation:${statePairKey(a,b)}:${g.turn}`,turn:g.turn,date:{...g.date},outcome,favoredStateId};
 if(r.mediations.some(m=>m.turn===g.turn))return g;
 let next=changePair(g,a,b,x=>({...x,relations:clamp(x.relations+(favoredStateId?-3:outcome==='ignore'?-1:5)),rivalry:clamp(x.rivalry+(favoredStateId?3:outcome==='ignore'?2:-6)),cooperation:clamp(x.cooperation+(outcome==='compromise'?4:0)),mediations:[...x.mediations,record].slice(-config.historyLimit)}));
 if(favoredStateId){const loser=favoredStateId===a?b:a,repeated=r.mediations.filter(m=>m.favoredStateId===favoredStateId&&g.turn-m.turn<=24).length;next=changeState(next,loser,-.5,-.5,-2,1.5,repeated>=1?.5:0);}
 else if(outcome==='ignore'&&r.rivalry>=65&&r.history.some(h=>g.turn-h.turn>=12)){const repeats=r.mediations.filter(m=>m.outcome==='ignore'&&g.turn-m.turn<=24).length;for(const id of [a,b])next=changeState(next,id,0,-.4,-.5,.5,repeats>=1?.25:0);}
 else if(outcome!=='ignore'){for(const id of [a,b])next=changeState(next,id,0,.5,.4);}
 return recordHistoricalEvent(next,{sourceKey:record.id,date:g.date,category:'politics',importance:'major',title:`${regionInfo(g,a)!.name} · ${regionInfo(g,b)!.name}: 연방 ${favoredStateId?regionInfo(g,favoredStateId)!.name+' 입장 지지':mediationLabels[outcome]}`,description:'연방정부가 주 간 정치갈등에 대한 입장을 발표했다.',countryIds:['pigeon'],countryNames:[historicalCountryName(g,'pigeon')],regionIds:[a,b],metadata:{outcome,...(favoredStateId?{favoredStateId}:{})}});
}
export function requestFederalMediation(g:GameState,a:string,b:string){return performStateAction(g,a,b,'mediate');}
function formBloc(g:GameState,a:string,b:string,purpose:BlocPurpose,rivalId:string|null):GameState {
 const r=getStateRelation(g,a,b),evaluation=evaluateStateCooperation(g,a,b,purpose);if(r.relations<config.blocMinimumRelations||r.cooperation<config.blocMinimumCooperation||r.rivalry>=75||evaluation.utility<45)return g;
 const bloc:FederalStateBloc={id:`bloc:${g.turn}:${statePairKey(a,b)}`,memberStateIds:[a,b].sort(),originalMemberStateIds:[a,b].sort(),purpose,rivalStateId:purpose==='anti_rival'?rivalId:null,createdTurn:g.turn,expiresTurn:g.turn+config.blocDurationMonths,cohesion:clamp(50+evaluation.utility*.3-r.rivalry*.1),active:true,endReason:null};
 const p=g.world.statePolitics!;let next:GameState={...g,world:{...g.world,statePolitics:{...p,blocs:[...p.blocs,bloc]}}};
 next=recordHistoricalEvent(next,{sourceKey:bloc.id,date:g.date,category:'politics',importance:'major',title:`${regionInfo(g,a)!.name}와 ${regionInfo(g,b)!.name}: ${blocPurposeLabels[purpose]} 공동전선`,description:'연방 내부 정치연합이며 군사동맹이나 자동 참전 의무가 아니다.',countryIds:['pigeon'],countryNames:[historicalCountryName(g,'pigeon')],regionIds:[a,b],metadata:{purpose}});
 if(purpose==='autonomy'){next=performFederalAction(next,a,'autonomy','substantial');next=performFederalAction(next,b,'autonomy','substantial');}
 return next;
}
export function proposeStateBloc(g:GameState,a:string,b:string,purpose:BlocPurpose,rivalId:string|null=null){return performStateAction(g,a,b,purpose==='autonomy'?'joint_autonomy':'cooperate',purpose,rivalId);}
export function performStateAction(g:GameState,a:string,b:string,action:StateAction,purpose:BlocPurpose='economic',rivalId:string|null=null):GameState {
 const blocked=stateActionBlock(g,a,b,action,purpose,rivalId);if(blocked)throw new Error(blocked);
 return applyStatePoliticalActionEffects(g,a,b,action,purpose,rivalId);
}
/** Shared domain effects for validated events and commands. */
export function applyStatePoliticalActionEffects(g:GameState,a:string,b:string,action:StateAction,purpose:BlocPurpose='economic',rivalId:string|null=null):GameState {
 states(g,a,b);
 g={...g,world:synchronizeStateRelationsWorld(g.world)};const support=evaluateStateActionSupport(g,a,b,action),response=selectStateResponse(g,a,b,action,purpose),attack=action==='criticize'||action==='counter_policy';
 const accepted=['cooperation','de_escalation'].includes(response),strength=Math.max(.15,support.effectiveness);
 const record={id:`state-action:${g.turn}:${a}:${b}`,turn:g.turn,date:{...g.date},actorId:a,targetId:b,action,response,accepted,reasonCodes:[...support.reasonCodes,...evaluateStateCooperation(g,a,b,purpose).reasonCodes]};
 let next=changePair(g,a,b,r=>({...r,relations:clamp(r.relations+(attack?-6*strength:accepted?4*strength:-1)),rivalry:clamp(r.rivalry+(attack?3*strength:accepted?-4*strength:0)),cooperation:clamp(r.cooperation+(attack?-2:accepted?5*strength:0)),history:[...r.history,record].slice(-config.historyLimit),actionCooldownUntilTurn:g.turn+config.cooldownMonths}));
 next=changeState(next,a,(support.support-50)/25*strength-support.repeats*.4,attack&&support.support<40?-.7:0,action==='counter_policy'?-.5:0);
 if(response==='counterattack')next=changePair(next,a,b,r=>({...r,relations:clamp(r.relations-3*strength),rivalry:clamp(r.rivalry+3*strength)}));
 if(response==='de_escalation')next=changePair(next,a,b,r=>({...r,relations:clamp(r.relations+2),rivalry:clamp(r.rivalry-3)}));
 if(action==='mediate'||response==='mediation')next=applyMediation(next,a,b);
 if(accepted&&['joint_autonomy','cooperate'].includes(action)&&(!(purpose==='autonomy'||action==='joint_autonomy')||!federalActionBlock(next,a,'autonomy')&&!federalActionBlock(next,b,'autonomy')))next=formBloc(next,a,b,action==='joint_autonomy'?'autonomy':purpose,rivalId);
 const p=next.world.statePolitics!;next={...next,world:{...next.world,statePolitics:{...p,actionCooldowns:{...p.actionCooldowns,[a]:g.turn+config.cooldownMonths}}}};
 const message=`${regionInfo(g,a)!.name} → ${regionInfo(g,b)!.name}: ${stateActionLabels[action]} · ${stateResponseLabels[response]}`;
 next=appendGameLog(next,{category:'political',type:'event',message});next=collectHistory(g,next);
 if(['counter_policy','statement','joint_autonomy','cooperate'].includes(action))next=recordHistoricalEvent(next,{sourceKey:record.id,date:g.date,category:'politics',importance:'major',title:message,description:message,countryIds:['pigeon'],countryNames:[historicalCountryName(g,'pigeon')],regionIds:[a,b],metadata:{action,response}});
 return next;
}
export function getStateConflictEventMultiplier(g:GameState,a:string,b:string){const r=getStateRelation(g,a,b);return r.active?Math.min(2,1+r.rivalry*.006+Math.max(0,50-r.relations)*.004):1;}
export function evaluateBlocContinuation(g:GameState,b:FederalStateBloc){
 const pairs=b.memberStateIds.flatMap((id,i)=>b.memberStateIds.slice(i+1).map(other=>evaluateStateCooperation(g,id,other,b.purpose).utility));
 const utility=pairs.reduce((s,n)=>s+n,0)/Math.max(1,pairs.length);
 const mature=g.turn-b.createdTurn>=12;
 const purposeGone=mature&&(b.purpose==='autonomy'?b.memberStateIds.every(id=>avg(g.world.regions[id],'autonomyDemand')<35&&avg(g.world.regions[id],'satisfaction')>65):b.purpose==='anti_rival'&&!!b.rivalStateId&&b.memberStateIds.every(id=>!isActiveFederalState(g.world,b.rivalStateId!)||getStateRelation(g,id,b.rivalStateId!).rivalry<35));
 return {utility,purposeGone,cohesionDelta:utility<35?-2.5:utility>55?.15:0,reasonCodes:purposeGone?['BLOC_PURPOSE_RESOLVED']:utility<35?['BLOC_INTEREST_DIVERGENCE']:['BLOC_SHARED_INTEREST']};
}
export function updateStateRelations(g:GameState):GameState {
 let next={...g,world:synchronizeStateRelationsWorld(g.world)};const p=next.world.statePolitics!;
 const relations=Object.fromEntries(Object.entries(p.relations).map(([key,r])=>{if(!r.active)return [key,r];const c=evaluateStateInterestConflict(next,r.stateAId,r.stateBId),cooperation=evaluateStateCooperation(next,r.stateAId,r.stateBId);
 return [key,{...r,relations:clamp(r.relations+clamp((52+r.cooperation*.12-c.overallConflict*.2-r.relations)*.008,-.15,.15)),rivalry:clamp(r.rivalry+clamp((c.overallConflict+Math.min(16,r.history.filter(h=>next.turn-h.turn<=24&&['criticize','counter_policy'].includes(h.action)).length*4)-r.rivalry)*.003,-.10,.15)),cooperation:clamp(r.cooperation+clamp((38+(cooperation.commonRival?12:0)+(cooperation.reasonCodes.includes('COMMON_FEDERAL_GRIEVANCE')?8:0)-r.cooperation)*.005,-.12,.12))}];}));
 const blocs=p.blocs.map(b=>{if(!b.active)return b;const pairs=b.memberStateIds.flatMap((id,i)=>b.memberStateIds.slice(i+1).map(other=>getStateRelation(next,id,other))),continuation=evaluateBlocContinuation(next,b);const cohesion=clamp(b.cohesion+pairs.reduce((s,r)=>s+(r.relations-55)*.015-r.rivalry*.008,0)/Math.max(1,pairs.length)+continuation.cohesionDelta);const achieved=continuation.purposeGone||b.purpose==='autonomy'&&b.memberStateIds.every(id=>Math.max(...Object.values(next.world.regions[id].secession??{}).map(m=>m.grantedAutonomy))>=80);const ended=g.turn>=b.expiresTurn||cohesion<25||achieved;return {...b,cohesion,active:!ended,endReason:ended?achieved?'purpose_achieved':g.turn>=b.expiresTurn?'expired':'political_divergence':null};});
 next={...next,world:{...next.world,statePolitics:{...p,relations,blocs}}};
 for(const b of blocs.filter(b=>!b.active&&p.blocs.find(old=>old.id===b.id)?.active))next=recordHistoricalEvent(next,{sourceKey:`bloc-ended:${b.id}`,date:g.date,category:'politics',importance:'major',title:`${blocPurposeLabels[b.purpose]} 공동전선 해체`,description:b.endReason??'정치적 협력 종료',countryIds:['pigeon'],countryNames:[historicalCountryName(next,'pigeon')],regionIds:b.memberStateIds,metadata:{reason:b.endReason??''}});
 return next;
}
export function chooseNPCStateAction(g:GameState,a:string,b:string){const r=getStateRelation(g,a,b),c=evaluateStateInterestConflict(g,a,b),common=commonStateRival(g,a,b);let action:StateAction|null=null;
 const profile=strategicConflictProfile(g,a),local=g.world.regions[a],weak=local.governance.approval<40||local.governance.stability<35||local.fiscal.treasury<local.economy.gdp*.005;
 const joint=cooperationBackground(g,a,b);
 if(joint&&r.relations>=55&&r.cooperation>=45&&!federalActionBlock(g,a,'autonomy')&&!federalActionBlock(g,b,'autonomy'))action='joint_autonomy';
 else if(r.rivalry>55&&c.overallConflict>35&&g.turn%18===0)action='counter_policy';
 else if(shouldMediateStatePair(g,a,b))action='mediate';else if(common&&r.relations>=55&&r.cooperation>=45)action='cooperate';else if(c.fiscalConflict>10&&r.relations>=55&&r.cooperation>=45&&g.turn%36===0)action='cooperate';
 else if(r.relations>=62&&r.cooperation>=48)action='statement';else if(r.relations>=40&&r.cooperation<45)action='negotiate';
 if(c.overallConflict>75&&r.rivalry>80&&g.turn%24===0)action='criticize';
 if(profile.escalationBias>60&&!weak&&c.overallConflict>50&&r.rivalry>55&&g.turn%18===0)action='counter_policy';
 if(weak&&r.rivalry>=40)action='negotiate';
 return {action,purpose:(common?'anti_rival':c.fiscalConflict>30?'fiscal':'economic') as BlocPurpose,rivalId:common,reasonCodes:[...c.reasonCodes,...(common?['COMMON_RIVAL']:[])]};
}
/** Deliberately conservative scheduling; every NPC mutation goes through player domain commands. */
export function updateStatePoliticalAI(g:GameState,autonomousWorld=false):GameState {
 if(g.gameOverReason||g.events.pendingEvent||g.tutorial?.mode==='active'&&g.tutorial.scriptedScenarioEnabled)return g;let next=g;const members=federalStateIds.filter(id=>isActiveFederalState(g.world,id));
 if(g.turn%6===0&&members.length>=2){const actors=members.filter(id=>autonomousWorld||id!==g.player.controlledRegionId);if(actors.length){const a=actors[Math.floor(g.turn/6)%actors.length],targets=members.filter(id=>id!==a),b=targets[Math.floor(g.turn/18)%targets.length],choice=chooseNPCStateAction(g,a,b);if(choice.action&&!stateActionBlock(next,a,b,choice.action,choice.purpose,choice.rivalId))next=performStateAction(next,a,b,choice.action,choice.purpose,choice.rivalId);}}
 if(g.turn%12===0){const pair=Object.values(next.world.statePolitics?.relations??{}).filter(r=>r.active&&shouldMediateStatePair(next,r.stateAId,r.stateBId)&&!r.mediations.some(m=>g.turn-m.turn<12)).sort((a,b)=>b.rivalry-a.rivalry)[0];if(pair)next=applyMediation(next,pair.stateAId,pair.stateBId);}
 return next;
}

export function cooperationBackground(g:GameState,a:string,b:string){const [A,B]=states(g,a,b);return Math.min(avg(A,'autonomyDemand'),avg(B,'autonomyDemand'))>=55&&Math.max(avg(A,'satisfaction'),avg(B,'satisfaction'))<45||[a,b].every(id=>recentFederalConfrontations(g,id,24).some(h=>['hardline_rejection','political_pressure','economic_pressure'].includes(h.response)));}
export function shouldMediateStatePair(g:GameState,a:string,b:string){const r=getStateRelation(g,a,b),disputes=r.history.filter(h=>g.turn-h.turn<=24&&['criticize','counter_policy'].includes(h.action)).length;return r.rivalry>65||r.rivalry>=45&&r.relations<55&&disputes>=2;}
