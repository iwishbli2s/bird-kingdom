import {difficultyModifiers} from './difficulty';
import { collectHistory } from './history';
import { electionConfig as c } from './electionConfig';
import { aggregateSpeciesPoliticalInputs, calculateMinorityCrisisPressure } from './governance';
import { selectControlledRuntime } from './world';
import { createRandomSeed, createSeededRandom } from './random';
import type { ElectionSnapshot, GameState, MonthlyElectionMetrics, PoliticalCareerState } from './types';

export function createPoliticalCareer(office: PoliticalCareerState['office']): PoliticalCareerState {
  return {office,termNumber:1,monthsInCurrentTerm:0,termLengthMonths:c.termLengthMonths[office],electionsWon:0,electionsLost:0,history:[],lastElection:null};
}
export const isElectionDue = (career:PoliticalCareerState) => career.monthsInCurrentTerm>=career.termLengthMonths;
export function appendElectionMetrics(history: readonly MonthlyElectionMetrics[],metrics:MonthlyElectionMetrics): MonthlyElectionMetrics[] {
  return [...history,{...metrics}].slice(-c.historyLength);
}
export function averageElectionMetrics(history:readonly MonthlyElectionMetrics[],fallback:MonthlyElectionMetrics): MonthlyElectionMetrics {
  if(!history.length) return {...fallback};
  return Object.fromEntries(Object.keys(fallback).map(key=>[key,history.reduce((sum,m)=>sum+m[key as keyof MonthlyElectionMetrics],0)/history.length])) as unknown as MonthlyElectionMetrics;
}
export function calculateElectionScore(s:Omit<ElectionSnapshot,'score'|'reelectionChance'>):number {
  const w=c.weight,n=c.neutral;
  const approval=s.approval*w.currentApproval+s.averageApproval*w.averageApproval;
  // 고물가와 심한 디플레이션은 모두 불리하며 중립 물가2에서 보정0입니다.
  const inflationPenalty=Math.max(0,s.averageInflation-n.inflation)*w.inflation+Math.max(0,c.deflationThreshold-s.averageInflation)*c.deflation;
  return approval+(s.livingStandard-n.social)*w.living+(s.averageGrowth-n.growth)*w.growth-(s.averageUnemployment-n.unemployment)*w.unemployment
    -Math.max(0,s.averageUnemployment-c.unemploymentThreshold)*c.unemploymentExtra-inflationPenalty
    +(s.stability-n.social)*w.stability-Math.max(0,c.stabilityThreshold-s.stability)*c.stabilityExtra
    +(s.integration-n.social)*w.integration+(s.weightedSpeciesSatisfaction-n.social)*w.satisfaction-s.minorityCrisisPressure*w.crisis;
}
export function scoreToReelectionChance(score:number):number {
  return Math.min(c.maximumChance,Math.max(c.minimumChance,1/(1+Math.exp(-(score-c.neutral.approval)/c.logisticScale))));
}
export function createElectionSnapshot(game:GameState):ElectionSnapshot {
  const r=selectControlledRuntime(game),g=r.governance!,s=r.social!;
  const current={growth:r.economy.growth,unemployment:r.economy.unemployment,inflation:r.economy.inflation,approval:g.approval};
  const average=averageElectionMetrics(game.player.career.history,current);
  const inputs={stability:g.stability,integration:g.integration,...current,livingStandard:s.livingStandard,
    averageApproval:average.approval,averageGrowth:average.growth,averageUnemployment:average.unemployment,averageInflation:average.inflation,
    weightedSpeciesSatisfaction:aggregateSpeciesPoliticalInputs(r.population,r.speciesPolitics).satisfaction,minorityCrisisPressure:calculateMinorityCrisisPressure(r.population,r.speciesPolitics).pressure};
  const score=calculateElectionScore(inputs);
  return {...inputs,score,reelectionChance:Math.min(c.maximumChance,Math.max(c.minimumChance,scoreToReelectionChance(score)+difficultyModifiers(game).electionTolerance))};
}
export function rollElection(chance:number,random:()=>number):boolean {
  const sample=random();
  if(!Number.isFinite(sample)||sample<0||sample>=1)throw new RangeError('선거 난수는0 이상1 미만이어야 합니다.');
  return sample<chance;
}
export function advancePoliticalCareer(game:GameState):GameState {
  const r=selectControlledRuntime(game);
  const history=appendElectionMetrics(game.player.career.history,{growth:r.economy.growth,unemployment:r.economy.unemployment,inflation:r.economy.inflation,approval:r.governance!.approval});
  return {...game,player:{...game.player,career:{...game.player.career,monthsInCurrentTerm:game.player.career.monthsInCurrentTerm+1,history}}};
}
function resolveElectionCore(game:GameState,random?:()=>number):GameState {
  if(game.gameOverReason||!game.player.alive||!isElectionDue(game.player.career))return game;
  const snapshot=createElectionSnapshot(game);
  const won=rollElection(snapshot.reelectionChance,random??createSeededRandom(createRandomSeed()));
  const before=game.player.career;
  const career={...before,termNumber:before.termNumber+(won?1:0),monthsInCurrentTerm:won?0:before.monthsInCurrentTerm,
    electionsWon:before.electionsWon+(won?1:0),electionsLost:before.electionsLost+(won?0:1),lastElection:{date:{...game.date},turn:game.turn,termNumber:before.termNumber,won,snapshot}};
  return {...game,gameOverReason:won?null:'election_defeat',player:{...game.player,career}};
}

export function resolveElection(...args:Parameters<typeof resolveElectionCore>):GameState { return collectHistory(args[0],resolveElectionCore(...args)); }


