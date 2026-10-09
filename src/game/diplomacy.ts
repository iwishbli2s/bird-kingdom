import {synchronizeStateRelationsWorld,inheritedStateDiplomaticBias} from './stateRelationsModel';
import { aggressionThreat } from './aggression';
import { collectHistory } from './history';
import { countriesAtWar } from './military';
import { diplomacyConfig as config, diplomaticActionLabels } from './diplomacyConfig';
import { derivedCountryRuntime, ownedRegions, refreshCountryAggregates } from './runtime';
import { appendGameLog } from './logs';
import type { BilateralRelationState, DiplomaticAction, GameState, WorldState } from './types';
const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,n));
export function getDiplomaticPairKey(a:string,b:string):string {
  if(!a||!b||a===b)throw new Error('서로 다른 두 국가가 필요합니다.');
  return [a,b].sort().map(encodeURIComponent).join('|');
}
export function getBilateralRelation(world:WorldState,a:string,b:string){return world.diplomacy?.relations[getDiplomaticPairKey(a,b)];}
export const isRecognized=(r:BilateralRelationState,actor:string)=>actor===r.countryA?r.recognizedBbyA:r.recognizedAbyB;
export const isSanctioning=(r:BilateralRelationState,actor:string)=>actor===r.countryA?r.sanctionsAtoB:r.sanctionsBtoA;
export const hasSanctions=(r:BilateralRelationState)=>r.sanctionsAtoB||r.sanctionsBtoA;
export const countryName=(w:WorldState,id:string)=>w.countries[id]?.identity?.name??w.retiredCountryIdentities?.[id]?.name??id;
export function createBilateralRelation(world:WorldState,a:string,b:string):BilateralRelationState {
  getDiplomaticPairKey(a,b); if(!world.countries[a]||!world.countries[b])throw new Error('존재하는 국가가 필요합니다.');
  const [countryA,countryB]=[a,b].sort(),A=world.countries[countryA].identity,B=world.countries[countryB].identity;
  const child=A?.originCountryId===countryB?A:B?.originCountryId===countryA?B:undefined;
  const initial=!A?.isDynamic&&!B?.isDynamic,legal=child?.status==='established';
  const relations=initial?20:child?(legal?20:-45):0,trust=initial?45:child?(legal?40:12):30;
  const base:BilateralRelationState={countryA,countryB,relations,trust,threat:initial?25:child&&!legal?65:20,threatAtoB:initial?25:child&&!legal?65:20,threatBtoA:initial?25:child&&!legal?65:20,
    baselineTradeLevel:initial?35:0,tradeLevel:initial?35:child?(legal?15:0):5,nonAggressionPact:false,defensePact:false,migratoryPassageAgreement:false,
    sanctionsAtoB:false,sanctionsBtoA:false,
    recognizedAbyB:!A?.isDynamic||(child===A&&legal),recognizedBbyA:!B?.isDynamic||(child===B&&legal),
    monthsSinceMajorDiplomaticAction:config.cooldownMonths,relationsDeltaLastMonth:0,lastActionTurnA:null,lastActionTurnB:null,
    disruptionMonths:0,disruptionExposure:0,threatShockMonths:0};
  const inherited=inheritedStateDiplomaticBias(world,a,b);base.relations=clamp(base.relations+inherited.relations,-100,100);base.trust=clamp(base.trust+inherited.trust);
  base.threatAtoB=clamp(base.threatAtoB+aggressionThreat(world,countryA,countryB));base.threatBtoA=clamp(base.threatBtoA+aggressionThreat(world,countryB,countryA));base.threat=(base.threatAtoB+base.threatBtoA)/2;return base;
}
export function synchronizeDiplomacy(world:WorldState):WorldState {
  world=synchronizeStateRelationsWorld(world);
  const relations={...world.diplomacy?.relations};
  for(const [key,r] of Object.entries(relations))if(!world.countries[r.countryA]||!world.countries[r.countryB])delete relations[key];
  const ids=Object.keys(world.countries).sort();for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
    const key=getDiplomaticPairKey(ids[i],ids[j]);relations[key]??=createBilateralRelation(world,ids[i],ids[j]);
  }
  return {...world,diplomacy:{relations,history:world.diplomacy?.history??[]}};
}
export function settleIndependenceDiplomacy(world:WorldState,parent:string,child:string,defended:boolean):WorldState {
  const next=synchronizeDiplomacy(world),key=getDiplomaticPairKey(parent,child),r=next.diplomacy!.relations[key];
  return {...next,diplomacy:{...next.diplomacy!,relations:{...next.diplomacy!.relations,[key]:{...r,
    relations:defended?-45:-15,trust:defended?10:25,...(r.countryA===parent?{recognizedBbyA:true}:{recognizedAbyB:true})}}}};
}
export function calculateDiplomaticThreat(world:WorldState,observer:string,target:string,r:BilateralRelationState):number {
  const a=derivedCountryRuntime(world,observer),b=derivedCountryRuntime(world,target);
  const dispute=Object.values(world.internalConflicts??{}).some(c=>c.status!=='resolved'&&[c.parentCountryId,c.breakawayCountryId].includes(observer)&&[c.parentCountryId,c.breakawayCountryId].includes(target));
  return clamp(15+Math.min(18,Math.log1p(b.economy.gdp/(a.economy.gdp+1))*12)
    +Math.min(12,Math.sqrt(b.economy.industries.defense.output)*.8)+b.fiscal.budgetPolicy.defense*.5
    -r.relations*.18+(dispute?35:0)+(hasSanctions(r)?8:0)+(r.threatShockMonths>0?12:0)
    +aggressionThreat(world,observer,target)
    -(r.nonAggressionPact?7:0)-(r.defensePact?8:0));
}
export function getDiplomaticCooldown(r:BilateralRelationState,actor:string,turn:number):number {
  const last=actor===r.countryA?r.lastActionTurnA:r.lastActionTurnB;
  return last===null?0:Math.max(0,config.cooldownMonths-(turn-last));
}
export function calculateDiplomaticAcceptance(world:WorldState,actor:string,target:string,r:BilateralRelationState):number {
  const size=world.countries[actor].economy.gdp/(world.countries[target].economy.gdp+1);
  const dispute=Object.values(world.internalConflicts??{}).some(c=>c.status!=='resolved'&&[c.parentCountryId,c.breakawayCountryId].includes(actor)&&[c.parentCountryId,c.breakawayCountryId].includes(target));
  return clamp(30+r.relations*.35+r.trust*.45-r.threat*.2+Math.min(6,Math.log1p(size)*3)+(r.nonAggressionPact?5:0)-(hasSanctions(r)?60:0)-(dispute?35:0));
}
export function getDiplomaticActionBlock(game:GameState,actor:string,target:string,action:DiplomaticAction,ignoreCooldown=false):string|null {
  if(game.gameOverReason||!game.player.alive)return '운영이 종료되었습니다.';
  if(actor===target||!game.world.countries[actor]||!game.world.countries[target])return '유효한 상대국이 필요합니다.';
  const r=getBilateralRelation(game.world,actor,target);if(!r)return '외교관계가 없습니다.';
  if(!ignoreCooldown&&actor===game.player.controlledCountryId&&(game.events.pendingEvent||game.world.foreignProposals?.some(p=>p.targetId===actor)))return '사건을 먼저 해결해야 합니다.';
  const months=getDiplomaticCooldown(r,actor,game.turn);if(months)return `${months}개월 후 다시 행동할 수 있습니다.`;
  if(countriesAtWar(game.world,actor,target)&&['improve','trade','non_aggression','defense','passage','support_parent'].includes(action))return '전쟁·휴전 중에는 평화협정이 먼저 필요합니다.';
  const both=isRecognized(r,actor)&&isRecognized(r,target),identity=game.world.countries[target].identity;
  if(action==='improve'&&game.world.countries[actor].fiscal.treasury<game.world.countries[actor].economy.gdp*config.improveCostRate)return '외교 사절단 비용을 위한 국고가 부족합니다.';
  if(['trade','non_aggression','defense','passage'].includes(action)){
    if(!both)return '양국의 상호 승인이 필요합니다.';if(hasSanctions(r))return '제재를 먼저 해제해야 합니다.';
    const rel=action==='defense'?60:action==='non_aggression'?20:action==='passage'?10:0;
    const trust=action==='defense'?65:action==='non_aggression'?35:0;
    if(r.relations<rel)return `관계도 ${rel} 이상이 필요합니다.`;if(r.trust<trust)return `신뢰 ${trust} 이상이 필요합니다.`;
    if(action==='defense'&&!r.nonAggressionPact)return '불가침조약이 먼저 필요합니다.';
    if(action==='defense'&&r.defensePact||action==='non_aggression'&&r.nonAggressionPact||action==='passage'&&r.migratoryPassageAgreement||action==='trade'&&r.tradeLevel>=100)return '이미 성립했거나 최대 수준입니다.';
  }
  if(action==='recognize'||action==='withdraw_recognition'){
    if(!identity?.isDynamic)return '신생 독립국만 승인 변경 대상입니다.';
    if(isRecognized(r,actor)===(action==='recognize'))return action==='recognize'?'이미 승인했습니다.':'현재 미승인 상태입니다.';
  }
  if(action==='sanction'&&(!isRecognized(r,actor)||isSanctioning(r,actor)))return '승인한 국가에 아직 부과하지 않은 제재만 가능합니다.';
  if(action==='lift_sanctions'&&!isSanctioning(r,actor))return '내가 부과한 제재가 없습니다.';
  if(action==='break_non_aggression'&&(!r.nonAggressionPact||r.defensePact))return '방위조약을 먼저 파기하거나 체결한 불가침조약이 필요합니다.';
  if(action==='break_defense'&&!r.defensePact)return '체결한 방위조약이 없습니다.';
  if(action==='support_parent'&&!Object.values(game.world.internalConflicts??{}).some(c=>c.status!=='resolved'&&c.parentCountryId===target&&actor!==c.breakawayCountryId))return '제3국이 지지할 분쟁 부모국이 없습니다.';
  return null;
}
function performDiplomaticActionCore(game:GameState,actor:string,target:string,action:DiplomaticAction,fromEvent=false,consent?:boolean):GameState {
  const block=getDiplomaticActionBlock(game,actor,target,action,fromEvent);if(block)throw new Error(block);
  const key=getDiplomaticPairKey(actor,target),old=getBilateralRelation(game.world,actor,target)!;
  let r={...old},world=game.world,accepted=true;
  const proposal=['trade','non_aggression','defense','passage'].includes(action);
  if(proposal)accepted=consent??(calculateDiplomaticAcceptance(world,actor,target,r)>=(action==='defense'?65:40));
  if(accepted){
    if(action==='improve'){
      r.relations+=6;r.trust+=1;const c=world.countries[actor],members=ownedRegions(world,actor),cost=c.economy.gdp*config.improveCostRate;
      if(c.identity?.isDynamic&&members.length){const region=members[0];world=refreshCountryAggregates({...world,regions:{...world.regions,[region.id]:{...region,fiscal:{...region.fiscal,treasury:region.fiscal.treasury-cost}}}});}
      else world={...world,countries:{...world.countries,[actor]:{...c,fiscal:{...c.fiscal,treasury:c.fiscal.treasury-cost}}}};
    }
    if(action==='trade'){r.tradeLevel+=15;r.relations+=3;r.trust+=1;}
    if(action==='non_aggression'){r.nonAggressionPact=true;r.relations+=3;r.trust+=4;r.threat=Math.max(0,r.threat-7);}
    if(action==='defense'){r.defensePact=true;r.nonAggressionPact=true;r.relations+=4;r.trust+=5;}
    if(action==='passage'){r.migratoryPassageAgreement=true;r.relations+=4;r.trust+=2;}
    if(action==='recognize'||action==='withdraw_recognition'){
      const value=action==='recognize';r=actor===r.countryA?{...r,recognizedBbyA:value}:{...r,recognizedAbyB:value};r.relations+=value?15:-25;r.trust+=value?5:-20;
      if(!value){r.nonAggressionPact=false;r.defensePact=false;r.migratoryPassageAgreement=false;r.disruptionMonths=6;r.disruptionExposure=old.tradeLevel;}
      const parent=world.countries[target].identity?.originCountryId;
      if(value&&parent&&parent!==actor&&world.countries[parent]){
        const pkey=getDiplomaticPairKey(actor,parent),p=getBilateralRelation(world,actor,parent)!;
        world={...world,diplomacy:{...world.diplomacy!,relations:{...world.diplomacy!.relations,[pkey]:{...p,relations:clamp(p.relations-(world.countries[target].identity?.territorialDispute!=='none'?15:5),-100,100),trust:clamp(p.trust-2)}}}};
      }
    }
    if(action==='sanction'||action==='lift_sanctions'){
      const value=action==='sanction';r=actor===r.countryA?{...r,sanctionsAtoB:value}:{...r,sanctionsBtoA:value};
      r.relations+=value?-20:4;r.trust+=value?-12:0;
      if(value){r.tradeLevel*=.6;r.disruptionExposure=old.tradeLevel;r.disruptionMonths=6;}
    }
    if(action==='break_defense'||action==='break_non_aggression'){
      if(action==='break_defense')r.defensePact=false;else r.nonAggressionPact=false;
      r.relations-=action==='break_defense'?20:15;r.trust-=action==='break_defense'?25:20;r.threatShockMonths=12;
    }
    if(action==='support_parent'){
      r.relations+=5;for(const c of Object.values(world.internalConflicts??{}).filter(c=>c.status!=='resolved'&&c.parentCountryId===target)){
        const ck=getDiplomaticPairKey(actor,c.breakawayCountryId),cr=world.diplomacy!.relations[ck];world={...world,diplomacy:{...world.diplomacy!,relations:{...world.diplomacy!.relations,[ck]:{...cr,relations:clamp(cr.relations-8,-100,100)}}}};
      }
    }
  }
  r={...r,relations:clamp(r.relations,-100,100),trust:clamp(r.trust),tradeLevel:clamp(r.tradeLevel),monthsSinceMajorDiplomaticAction:0,...(actor===r.countryA?{lastActionTurnA:game.turn}:{lastActionTurnB:game.turn})};
  r.threatAtoB=calculateDiplomaticThreat(world,r.countryA,r.countryB,r);r.threatBtoA=calculateDiplomaticThreat(world,r.countryB,r.countryA,r);r.threat=(r.threatAtoB+r.threatBtoA)/2;
  const actorName=countryName(world,actor),targetName=countryName(world,target),summary=`${actorName} → ${targetName}: ${diplomaticActionLabels[action]}${accepted?' 완료':' · 상대국이 제안을 거절했습니다.'}`;
  const history={id:`diplomacy-${game.turn}-${world.diplomacy!.history.length}`,date:{...game.date},turn:game.turn,actorId:actor,targetId:target,actorName,targetName,action,accepted,summary,relationSnapshots:[{...r}]};
  const next={...game,world:{...world,diplomacy:{relations:{...world.diplomacy!.relations,[key]:r},history:[history,...world.diplomacy!.history]}}};
  return appendGameLog(next,{category:'political',type:'event',message:summary});
}
export function updateWorldDiplomacy(world:WorldState,strategic=false):WorldState {
  const next=synchronizeDiplomacy(world),relations=Object.fromEntries(Object.entries(next.diplomacy!.relations).map(([key,r])=>{
    const dispute=Object.values(next.internalConflicts??{}).some(c=>c.status!=='resolved'&&[c.parentCountryId,c.breakawayCountryId].includes(r.countryA)&&[c.parentCountryId,c.breakawayCountryId].includes(r.countryB));
    const delta=hasSanctions(r)?-.08:dispute?-.1:r.nonAggressionPact?(strategic&&r.relations>75?-Math.min(1.2,(r.relations-75)*.08):strategic&&r.relations>=70?0:.02):0;
    let n={...r,relations:clamp(r.relations+delta,-100,100),relationsDeltaLastMonth:clamp(r.relations+delta,-100,100)-r.relations,
      trust:clamp(r.trust+(hasSanctions(r)?-.02:r.nonAggressionPact?(strategic&&r.trust>85?-Math.min(.5,(r.trust-85)*.05):strategic&&r.trust>=80?0:.03):0)),monthsSinceMajorDiplomaticAction:r.monthsSinceMajorDiplomaticAction+1,
      disruptionMonths:Math.max(0,r.disruptionMonths-1),threatShockMonths:Math.max(0,r.threatShockMonths-1),
      tradeLevel:clamp(r.tradeLevel+(hasSanctions(r)||r.relations<0?-.1:r.tradeLevel>35&&isRecognized(r,r.countryA)&&isRecognized(r,r.countryB)?.02:0))};
    n.threatAtoB=calculateDiplomaticThreat(next,r.countryA,r.countryB,n);n.threatBtoA=calculateDiplomaticThreat(next,r.countryB,r.countryA,n);n.threat=(n.threatAtoB+n.threatBtoA)/2;
    return [key,n];
  }));return {...next,diplomacy:{...next.diplomacy!,relations}};
}
export const relationCategory=(n:number)=>n>=75?'매우 우호':n>=40?'우호':n>=10?'약한 우호':n>-10?'중립':n>-40?'냉각':n>-75?'적대':'극단적 적대';
export const threatCategory=(n:number)=>n<20?'낮음':n<40?'제한적':n<60?'경계':n<80?'높음':'심각';

export function performDiplomaticAction(...args:Parameters<typeof performDiplomaticActionCore>):GameState { return collectHistory(args[0],performDiplomaticActionCore(...args)); }

