export const warfareConfig={
  maxControlChange:5,monthlyNoise:.4,occupationThreshold:75,decisiveThreshold:90,decisiveMonths:3,
  fatigueGrowth:1.1,recovery:.8,warCostRate:.0008,ceasefireCostRate:.0001,industryLoss:.0015,
  occupationLoss:.003,occupationRevenueLoss:.15,frontMigrationOutflow:.00008,truceMonths:12,
  mobilizationStep:5,readinessStep:1,defenseBudgetStep:.15,longWarMonths:12,mandatoryPeaceMonths:120,
} as const;
export const warGoalLabels={border_claim:'영토 경계 주장',reunification:'재통합 요구',defense:'본토 방어',punitive:'제한적 응징',recognition:'독립 승인 요구'} as const;
export const warStatusLabels={active:'전쟁 중',ceasefire:'휴전 중',peace_negotiation:'평화협상',resolved:'전쟁 종료'} as const;
export const warResolutionLabels={status_quo:'현상유지 평화',territory_transfer:'영토 이전',recognition:'독립 승인',abandon_reunification:'재통합 주장 포기',reparations:'일시 배상',defense_success:'방어 성공'} as const;

export const casusBelliLabels={territorial_dispute:'영토 분쟁',breakaway_claim:'출신 둥지권 재통합 청구',sanctions_escalation:'제재 확대 위기',border_incident:'비행경계 충돌',ally_attacked:'동맹국 피격'} as const;
