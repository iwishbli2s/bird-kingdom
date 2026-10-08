export type PoliticalMetric = 'satisfaction' | 'politicalInfluence' | 'autonomyDemand' | 'independenceSentiment';
const categories: Record<PoliticalMetric, readonly [number, string][]> = {
  satisfaction: [[80, '매우 높음'], [65, '높음'], [45, '보통'], [25, '낮음'], [0, '매우 낮음']],
  politicalInfluence: [[80, '매우 높음'], [60, '높음'], [40, '보통'], [20, '낮음'], [0, '매우 낮음']],
  autonomyDemand: [[80, '매우 높음'], [60, '높음'], [40, '주의'], [20, '낮음'], [0, '미미']],
  independenceSentiment: [[80, '극심'], [60, '심각'], [40, '상당'], [20, '존재'], [0, '미미']],
};
export const politicalMetricCategory = (metric: PoliticalMetric, value: number) => categories[metric].find(([minimum]) => value >= minimum)?.[1] ?? categories[metric].at(-1)![1];
