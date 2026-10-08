import type {GameState,Jurisdiction} from './types';
export type Difficulty='easy'|'normal'|'hard';
export interface DifficultyModifiers {economicShock:number;crisisDamage:number;crisisRecovery:number;electionTolerance:number;situationalMortality:number}
export const difficultyConfig:Record<Difficulty,{label:string;description:string;modifiers:DifficultyModifiers}>={
 easy:{label:'쉬움',description:'큰 경제 충격과 위기 피해 10% 감소, 회복 10% 빠름, 재선확률 +4%p, 상황위험 10% 감소.',modifiers:{economicShock:.9,crisisDamage:.9,crisisRecovery:1.1,electionTolerance:.04,situationalMortality:.9}},
 normal:{label:'보통',description:'기본 규칙입니다. 세계와 NPC는 모든 난이도에서 같은 규칙을 사용합니다.',modifiers:{economicShock:1,crisisDamage:1,crisisRecovery:1,electionTolerance:0,situationalMortality:1}},
 hard:{label:'어려움',description:'큰 경제 충격과 위기 피해 10% 증가, 회복 10% 느림, 재선확률 −4%p, 상황위험 10% 증가.',modifiers:{economicShock:1.1,crisisDamage:1.1,crisisRecovery:.9,electionTolerance:-.04,situationalMortality:1.1}},
};
export const difficultyNames=Object.keys(difficultyConfig) as Difficulty[];
export function validateDifficulty(value:unknown):asserts value is Difficulty {if(!difficultyNames.includes(value as Difficulty))throw new Error('유효하지 않은 난이도입니다.');}
export const difficultyModifiers=(game:Pick<GameState,'difficulty'>)=>difficultyConfig[game.difficulty??'normal'].modifiers;
/** Uses current control after independence or territory changes; administrative regions do not receive a second modifier. */
export function isPlayerJurisdiction(game:GameState,j:Jurisdiction):boolean {
 const country=game.world.countries[game.player.controlledCountryId];
 const selected=game.player.controlledRegionId;
 const members=Object.values(game.world.regions).filter(r=>r.ownerCountryId===game.player.controlledCountryId&&r.simulationRole!=='administrative');
 const region=selected??(country?.identity?.isDynamic&&members.length===1?members[0].id:null);
 return region?j.kind==='region'&&j.id===region:j.kind==='country'&&j.id===game.player.controlledCountryId;
}
export const jurisdictionDifficulty=(game:GameState,j:Jurisdiction)=>isPlayerJurisdiction(game,j)?difficultyModifiers(game):difficultyConfig.normal.modifiers;
