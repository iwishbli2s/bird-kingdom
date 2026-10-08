// Earlier-stage regression scenarios keep NPC policies fixed. AI-on integration is tested in ai.test.ts.
export * from '../src/game/engine';
import { advanceMonth as advance, type AdvanceMonthOptions } from '../src/game/engine';
import type { GameState } from '../src/game/types';
export function advanceMonth(game:GameState,options:AdvanceMonthOptions={}){return advance(game,{...options,domesticAI:false,strategicAI:false});}

import {createGame as initial} from '../src/game/engine';
export function createGame(...args:Parameters<typeof initial>){return {...initial(...args),policyScheduleEnabled:false};}

