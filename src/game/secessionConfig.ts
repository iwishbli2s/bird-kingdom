import type { SpeciesId } from './types';
export const secessionConfig = {
  organizingAutonomy:45, organizingIndependence:25, charterMonths:6,
  campaignMonths:12, minimumActiveMonths:24, referendumAutonomy:65, referendumIndependence:50,
  ballotDelay:6, transitionMonths:6, refusalWindow:24,
  unilateralIndependence:80, unilateralAutonomy:80, unilateralSatisfaction:25, unilateralIntegration:35,
  majorityTransferMin:.35, majorityTransferRange:.35, minorityTransfer:.025,
  autonomySatisfaction:.08, autonomyDemandRelief:.18, autonomyIndependenceRelief:.10,
} as const;
export const initialAutonomy: Record<string,Partial<Record<SpeciesId,number>>> = {
  sparrow:{sparrow:10,crow:20,swallow:15,magpie:15},
  'pigeon-state':{pigeon:55,eagle:25,owl:25,duck:25},
  'eagle-state':{eagle:60,pigeon:25,owl:25,duck:25},
  'owl-state':{owl:58,pigeon:25,eagle:25,duck:25},
  'duck-state':{duck:58,pigeon:25,eagle:25,owl:25},
};
export const nationNames: Record<SpeciesId,string> = {sparrow:'참새공화국',crow:'까마귀공화국',swallow:'제비공화국',magpie:'까치공화국',pigeon:'비둘기공화국',eagle:'독수리공화국',owl:'부엉이공화국',duck:'오리공화국'};
export const phaseLabels = {inactive:'비활성',organizing:'자치운동 조직',autonomy_campaign:'자치권 운동',referendum_campaign:'주민투표 운동',referendum_scheduled:'주민투표 예약',transition:'독립 이행',unilateral_crisis:'일방 독립 위기',completed:'절차 완료'} as const;
