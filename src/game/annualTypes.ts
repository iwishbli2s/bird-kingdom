import type {GameDate} from './types';
export interface AnnualSnapshot {date:GameDate;turn:number;year:number;jurisdictionId:string;jurisdictionName:string;countryId:string;regionIds:string[];signature:string;values:Record<string,number>}
export interface AnnualMetricChange {key:string;label:string;startValue:number;endValue:number;absoluteChange:number;percentageChange?:number;unit:string}
export interface AnnualSummaryEvent {historyId:string;date:GameDate;title:string;description:string;category:string}
export interface AnnualSummary {id:string;year:number;jurisdictionId:string;jurisdictionName:string;headline:string;description:string;comparisonLabel:string;startDate:GameDate;endDate:GameDate;metrics:AnnualMetricChange[];majorEvents:AnnualSummaryEvent[];createdTurn:number;suppressAutomaticDisplay?:boolean}
export interface AnnualReportState {snapshot:AnnualSnapshot;periodStartTurn:number;eventStartOrder:number;countryIds:string[];regionIds:string[];summaries:AnnualSummary[]}
