import type {GameState,GameOverReason} from './types';
import type {EndingDefinition,EndingResult,AchievementUnlock,RuleGrade} from './achievementTypes';
import {achievementDefinitions,scoreConfig} from './achievementConfig';
export function classifyEnding(reason:GameOverReason,context:{situationalRisk?:number}={}):EndingDefinition {
 switch(reason){
 case 'death':return context.situationalRisk&&context.situationalRisk>0?{id:'in-office',alignment:'good',title:'직무 중 생을 마치다',description:'상황위험이 존재하는 재임 중 생을 마쳤습니다. 마지막까지 직위를 유지했습니다.'}:{id:'natural-death',alignment:'good',title:'천수를 다하다',description:'권력을 유지한 채 생을 마쳤습니다.'};
 case 'election_defeat':return {id:'election-defeat',alignment:'bad',title:'민심의 심판',description:'재선에 실패하여 통치가 끝났습니다. 통치의 업적은 별도로 평가합니다.'};
 case 'state_defeat':return {id:'state-defeat',alignment:'bad',title:'나라를 잃다',description:'운영하던 국가 또는 주를 잃어 통치를 계속할 수 없게 되었습니다.'};
 default:{const exhaustive:never=reason;throw new Error('분류되지 않은 종료 원인: '+exhaustive);}
 }
}
/** Stored award values, highest tier per family. No ending or difficulty multiplier. */
export function calculateAchievementScore(unlocks:AchievementUnlock[]):number {
 const families=new Map<string,number>();for(const u of unlocks){const d=achievementDefinitions.find(d=>d.id===u.achievementId);if(!d)continue;const key=d.family??d.id;families.set(key,Math.max(families.get(key)??0,u.score));}return [...families.values()].reduce((sum,n)=>sum+n,0);
}
export function ruleGrade(score:number):RuleGrade {return scoreConfig.gradeThresholds.find(t=>score>=t.score)?.grade??'D';}
export function calculateEndingResult(game:GameState):EndingResult {
 if(game.endingResult)return structuredClone(game.endingResult);
 if(!game.gameOverReason)throw new Error('진행 중 게임에는 종료 결과가 없습니다.');
 const id=game.player.defeatedCountryId??game.player.controlledCountryId;
 const countryName=game.world.countries[id]?.identity?.name??game.history?.countries[id]?.currentOrFinalName??id;
 const region=game.player.controlledRegionId,regionName=region?game.world.regions[region]?.regionIdentity?.name??region:null;
 const achievements=structuredClone(game.achievements?.unlocked??[]),score=calculateAchievementScore(achievements);
 const victories=Object.values(game.history?.wars??{}).filter(w=>warOutcome(game,w.warId)==='won').length;
 return {...classifyEnding(game.gameOverReason,{situationalRisk:game.player.leaderRisk?.situationalRisk}),score,grade:ruleGrade(score),achievements,reignMonths:game.turn-1,finalAge:game.player.ageMonths,gameOverReason:game.gameOverReason,date:{...game.date},countryId:id,countryName,regionName,electionsWon:game.player.career.electionsWon,summary:{wars:game.history?.career.warsDuringRule??0,victories,countriesFounded:game.achievements?.unlocked.some(u=>u.achievementId==='independence')?1:0,majorCrises:game.history?.career.majorCrises??0}};
}
const index=(d:{year:number;month:number})=>d.year*12+d.month;
export function playerCountryAt(game:GameState,date:{year:number;month:number}):string|undefined {
 // Office changes can share a month. The most recently entered office owns that month's later actions.
 return game.history?.career.officesHeld.filter(o=>index(o.startDate)<=index(date)&&(!o.endDate||index(o.endDate)>=index(date))).at(-1)?.countryId;
}
export function warOutcome(game:GameState,id:string):'won'|'lost'|'draw'|'unrelated' {
 const w=game.history?.wars[id];if(!w?.endedDate)return 'unrelated';
 const playerId=playerCountryAt(game,w.startedDate);
 const attacking=!!playerId&&w.attackerIds.includes(playerId),defending=!!playerId&&w.defenderIds.includes(playerId);if(!attacking&&!defending)return 'unrelated';
 const attackerWins=['territory_transfer','reparations'].includes(w.result??'');
 const defenderWins=['defense_success','abandon_reunification'].includes(w.result??'');
 if(attackerWins)return attacking?'won':'lost';if(defenderWins)return defending?'won':'lost';
 if(w.result==='recognition')return w.warGoal==='recognition'?(attacking?'won':'lost'):(defending?'won':'lost');return 'draw';
}
