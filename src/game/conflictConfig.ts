export const conflictConfig={
  existingRegionControl:70,dynamicRegionControl:60,initialTension:40,
  minimumStandoffMonths:3,escalationTension:65,dominanceMonths:3,
  maxMonthlyControlChange:5,monthlyNoise:.45,
  fatigueGrowth:1.25,stalemateFatigue:.5,ceasefireRecovery:.7,
  parentCostRate:.0005,breakawayCostRate:.0008,
  parentIndustryLoss:.001,breakawayIndustryLoss:.002,
  populationOutflow:.00006,longConflictMonths:12,
  negotiationPressureMonths:36,mandatoryMediationMonths:120,
} as const;
export const conflictStatusLabels={political_standoff:'정치적 대치',armed_conflict:'무력충돌',ceasefire:'휴전',negotiation:'협상',resolved:'해결'} as const;
export const conflictResolutionLabels={independence_recognized:'독립 최종 승인',independence_defended:'독립 방어 성공',negotiated_reintegration:'확대 자치 재통합',forced_reintegration:'강제 재통합'} as const;
