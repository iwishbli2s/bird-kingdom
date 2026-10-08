import type { GameDate, Jurisdiction } from './types';
export type AIGovernmentProfile='balanced'|'industrial'|'social'|'research'|'agricultural'|'security';
export type AIStrategy='normal'|'growth'|'fiscal_repair'|'social_recovery'|'crisis_response'|'research_push'|'security_focus';
export interface AIUrgencies {recession:number;unemployment:number;inflation:number;fiscal:number;social:number;instability:number;crisis:number;researchLag:number}
export interface AIDecisionScore {growth:number;fiscal:number;social:number;stability:number;research:number;crisis:number;total:number}
export interface AIDecisionRecord {date:GameDate;turn:number;governmentId:string;type:'strategy'|'tax'|'budget'|'research'|'event';summary:string;reasonCodes:string[];choiceId?:string}
export interface GovernmentAIState {profile:AIGovernmentProfile;currentStrategy:AIStrategy;strategyMonths:number;policyCooldowns:{taxes:number;budget:number;research:number};lastDecisionMonth:number;recentDecisions:AIDecisionRecord[];economicHistory:{gdp:number;growth:number;balance:number}[]}
export interface GovernmentDescriptor {id:string;name:string;countryId:string;jurisdiction:Jurisdiction;federal:boolean}
