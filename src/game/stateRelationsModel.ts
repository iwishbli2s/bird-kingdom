import type {WorldState,FederalStatePolitics,InterstateFederalRelation} from './types';
export const federalStateIds=['pigeon-state','eagle-state','owl-state','duck-state'] as const;
export const stateRelationConfig={cooldownMonths:3,historyLimit:48,blocDurationMonths:36,blocMinimumRelations:55,blocMinimumCooperation:45} as const;
export const statePairKey=(a:string,b:string)=>{if(a===b||!federalStateIds.includes(a as typeof federalStateIds[number])||!federalStateIds.includes(b as typeof federalStateIds[number]))throw new Error('서로 다른 연방 주가 필요합니다.');return [a,b].sort().join('|');};
const starts:Record<string,[number,number,number]>={
 [statePairKey('pigeon-state','owl-state')]:[62,18,52], [statePairKey('pigeon-state','eagle-state')]:[48,36,24],
 [statePairKey('pigeon-state','duck-state')]:[50,28,28], [statePairKey('eagle-state','owl-state')]:[47,42,20],
 [statePairKey('eagle-state','duck-state')]:[49,35,22], [statePairKey('owl-state','duck-state')]:[55,20,32],
};
export function isActiveFederalState(w:WorldState,id:string){return federalStateIds.includes(id as typeof federalStateIds[number])&&!!w.countries?.pigeon&&w.regions?.[id]?.ownerCountryId==='pigeon'&&w.regions[id].simulationRole!=='administrative';}
export function initialStateRelations(w:WorldState):FederalStatePolitics {
 return {relations:Object.fromEntries(Object.entries(starts).map(([key,[relations,rivalry,cooperation]])=>{const [stateAId,stateBId]=key.split('|');return [key,{stateAId,stateBId,relations,rivalry,cooperation,active:isActiveFederalState(w,stateAId)&&isActiveFederalState(w,stateBId),history:[],mediations:[],actionCooldownUntilTurn:0}];})),blocs:[],actionCooldowns:{}};
}
/** Ownership-driven cleanup; inactive pairs remain archives. Reintegration tempers extremes once. */
export function synchronizeStateRelationsWorld(w:WorldState):WorldState {
 const p=w.statePolitics??initialStateRelations(w);let changed=!w.statePolitics;
 const relations=Object.fromEntries(Object.entries(p.relations).map(([key,r])=>{const active=isActiveFederalState(w,r.stateAId)&&isActiveFederalState(w,r.stateBId);if(active===r.active)return [key,r];changed=true;
 const initial=starts[key];return [key,{...r,active,...(active?{relations:(r.relations+initial[0])/2,rivalry:(r.rivalry+initial[1])/2,cooperation:(r.cooperation+initial[2])/2,actionCooldownUntilTurn:0}:{})}];}));
 const blocs=p.blocs.map(b=>{if(!b.active)return b;const members=b.memberStateIds.filter(id=>isActiveFederalState(w,id));const rival=b.rivalStateId&&isActiveFederalState(w,b.rivalStateId)?b.rivalStateId:null;if(members.length===b.memberStateIds.length&&rival===b.rivalStateId)return b;changed=true;return {...b,memberStateIds:members,rivalStateId:rival,active:members.length>=2&&!(b.purpose==='anti_rival'&&!rival),endReason:members.length<2?'membership_changed':b.purpose==='anti_rival'&&!rival?'rival_departed':null};});
 const actionCooldowns=Object.fromEntries(Object.entries(p.actionCooldowns).filter(([id])=>isActiveFederalState(w,id)));
 if(Object.keys(actionCooldowns).length!==Object.keys(p.actionCooldowns).length)changed=true;
 return changed?{...w,statePolitics:{relations,blocs,actionCooldowns}}:w;
}
export function inheritedStateDiplomaticBias(w:WorldState,a:string,b:string){
 if(w.countries[a]?.identity?.originCountryId!=='pigeon'||w.countries[b]?.identity?.originCountryId!=='pigeon')return {relations:0,trust:0};
 const pairs=Object.values(w.statePolitics?.relations??{}).filter(r=>{const x=w.regions[r.stateAId]?.ownerCountryId,y=w.regions[r.stateBId]?.ownerCountryId;return x===a&&y===b||x===b&&y===a;});
 if(!pairs.length)return {relations:0,trust:0};const mean=(f:(r:InterstateFederalRelation)=>number)=>pairs.reduce((sum,r)=>sum+f(r),0)/pairs.length;
 return {relations:Math.max(-25,Math.min(25,mean(r=>(r.relations-50)*.3-Math.max(0,r.rivalry-50)*.08+r.cooperation*.05))),trust:Math.max(-15,Math.min(15,mean(r=>(r.relations-50)*.15+r.cooperation*.06-r.rivalry*.05)))};
}
