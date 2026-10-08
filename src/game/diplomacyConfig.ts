export const diplomacyConfig = {
  cooldownMonths:3, improveCostRate:.0005, tradeAnnualBonus:.004, sanctionTradeFactor:.2,
  sanctionTargetPenalty:.002, tradeLossPenalty:.003, maxAnnualTradeAdjustment:.006,
  passageAnnualMigration:.03, initial:{relations:20,trust:45,threat:25,tradeLevel:35},
} as const;
export const diplomaticActionLabels = {
  improve:'관계 개선 사절단', trade:'무역 협정 제안', non_aggression:'불가침조약 제안', defense:'상호방위조약 제안',
  recognize:'독립 승인', withdraw_recognition:'승인 철회', sanction:'제재 부과', lift_sanctions:'제재 해제',
  break_non_aggression:'불가침조약 파기', break_defense:'상호방위조약 파기', passage:'철새 이동협정 제안', support_parent:'부모국 지지',
} as const;
export const diplomaticActionDescriptions = {
  improve:'관계 +6 · 신뢰 +1 · GDP의 0.05% 국고 비용', trade:'상호 승인·관계 0+·제재 없음 · 수락 시 무역 +15',
  non_aggression:'상호 승인·관계 20+·신뢰 35+ · 수락 시 신뢰 상승·위협 감소',
  defense:'불가침조약·관계 60+·신뢰 65+ · 수락 시 방위조약 체결',
  recognize:'미승인 신생국 · 관계 +15·신뢰 +5 · 부모국의 항의 가능',
  withdraw_recognition:'승인한 신생국 · 관계 -25·신뢰 -20 · 무역 충격',
  sanction:'승인한 국가 · 관계 -20·신뢰 -12 · 무역 감소·양국 경제 부담',
  lift_sanctions:'내가 부과한 제재 해제 · 관계 +4 · 무역의 점진 회복',
  break_non_aggression:'체결한 조약 · 신뢰 -20·관계 -15 · 위협 12개월 상승',
  break_defense:'체결한 방위조약 · 신뢰 -25·관계 -20 · 위협 12개월 상승',
  passage:'상호 승인·관계 10+·제재 없음 · 관계 상승·철새 순이동 소폭 개선',
  support_parent:'제3국의 분쟁 당사 부모국 · 부모 관계 +5·독립국 관계 -8',
} as const;
