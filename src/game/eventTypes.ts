import type { CasusBelliType, WarAction, WarResolution } from './warfareTypes';
import type { DiplomaticAction } from './diplomacyTypes';
import type { ConflictAction } from './conflictTypes';
import type { SecessionAction, TerritorialDisputeStatus } from './secessionTypes';
import type { CountryRuntimeState, GameDate, GameState, GovernanceState, IndustryId, SocialState, SpeciesId, SpeciesPoliticalState, SpeciesPoliticsState } from './types';
export type EventCategory = 'ecology'|'population'|'economy'|'social'|'species'|'governance'|'disaster';
export type EventSeverity = 1|2|3;
export interface Jurisdiction { kind:'country'|'region'; id:string }
export type EventRuntime = CountryRuntimeState & {social:SocialState;governance:GovernanceState;speciesPolitics:SpeciesPoliticsState};
export interface EventContext { strategicAIEnabled?:boolean; crisisId?:string; game:GameState; jurisdiction:Jurisdiction; runtime:EventRuntime; conflictId?:string; diplomaticTargetId?:string; warId?:string }
export type EventEffect =
  | {kind:"start_crisis";crisisType:import("./crisisTypes").CrisisType;severity:number;sourceEventId:string;protection?:number;activityReduction?:number}
  | {kind:"crisis_recovery";crisisId:string;value:number;aid?:boolean}
  | {kind:"leader_risk";value:number;months:number}

  | {kind:'research';domain:import('./technologyTypes').TechnologyDomain;progress:number}
  | {kind:'war';warId:string;action?:WarAction;resolution?:WarResolution}
  | {kind:'casus_belli';targetId:string;type:CasusBelliType;regionId?:string}
  | {kind:'diplomacy';targetId:string;action?:DiplomaticAction;relations?:number;trust?:number;threatShockMonths?:number}
  | {kind:'conflict';conflictId:string;action:ConflictAction}
  | {kind:'movement';speciesId:SpeciesId;action:SecessionAction;dispute?:TerritorialDisputeStatus}
  | {kind:'treasury';amount:number}
  | {kind:'industry';industryId:IndustryId;multiplier:number;productivityMultiplier?:number}
  | {kind:'population';speciesId:SpeciesId;ratio:number;flow:'migration'|'death'|'birth'}
  | {kind:'social';metric:'livingStandard'|'education'|'healthcare'|'publicSafety'|'inequality';delta:number}
  | {kind:'species';speciesId:SpeciesId;metric:'satisfaction'|'autonomyDemand'|'independenceSentiment';delta:number}
  | {kind:'governance';metric:'approval'|'stability'|'integration';delta:number}
  | {kind:'inflation';delta:number};
export interface EventChoiceDefinition {
  id:string;label:string;preview:string;
  labelFor?: (context:EventContext)=>string;
  effects:(context:EventContext,severity:EventSeverity,outcome:number)=>{immediate:EventEffect[];ongoing?:{months:number;effects:EventEffect[]}[]};
}
export interface GameEventDefinition {
  id:string;title:string;description:string;category:EventCategory;tone:'positive'|'mixed'|'negative';
  baseMonthlyChance:number;cooldownMonths:number; priority?: boolean; crisisEvent?:boolean; conflictEvent?: boolean; diplomacyEvent?:boolean; warEvent?:boolean;
  eligible:(context:EventContext)=>boolean;calculateChance:(context:EventContext)=>number;severity:(context:EventContext)=>EventSeverity;
  choices:EventChoiceDefinition[];nonPlayerChoiceId:string;tags:readonly string[];
}
export interface PendingEvent {crisisId?:string;warId?:string;id:string;eventId:string;date:GameDate;turn:number;jurisdiction:Jurisdiction;severity:EventSeverity;conflictId?:string;jurisdictionName?:string;diplomaticTargetId?:string}
export interface ActiveEventEffect {id:string;sourceEventId:string;jurisdiction:Jurisdiction;remainingMonths:number;effects:EventEffect[]}
export interface EventHistoryEntry extends PendingEvent {choiceId:string;choiceLabel:string;title:string;category:EventCategory;playerChoice:boolean}
export interface EventState {pendingEvent:PendingEvent|null;cooldowns:Record<string,number>;activeEffects:ActiveEventEffect[];history:EventHistoryEntry[]}
export type SpeciesEventMetric = Extract<keyof SpeciesPoliticalState,'satisfaction'|'autonomyDemand'|'independenceSentiment'>;
