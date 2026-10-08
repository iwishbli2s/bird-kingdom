export * from '../src/game/events';
import { generateWorldEvents as generate, type EventOptions } from '../src/game/events';
import type { GameState } from '../src/game/types';
export function generateWorldEvents(game:GameState,options:EventOptions={}){return generate(game,{...options,domesticAI:false,strategicAI:false});}

import { resolvePendingEvent as resolve } from '../src/game/events';
export function resolvePendingEvent(game:GameState,choice:string,outcome?:()=>number,secession?:()=>number){return resolve(game,choice,outcome,secession,false);}
