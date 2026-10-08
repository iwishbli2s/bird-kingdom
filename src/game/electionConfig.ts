export const electionConfig = {
  termLengthMonths: { president: 48, governor: 48 }, historyLength: 12,
  neutral: { approval: 50, social: 50, growth: 2, unemployment: 5, inflation: 2 },
  weight: { currentApproval: .7, averageApproval: .3, living: .2, growth: 1.2, unemployment: 1.5, inflation: .5, stability: .15, integration: .05, satisfaction: .08, crisis: .03 },
  unemploymentThreshold: 10, unemploymentExtra: .5, deflationThreshold: -2, deflation: .3,
  stabilityThreshold: 30, stabilityExtra: .15,
  logisticScale: 9, minimumChance: .02, maximumChance: .98,
} as const;
