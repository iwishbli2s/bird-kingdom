import type { GovernanceMetric } from '../game/governanceConfig';
export function governanceCategory(key: GovernanceMetric,value: number): string {
  const labels={approval:['위기','낮음','보통','높음','압도적 지지'],stability:['심각','불안','보통','안정','매우 안정'],integration:['분열','낮음','보통','높음','매우 높음']};
  return labels[key][value>=80?4:value>=65?3:value>=45?2:value>=30?1:0];
}
