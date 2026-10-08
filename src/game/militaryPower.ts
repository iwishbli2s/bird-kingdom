import type { CountryRuntimeState } from './types';
export const clampMilitary=(n:number,min=0,max=100)=>Math.min(max,Math.max(min,n));
/** 내전과 국제전쟁이 공유하는 경제·산업·인구 기반 능력입니다. */
export function calculateBaseMilitaryPower(r:CountryRuntimeState,activeCount=1):number {
  const e=r.economy,f=r.fiscal,g=r.governance,s=r.social;
  const raw=12*Math.log1p(Math.sqrt(Math.max(0,e.gdp)/100))+8*Math.log1p(Math.sqrt(Math.max(0,r.population.total)/1e6))
    +14*Math.log1p(Math.sqrt(Math.max(0,e.industries.defense.output)/10))+.7*f.budgetPolicy.defense+(g?.stability??50)*.12+(s?.publicSafety??50)*.08+Math.min(8,Math.sqrt(Math.max(0,f.treasury)/10));
  return clampMilitary(raw/Math.sqrt(1+.15*Math.max(0,activeCount-1)));
}
