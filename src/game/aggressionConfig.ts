export const aggressionConfig = {
  recentMonths: 120, halfLifeMonths: 36,
  relationsLoss: 10, trustLoss: 14, threatBonus: 18, maxThreatBonus: 45,
  repeatWeight: .2, maxRepeatWeight: 1.6,
  defenderRally: 12, rallyMonths: 9,
  politicalCostAfterMonths: 18, approvalCost: .18, stabilityCost: .10,
  treatyBreachWeight: 1.2,
} as const;
