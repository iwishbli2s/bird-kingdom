let strategicAIOverride:boolean|undefined;
let crisisRollOverride:number|undefined;
import { validateMortalityRisk } from './mortality';
import type { GameState } from './types';

let warRollOverride:number|undefined;
let eventRollOverride: number | undefined;
let electionRollOverride: number | undefined;
let mortalityRiskOverride: number | undefined;
let conflictRollOverride: number | undefined;
let secessionRollOverride: number | undefined;

declare global {
  interface Window {
    birdKingdomDebug?: { setStrategicAIEnabled:(enabled:boolean|null)=>void; setCrisisRoll:(roll:number|null)=>void; setWarRoll:(roll:number|null)=>void; setConflictRoll:(roll:number|null)=>void; getGameState:()=>GameState|null; setGameState: (game:GameState)=>void; setSecessionRoll:(roll:number|null)=>void; setMortalityRisk: (risk: number | null) => void; setEventRoll: (roll: number | null) => void; setElectionRoll: (roll: number | null) => void };
  }
}

export function installGameDebug(onLoad?:(game:GameState)=>void,onRead?:()=>GameState|null): void {
  window.birdKingdomDebug = { setStrategicAIEnabled(enabled){strategicAIOverride=enabled??undefined;},
    setCrisisRoll(roll){if(roll!==null&&(!Number.isFinite(roll)||roll<0||roll>=1))throw new RangeError('위기 난수는 0 이상 1 미만입니다.');crisisRollOverride=roll??undefined;},
    setWarRoll(roll){if(roll!==null&&(!Number.isFinite(roll)||roll<0||roll>=1))throw new RangeError('전쟁 난수는 0 이상 1 미만입니다.');warRollOverride=roll??undefined;},
    getGameState:()=>structuredClone(onRead?.()??null),
    setGameState(game) {
      if(!game.world?.countries[game.player.controlledCountryId]||game.date.month<1||game.date.month>12)throw new Error('유효한 테스트 상태가 필요합니다.');
      if(!onLoad)throw new Error('게임 상태 연결이 준비되지 않았습니다.');
      onLoad(structuredClone(game));
    },
    setConflictRoll(roll) {
      if(roll!==null&&(!Number.isFinite(roll)||roll<0||roll>=1))throw new RangeError('분쟁 난수는 0 이상 1 미만이어야 합니다.');
      conflictRollOverride=roll===null?undefined:roll;
    },
    setSecessionRoll(roll) {
      if(roll!==null&&(!Number.isFinite(roll)||roll<0||roll>=1))throw new RangeError('분리주의 난수는 0 이상 1 미만이어야 합니다.');
      secessionRollOverride=roll===null?undefined:roll;
    },
    setEventRoll(roll) {
      if (roll !== null && (!Number.isFinite(roll) || roll < 0 || roll >= 1)) throw new RangeError('사건 난수는0 이상1 미만이어야 합니다.');
      eventRollOverride = roll === null ? undefined : roll;
    },
    setElectionRoll(roll) {
      if (roll !== null && (!Number.isFinite(roll) || roll < 0 || roll >= 1)) throw new RangeError('선거 난수는0 이상1 미만이어야 합니다.');
      electionRollOverride = roll === null ? undefined : roll;
    },
    setMortalityRisk(risk) {
      mortalityRiskOverride = risk === null ? undefined : validateMortalityRisk(risk);
    },
  };
}

export function getDebugMortalityRisk(): number | undefined { return mortalityRiskOverride; }

export function getDebugElectionRoll(): number | undefined { return electionRollOverride; }

export function getDebugEventRoll(): number | undefined { return eventRollOverride; }
export function getDebugSecessionRoll(): number | undefined { return secessionRollOverride; }

export function getDebugConflictRoll(): number | undefined { return conflictRollOverride; }

export const getDebugWarRoll=()=>warRollOverride;

export const getDebugCrisisRoll=()=>crisisRollOverride;

// Fixed earlier-stage browser regressions can isolate the new strategic layer in development only.
export const getDebugStrategicAI=()=>strategicAIOverride;
