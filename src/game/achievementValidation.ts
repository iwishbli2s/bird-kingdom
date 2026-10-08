import type {GameState} from './types';
import {achievementDefinitions} from './achievementConfig';
export function validateAchievementFields(game:GameState):void {
 const fail=()=>{throw new Error('업적 또는 종료 결과 저장 자료가 올바르지 않습니다.');};
 const object=(v:unknown)=>!!v&&typeof v==='object'&&!Array.isArray(v);
 for(const value of [game.player.origin,game.achievements,game.endingResult])if(value!==undefined&&!object(value))fail();
 const integer=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
 const date=(v:any)=>object(v)&&integer(v.year)&&v.year>=1&&integer(v.month)&&v.month>=1&&v.month<=12;
 const unlocks=(list:any)=>Array.isArray(list)&&new Set(list.map((u:any)=>u?.achievementId)).size===list.length&&list.every((u:any)=>object(u)&&achievementDefinitions.some(d=>d.id===u.achievementId)&&date(u.unlockedAt)&&integer(u.score)&&(!u.metadata||object(u.metadata)&&Object.values(u.metadata).every(v=>['string','number','boolean'].includes(typeof v))));
 const origin=game.player.origin;
 if(origin&&(!object(origin)||typeof origin.startingCountryId!=='string'||origin.startingStateId!==undefined&&typeof origin.startingStateId!=='string'||typeof origin.startedAsFederationState!=='boolean'||typeof origin.verified!=='boolean'||!Array.isArray(origin.federationRegionIds)||origin.federationRegionIds.some(id=>typeof id!=='string')||new Set(origin.federationRegionIds).size!==origin.federationRegionIds.length||origin.startedAsFederationState&&(origin.startingCountryId!=='pigeon'||!origin.startingStateId||!origin.federationRegionIds.includes(origin.startingStateId))))fail();
 const a=game.achievements;
 if(a){if(!object(a)||!unlocks(a.unlocked)||!object(a.progress))fail();const p=a.progress;for(const k of ['lastMonthTurn','lastYear','peaceMonths','economicYears','technologyYears','goldenYears','cohesionYears','fiscalYears'] as const)if(!integer(p[k]))fail();if(p.lastMonthTurn>game.turn||p.independentCountryId!==null&&typeof p.independentCountryId!=='string'||!Array.isArray(p.absorbedFederationRegionIds)||p.absorbedFederationRegionIds.some(id=>typeof id!=='string')||new Set(p.absorbedFederationRegionIds).size!==p.absorbedFederationRegionIds.length)fail();}
 const e=game.endingResult;
 if(e){if(!object(e)||!game.gameOverReason||e.gameOverReason!==game.gameOverReason||!['good','bad'].includes(e.alignment)||e.alignment!==(e.gameOverReason==='death'?'good':'bad')||!['D','C','B','A','S','SS','SSS'].includes(e.grade)||!integer(e.score)||!integer(e.reignMonths)||!integer(e.finalAge)||!integer(e.electionsWon)||!date(e.date)||!unlocks(e.achievements)||!object(e.summary))fail();for(const k of ['id','title','description','countryId','countryName'] as const)if(typeof e[k]!=='string')fail();if(e.regionName!==null&&typeof e.regionName!=='string')fail();for(const n of Object.values(e.summary))if(!integer(n))fail();}
}
