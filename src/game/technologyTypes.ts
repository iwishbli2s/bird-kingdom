import type { GameDate, IndustryId, SocialState } from './types';
export type TechnologyDomain='agriculture'|'industry'|'infrastructure'|'medicine'|'information'|'military';
export type TechnologyEffect=
 |{type:'industry_growth'|'productivity';industry:IndustryId;value:number}
 |{type:'social_target';metric:keyof Pick<SocialState,'healthcare'|'education'|'publicSafety'|'livingStandard'>;value:number}
 |{type:'population_mortality'|'military_readiness'|'military_logistics'|'military_capability'|'research_bonus';value:number}
 |{type:'event_damage_modifier';tag:string;value:number};
export interface TechnologyDefinition {id:string;domain:TechnologyDomain;name:string;description:string;requiredLevel:number;resultLevel:number;researchCost:number;prerequisites:string[];effects:TechnologyEffect[]}
export interface TechnologyDomainState {level:number;progress:number;currentResearchId:string|null}
export interface TechnologyBonuses {growth:Partial<Record<IndustryId,number>>;productivity:Partial<Record<IndustryId,number>>;social:Partial<Record<'healthcare'|'education'|'publicSafety'|'livingStandard',number>>;mortality:number;readiness:number;logistics:number;capability:number;research:number;eventDamage:Record<string,number>}
export interface TechnologyState {domains:Record<TechnologyDomain,TechnologyDomainState>;researchCapacity:number;innovationEfficiency:number;unlockedTechnologies:string[];baselineUnlockedTechnologies:string[];researchProgress:Record<string,number>;aggregateBonuses?:TechnologyBonuses}
export interface TechnologyHistoryEntry {id:string;date:GameDate;jurisdictionId:string;jurisdictionName:string;technologyId:string;technologyName:string}
