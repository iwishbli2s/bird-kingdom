import type { EventContext, GameState, Jurisdiction, SpeciesId, SecessionAction, InternalConflictState } from './types';
import { derivedCountryRuntime } from './runtime';
import { domesticBurden } from './strategicEvaluation';
export function parentReferendumResponse(game:GameState,j:Jurisdiction,id:SpeciesId):'approve'|'concede'|'refuse' {
 const r=j.kind==='region'?game.world.regions[j.id]:game.world.countries[j.id],p=r.speciesPolitics![id]!,m=r.secession![id]!,owner=j.kind==='region'?game.world.regions[j.id].ownerCountryId:j.id;
 const posture=game.world.strategicAI?.[owner]?.foreignPolicy??'cautious';
 const refusalCost=p.independenceSentiment*.5+(100-r.governance!.integration)*.3+Math.min(15,m.monthsActive/3)+(100-r.governance!.stability)*.1;
 const resistance=posture==='assertive'?25:posture==='defensive'?10:0;
 if(p.independenceSentiment>=65&&refusalCost>50+resistance)return 'approve';
 if(p.independenceSentiment<65&&m.grantedAutonomy<65)return 'concede';
 return refusalCost>70?'approve':'refuse';
}
export function scoreMovementAction(c:EventContext,id:SpeciesId,action:SecessionAction,dispute?:string):number {
 const p=c.runtime.speciesPolitics[id]!,m=c.runtime.secession![id]!,owner=c.jurisdiction.kind==='region'?c.game.world.regions[c.jurisdiction.id].ownerCountryId:c.jurisdiction.id;
 if(action==='expand'||action==='concede')return p.independenceSentiment>=80?-20:30+(100-p.satisfaction)*.2+(action==='expand'?15:0)-m.grantedAutonomy*.3;
 if(action==='approve'||action==='refuse'){const want=parentReferendumResponse(c.game,c.jurisdiction,id);return action===want?60:action==='refuse'?-p.independenceSentiment*.5:10;}
 if(action==='declare'){const own=derivedCountryRuntime(c.game.world,owner),u=domesticBurden(c.game,owner),military=c.game.world.countries[owner].military!;if(dispute==='parent_claims_reunification')return military.warSupport*.5+own.governance!.stability*.3-u.fiscal*.5-u.crisis*.5-(p.independenceSentiment-50);return dispute==='none'?30+u.fiscal*.2+u.crisis*.2:45;}
 if(['organize','charter','request','vote','agreement','found','celebrate'].includes(action))return 40;
 if(action==='withdraw')return p.independenceSentiment>70?-30:5;return 0;
}
export function conflictActionScore(game:GameState,id:string,c:InternalConflictState,action:string):number {
 const parent=id===c.parentCountryId,control=parent?100-c.territorialControl:c.territorialControl,fatigue=parent?c.parentFatigue:c.breakawayFatigue,support=parent?c.parentWarSupport:c.breakawayWarSupport,cap=parent?c.parentCapability:c.breakawayCapability,other=parent?c.breakawayCapability:c.parentCapability,u=domesticBurden(game,id);
 const pressure=cap/Math.max(1,other)*20+support*.5+control*.3-fatigue*.5-u.fiscal*.3-u.crisis*.3;
 const exhaustion=fatigue*.8+Math.max(0,50-support)*.8+c.monthsInConflict*.6+(100-control)*.15+u.fiscal*.2+u.crisis*.2;
 if(action==='recognize')return parent?exhaustion+(c.foundingIndependence>80?15:0)-control*.3:45;
 if(action==='accept_autonomy')return parent?45:exhaustion-c.foundingIndependence*.3;
 if(action==='force_reintegrate')return parent?80:-100;
 if(action==='defend_independence')return parent?-100:80;
 if(action==='ceasefire')return exhaustion;
 if(action==='negotiate')return exhaustion+10;
 if(['escalate','blockade','pressure','fail_negotiation'].includes(action))return pressure;
 return 5;
}
