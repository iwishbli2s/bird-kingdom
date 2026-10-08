import type {GameState,GameDate} from './types';
import type {AchievementState,PlayerOrigin} from './achievementTypes';
import {achievementDefinitions,achievementConfig as config} from './achievementConfig';
import {calculateEndingResult,warOutcome,playerCountryAt} from './endings';
import {regions} from './data';
let monthlyBatchDepth=0;
/** Commands still award immediately; the monthly ending snapshot waits for final annual history. */
export function withAchievementMonth<T>(action:()=>T):T {monthlyBatchDepth++;try{return action();}finally{monthlyBatchDepth--;}}

export function createPlayerOrigin(game:GameState,verified=true):PlayerOrigin {
 const first=game.history?.career.officesHeld[0];
 const country=first?.countryId??game.player.controlledCountryId,region=first?.regionId??game.player.controlledRegionId;
 return {startingCountryId:country,...(region?{startingStateId:region}:{}),startedAsFederationState:country==='pigeon'&&!!region,federationRegionIds:regions.filter(r=>r.initialOwnerCountryId==='pigeon').map(r=>r.id),verified};
}
export function emptyAchievementState(game:GameState):AchievementState {
 return {unlocked:[],progress:{lastMonthTurn:game.turn,lastYear:2029,peaceMonths:0,economicYears:0,technologyYears:0,goldenYears:0,cohesionYears:0,fiscalYears:0,independentCountryId:null,absorbedFederationRegionIds:[]}};
}
export function visibleAchievements(game:GameState){return achievementDefinitions.filter(d=>!d.hidden||game.achievements?.unlocked.some(u=>u.achievementId===d.id));}
/** Awards do not change any simulation state or consume random numbers. */
export function evaluateAchievements(previous:GameState,game:GameState,annual=false):GameState {
 if(game.endingResult)return game;
 const state=game.achievements??emptyAchievementState(game),origin=game.player.origin;
 const next:AchievementState={unlocked:[...state.unlocked],progress:{...state.progress,absorbedFederationRegionIds:[...state.progress.absorbedFederationRegionIds]}};
 if(previous.player.controlledCountryId!==game.player.controlledCountryId||previous.player.controlledRegionId!==game.player.controlledRegionId){
   // A new jurisdiction does not inherit years of the former federation's national leadership.
   for(const key of ['economicYears','technologyYears','goldenYears','cohesionYears','fiscalYears'] as const)next.progress[key]=0;
 }
 const award=(id:string,date:GameDate=game.date)=>{if(next.unlocked.some(u=>u.achievementId===id))return;const d=achievementDefinitions.find(d=>d.id===id)!;next.unlocked.push({achievementId:id,unlockedAt:{...date},score:d.score});};
 const tier=(value:number,low:number,high:number,a:string,b:string,date?:GameDate)=>{if(value>=low)award(a,date);if(value>=high)award(b,date);};
 tier(game.turn-1,600,1200,'reign-50','reign-100');
 // Existing career wins survive office transitions; a loss ends this campaign.
 tier(game.player.career.electionsWon,10,20,'election-10','election-20');
 const countryId=game.player.defeatedCountryId??game.player.controlledCountryId,country=game.world.countries[countryId];
 const atWar=Object.values(game.world.warfare?.wars??{}).some(w=>w.status!=='resolved'&&w.participants[countryId]);
 if(annual&&game.turn>next.progress.lastMonthTurn){next.progress.peaceMonths=atWar?0:next.progress.peaceMonths+(game.turn-next.progress.lastMonthTurn);next.progress.lastMonthTurn=game.turn;}
 // Even a war started and settled between month ticks interrupts uninterrupted peace.
 if(atWar||Object.values(game.world.warfare?.wars??{}).some(w=>!previous.world.warfare?.wars[w.id]&&w.participants[countryId]))next.progress.peaceMonths=0;
 tier(next.progress.peaceMonths,600,1200,'peace-50','peace-100');
 if(annual&&(game.history?.yearlySnapshots.at(-1)?.year??0)>next.progress.lastYear){for(const y of game.history?.yearlySnapshots??[]){if(y.year<=next.progress.lastYear)continue;
   const c=y.countries.find(c=>c.countryId===countryId);
   const consecutive=y.year===next.progress.lastYear+1;for(const key of ['economicYears','technologyYears','goldenYears','cohesionYears','fiscalYears'] as const)if(!consecutive)next.progress[key]=0;
   const leader=(key:'gdp'|'technologyScore')=>!!c&&y.countries.length>=2&&y.countries.every(other=>other.countryId===countryId||c[key]>other[key]);
   next.progress.economicYears=leader('gdp')?next.progress.economicYears+1:0;
   next.progress.technologyYears=leader('technologyScore')?next.progress.technologyYears+1:0;
   next.progress.goldenYears=c&&Math.min(c.livingStandard,c.education,c.healthcare,c.publicSafety)>=config.goldenSocial&&c.inequality<=config.goldenInequality?next.progress.goldenYears+1:0;
   next.progress.cohesionYears=c&&c.stability>=config.cohesionStability&&c.integration>=config.cohesionIntegration?next.progress.cohesionYears+1:0;
   next.progress.fiscalYears=c&&c.gdp>0&&c.debt/c.gdp<=config.fiscalDebtRatio&&c.livingStandard>=config.fiscalLiving?next.progress.fiscalYears+1:0;
   next.progress.lastYear=y.year;
   // A state governor cannot claim the entire federation's economic/social achievements.
   if(!game.player.controlledRegionId){tier(next.progress.economicYears,5,20,'economy-5','economy-20',y.date);tier(next.progress.technologyYears,5,20,'technology-5','technology-20',y.date);if(next.progress.goldenYears>=10)award('golden-age',y.date);if(next.progress.cohesionYears>=25)award('cohesion',y.date);if(next.progress.fiscalYears>=10)award('fiscal',y.date);}
 }}
 const offices=game.history?.career.officesHeld??[];
 const controlledCrisis=(c:NonNullable<GameState['history']>['crises'][string])=>offices.some(o=>o.countryId===c.countryId&&(!o.regionId||o.regionId===c.jurisdictionId));
 if(previous.world.crises!==game.world.crises||!previous.achievements){const severe=Object.values(game.history?.crises??{}).filter(c=>controlledCrisis(c)&&c.maxSeverity>=config.severeCrisis&&c.endReason==='complete');tier(severe.length,1,3,'crisis-1','crisis-3');}
 if(previous.world.warfare!==game.world.warfare||!previous.achievements){
   const wars=Object.values(game.history?.wars??{}),won=wars.filter(w=>warOutcome(game,w.warId)==='won');
   if(won.length>=5&&!wars.some(w=>warOutcome(game,w.warId)==='lost'))award('undefeated');
   for(const w of won){const raw=game.world.warfare?.wars[w.warId],snapshot=raw?.capabilityAtStart,id=playerCountryAt(game,w.startedDate);if(!snapshot||!id)continue;const other=w.attackerIds.includes(id)?w.defenderIds:w.attackerIds;const ourSide=w.attackerIds.includes(id)?w.attackerIds:w.defenderIds;const our=ourSide.reduce((sum,id)=>sum+(snapshot[id]??0),0),their=other.reduce((sum,id)=>sum+(snapshot[id]??0),0);if(our>0&&their>=our*config.giantRatio)award('giant-slayer');}
 }
 if(origin?.verified&&origin.startedAsFederationState&&origin.startingStateId&&country?.identity?.isDynamic&&country.identity.originCountryId===origin.startingCountryId&&!game.player.controlledRegionId){
   const startRegion=game.world.regions[origin.startingStateId];
   const founding=game.history?.countries[countryId],firstPresidency=offices.find(o=>o.office==='president'&&o.countryId===countryId);
   const originatedHere=firstPresidency&&offices.some(o=>o.regionId===origin.startingStateId&&o.countryId===origin.startingCountryId)&&founding?.originCountryId===origin.startingCountryId;
   if(startRegion?.ownerCountryId===countryId&&originatedHere&&country.identity.status==='established'){
     next.progress.independentCountryId??=countryId;
     if(next.progress.independentCountryId===countryId){award('independence');if(founding.foundingType==='legal_independence')award('peaceful-independence');}
   }
 }
 const independent=next.progress.independentCountryId;
 if(origin?.verified&&independent&&independent===game.player.controlledCountryId){
   for(const id of origin.federationRegionIds){if(id===origin.startingStateId)continue;
     // Proof is an actual archived direct transfer from the old federation, not merely current ownership.
     if(game.history?.countries[independent]?.territorialChanges.some(c=>c.regionId===id&&c.fromId===origin.startingCountryId&&c.toId===independent)&&!next.progress.absorbedFederationRegionIds.includes(id))next.progress.absorbedFederationRegionIds.push(id);
   }
   if(!game.world.countries[origin.startingCountryId]&&game.history?.countries[origin.startingCountryId]?.dissolvedDate&&origin.federationRegionIds.every(id=>game.world.regions[id]?.ownerCountryId===independent&&(id===origin.startingStateId||next.progress.absorbedFederationRegionIds.includes(id))))award('reverse-federation');
 }
 const sovereign=Object.values(game.world.countries).filter(c=>c.identity?.status==='established');
 if(!game.player.controlledRegionId&&country?.identity?.status==='established'&&sovereign.length===1&&sovereign[0].id===countryId&&Object.keys(game.world.countries).length===1&&Object.values(game.world.regions).every(r=>r.ownerCountryId===countryId))award('world-unification');
 let result:GameState={...game,achievements:next};
 if(result.gameOverReason&&!monthlyBatchDepth)result={...result,endingResult:calculateEndingResult(result)};
 return result;
}

/** Legacy records can prove origin, but an absent lineage never grants the hidden award. */
export function migrateAchievementState(game:GameState):GameState {
 let next=game;
 if(!next.player.origin){const first=next.history?.career.officesHeld[0];next={...next,player:{...next.player,origin:createPlayerOrigin(next,!!first&&first.startDate.year===2030&&first.startDate.month===1&&['sparrow','pigeon'].includes(first.countryId))}};}
 if(!next.achievements){next={...next,achievements:emptyAchievementState(next)};return evaluateAchievements({...next,achievements:undefined},next,true);}
 if(next.gameOverReason&&!next.endingResult)return {...next,endingResult:calculateEndingResult(next)};
 return next;
}
