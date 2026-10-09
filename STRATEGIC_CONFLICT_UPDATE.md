# Bird Kingdom — v1.1 Conflict Update 5/5

기존 정치·경제·군사·외교 상태를 이용하는 전략 판단을 추가했습니다. 군사·의회·국제기구 등 새 시스템은 없습니다. 성향과 경험은 기존 데이터에서 파생하며 saveVersion 6을 유지합니다.

## 요청한 105개 완료 보고

1. **수정/추가 파일**: `strategicConflictProfile.ts`, `strategicInvasion.ts`, `federalStrategy.ts`, `strategyFixtures.ts`, `strategicConflict.test.ts`, `strategy-smoke.cjs`, `strategyRun.ts`, `strategyConditional.ts`, `strategyStress.ts`, `strategyBenchmark.ts` 추가. `engine.ts`, `strategicAI.ts`, `strategicEvaluation.ts`, `federalPolitics.ts`, `stateRelations.ts`, `StrategicView.tsx`, `package.json`, `README.md` 연결 수정.
2. **AI conflict profile 구조**: aggression/caution/opportunism/escalationBias/deescalationBias/autonomyTolerance/diplomaticRiskTolerance, 모두 0~100 파생값.
3. **기존 AI profile과 통합 방법**: 기존 balanced/industrial/social/research/agricultural/security 및 foreign posture에 연결합니다. 별도 저장 personality 시스템을 만들지 않았습니다.
4. **참새 AI 성향**: 기본 공격 28·신중 76. 안정·경제·외교 비용을 중시하지만 명확한 우위에서는 공격할 수 있습니다.
5. **연방정부 AI 성향**: 기본 공격 46·신중 58·자치 관용 40. 주들의 동시 불만과 강경 대응 누적 비용을 평가합니다.
6. **비둘기주 성향**: 기본 공격 35·신중 65·기회 62. 연방 내부 정치·경제 영향력을 선호합니다.
7. **독수리주 성향**: 기본 공격 75·신중 35·기회 70. 지지와 감당 능력이 있을 때 강경 행동을 선호합니다. 자동 독립·전쟁은 없습니다.
8. **부엉이주 성향**: 기본 공격 40·신중 70·기회 78. 계산적 협력과 선택적 독자 노선입니다.
9. **오리주 성향**: 기본 공격 30·신중 73·완화 72. 생활·재정 기반의 이해를 중시합니다.
10. **dynamic country 성향 상속**: 건국 종족 성향 65%+중립 35%를 기반으로 기존 정부 profile·건국 분쟁·현재 재정·전쟁 이력을 함께 반영합니다. 영토 정복이 건국 계보를 덮어쓰지 않습니다.
11. **aggression**: 전쟁 효용의 .32 가중치 및 공격적 posture에 반영합니다. 단독 전쟁 조건이 아닙니다.
12. **caution**: 전쟁 효용에서 .28 비용, CB 대기와 cautious posture에 반영합니다.
13. **opportunism**: 전쟁 효용 .20 및 기다림 비용 완화에 반영합니다.
14. **escalation bias**: 연방 요구·대치와 조건부 주간 정책 견제에 반영합니다.
15. **de-escalation bias**: 연방 재협상·후퇴 및 협력적 posture에 반영합니다.
16. **autonomy tolerance**: 연방 양보·협상 점수에 반영합니다.
17. **diplomatic risk tolerance**: 제재·고립 비용을 완화하지만 제거하지 않습니다.
18. **unjustified war utility**: 군사비율·재정·피로·기존 전쟁·관계·신뢰·외교 압력·동맹·국제고립·침략 이력·지지·성향을 평가합니다.
19. **justified war bonus**: 유효 CB가 있으면 침략 평가에서도 +22. 기존 명분 전쟁 scorer와 선언 domain을 유지합니다.
20. **CB 대기 판단**: 외교 압력을 CB 기회의 proxy로 쓰고 신중함·기회주의에 따라 대기 가치를 계산합니다. 특정 사건의 확정 발생을 예측하지 않습니다.
21. **sanction risk**: 현재 제재 수·타국 신뢰·침략 위협·반복 침략·제3국 전력 비용을 고려합니다.
22. **defense pact risk**: 실제 상대국 방위조약국 전력을 군사비율 분모에 합산하고 추가 비용도 적용합니다.
23. **repeated aggression risk**: 최근 침략 1건마다 위험 비용 +6. 감쇠하는 기존 침략 threat도 활용합니다.
24. **military ratio**: 상대와 방위조약 전력 대비 최소 1.25. 준비도·피로·지지·재정 조건을 함께 검사합니다.
25. **fiscal viability**: treasury/GDP .005 미만이면 기회 침략 불가. 부채와 낮은 현금은 추가 비용입니다.
26. **domestic support**: 정부 지지와 군사 warSupport를 별도로 사용합니다. 낮은 안정·지지는 비용이며 warSupport<35는 공격 차단입니다.
27. **AI 무명분 전쟁 실제 선택**: 실제 월 계산과 Chrome E2E에서 CB 없이 기존 `declareWar`가 실행됐습니다.
28. **AI 전쟁 포기 판단**: 열세·현금 부족·피로·진행 중 전쟁·동맹/휴전 등으로 전쟁이 억제됩니다. 불가능한 행동을 실행하지 않습니다.
29. **balance-of-power 반응**: 기존 shared aggressionThreat 기반 common threat·allianceValue 경로를 유지합니다.
30. **sanctions AI 변화**: 기존 침략 threat를 사용하는 제재 scorer를 재사용하며 공격 전에도 그 위험을 평가합니다. 선언 즉시 자동 제재는 없습니다.
31. **defense pact AI 변화**: 기존 공통 위협·신뢰·관계·군사 의무 utility 및 실제 협정 경로를 유지합니다. 자동 coalition은 없습니다.
32. **federal response AI**: 기존 국가/주 규모·주민 기반·군사·블록·전쟁·위기·재정에 다중 주 불만과 이력을 추가합니다.
33. **repeated concession logic**: 최근 수용/부분 양보마다 비용, 최대15. 협상은 계속 가능합니다.
34. **repeated repression logic**: 반복 거부/압박은 타협 가치를 높이고 강경 대응 가치를 낮춥니다. 무조건 거부·양보하지 않습니다.
35. **multi-state unrest 대응**: 다른 불만 주마다 compromise +7, hardline 비용 +9. 공동 블록도 고려합니다.
36. **NPC federal actions**: 7개 기존 행동이 동일 domain과 cooldown을 통해 경쟁합니다. 자치 요구·대치·주민투표·일방독립을 강제 스크립트로 실행하지 않습니다.
37. **referendum AI**: 독립성향≥65, 실제 운동≥24개월, 유효 phase가 필요합니다. 실제 주민투표 요청/응답/투표 경로를 사용합니다.
38. **hard confrontation AI**: 최근 거부와 주민 기반·상대 약화가 필요하며 반복 거부가 대치 효용을 높입니다.
39. **unilateral independence AI**: 높은 독립 기반·경제·현금·거부·기간 또는 극단적 연방 약화 조건을 검사합니다. 제3국의 연방 적대/방위조약 및 예상 전쟁지지도도 제한된 가중치로 고려합니다. 기존 내전/건국 API를 사용합니다.
40. **state rivalry AI**: 기존 경쟁·협력·공동 경쟁자·이해 충돌에 성향과 국내 감당 능력을 연결합니다.
41. **counter_policy AI**: 충분한 지지·강경 성향·실제 이해 충돌과 18개월 평가 조건에서 가능.
42. **joint_autonomy AI**: 기존 공동 불만·협력·연방 행동 가능 조건을 유지하며 블록 지지가 연방 요구 utility에 반영됩니다.
43. **bloc formation AI**: 공동 자치/경제/견제 배경과 실제 관계·협력·응답 기준을 유지합니다.
44. **bloc maintenance AI**: 목적별 협력 utility가 결속 유지/하락에 반영됩니다.
45. **bloc exit AI**: 이해가 갈라지면 결속이 추가 하락하며 기존 해체 경로로 탈퇴·종료합니다. 자치 요구나 견제 목적이 사라져도 종료 가능합니다.
46. **federal mediation AI**: 기존 안정·협력·전쟁·위기·재정 판단을 재사용합니다.
47. **biased mediation AI**: 주의 충성도(통합)와 경제·정치 영향력, 반복 편파 비용을 함께 고려합니다.
48. **ignore mediation AI**: 기존 외부전쟁·위기·재정 부담 상황에서는 개입 유보를 선택할 수 있습니다.
49. **escalation utility**: 갈등 기회·정치적 backing·성향·연방 약화·블록·최근 거부를 사용합니다.
50. **de-escalation utility**: 지지/안정 하락·재정 부족·군사 열세와 완화 성향을 사용합니다.
51. **conflictOpportunity 연결**: NPC 연방 행동 평가에서 실제 escalationOpportunity/deEscalationUtility를 호출합니다. 중복 pressure 계산기를 만들지 않았습니다.
52. **adaptive posture**: 기존 전쟁 결과·피로·재정 상태에서 성향을 파생하고 기존 posture scorer에 반영합니다.
53. **success/failure learning 여부**: 최근120개월 침략 성공은 공격/기회 utility bias를 조금 높이고 실패는 신중함을 높입니다. 새 경험 자원은 없습니다.
54. **desperation behavior**: 극단적 분리 기반·경제 감당 능력·연방 약화 조건에서만, 정치 기반이 낮은 강경 AI에 재현 가능한 약3%의 위험 선언 기회가 열립니다.
55. **reason codes**: TARGET_WEAK/HIGH_DOMESTIC_SUPPORT/SANCTION_RISK/ALLIANCE_RISK/LOW_TREASURY/WAIT_FOR_CB/JUSTIFIED_CB 및 연방/블록 판단 코드를 관측 함수에서 조회합니다. 점수는 UI에 공개하지 않습니다.
56. **RNG reproducibility**: 기존 conflict stream의 seed와 actor/turn/purpose로 결정되는 stateless substream. UI·선거 stream과 섞지 않으며 동일 state에서 재현됩니다.
57. **action cadence**: 기존 국가3개월, 주간6개월, 연방 전략6개월 및 각 domain cooldown 유지.
58. **action priority**: 전쟁·내부 분쟁 처리 후 국가의 한 major 행동. 같은 주의 주간 행동 대기 중에는 독립/연방 요구를 추가로 수행하지 않습니다.
59. **war/peace regression**: 초기 목표 commitment·교착·피로·평화 utility 공식은 변경하지 않았습니다. 기존 전쟁 회귀 포함.
60. **internal conflict regression**: 기존 6C 절차·분쟁 소유권·종결·재통합 경로 회귀 포함.
61. **election regression**: 실제 행동의 기존 approval 효과만 반영합니다. hidden 선거 modifier는 없습니다.
62. **achievement regression**: 기존 업적 판정과 회귀 포함. 새로운 업적은 없습니다.
63. **world unification regression**: 실제 영토 정산과 세계통일 이후 계속 플레이·엔딩 브라우저 회귀 통과.
64. **reverse federation regression**: 실제 플레이어 독립·정복 이력 조건을 유지합니다. NPC만의 성공으로 업적을 주지 않습니다.
65. **tutorial regression**: scripted tutorial에서는 새 침략·주/연방 전략을 격리합니다. 기존 튜토리얼 완주·저장·건너뛰기 PC/모바일 회귀 통과.
66. **saveVersion 변경 여부**: 6 유지.
67. **migration 여부**: 새 persistent 필드가 없어 추가 migration 불필요. 기존 v6 load와 이전 migration 회귀 포함.
68. **테스트 신규 개수**: 75개 (기존 1,831개 유지).
69. **최종 테스트 총 개수**: 1,906/1,906 통과. 기존1,831+신규75, 실패·취소·건너뛰기 0. 최종 전체 실행 802.06초.
70. **TypeScript**: `tsc -b` 통과, 오류 0.
71. **production build**: Vite production build 통과 (31.56초). main 557.34 kB / gzip 169.68 kB. 기존 큰 chunk 안내는 남아 있으며 오류는 아닙니다.
72. **PC E2E**: 실제 Chrome 1440×1000, 침략/자제/연방 요구/후퇴/블록/일방독립 6개 경로 통과, pageerror 0. 별도 튜토리얼·엔딩 회귀도 통과.
73. **mobile E2E**: 실제 Chrome 390×844에서 동일 6개 경로 통과, pageerror 0·수평 넘침 0. 튜토리얼 PC/모바일 회귀 통과.
74. **AI 무명분 전쟁 E2E**: 실제 `다음 달` 클릭→AI 선언→unjustified war 확인.
75. **AI 전쟁 자제 E2E**: 재정·전력 위험 조건→실제 월 계산에서 공격 없음.
76. **AI 연방갈등 E2E**: 주민 요구·거부 이력 조건→기존 연방 행동 history 확인.
77. **AI de-escalation E2E**: 낮은 지지/안정/현금 조건에서 후퇴 utility 증가 및 일방독립 억제 확인.
78. **AI 정치블록 E2E**: 공동 불만→실제 월간 공동 자치 블록→양쪽 federal action/response 확인.
79. **AI 독립 E2E**: 극단적 고압 fixture→기존 cooldown을 존중하는 월 계산→AI 일방독립→기존 내부 분쟁 확인.
80. **20 seed × 600개월**: 20/20 완료, 정상 월 계산 12,000개월. 오류·초기국 해체·내전·세계통일·잘못된 reverse-federation 업적 0. 각 실행 29.79~78.90초 (다른 검증과 동시 실행).
81. **5 seed × 2,400개월**: 5/5 완료, 정상 월 계산 12,000개월. 오류·초기국 해체·내전·세계통일·잘못된 업적 0. 각 실행 95.89~152.68초 (동시 부하 포함).
82. **추가 strategic simulation 결과**: stable/moderate/unstable/aggressive/cautious 각각 3 seed×240개월, 총 15회 완료. 추가 고독립 기반 3 seed×600개월에서 AI 주민투표와 신생국 3개를 확인했습니다. 조건 실험은 정상 시작 세계의 발생률과 구분합니다.
83. **wars started**: 정상 600개월 20회=0, 정상 2,400개월 5회=0. aggressive 3회=4, cautious 3회=3. 그 외 조건 및 독립 stress에서는 0.
84. **justified wars**: 관측 장기/조건 실행 모두 0. 기존 CB 전쟁 경로와 +22 점수 검사는 별도 회귀에서 통과.
85. **unjustified wars**: 공격 기회 조건 4건, 초기 재정/준비도 위험 조건 3건. latter는 장기 회복과 상대국 행동이 포함되며, 처음부터 위험을 무시하고 공격했다는 의미가 아닙니다.
86. **mean war duration**: 종결된 조건 전쟁 7건의 가중 평균 23.57개월. aggressive 4건 평균 23.50개월, cautious 3건 평균 23.67개월. 정상 세계는 전쟁이 없으므로 평균 N/A (0개월 전쟁이 아닙니다).
87. **sanctions**: 정상 세계 0. aggressive 5회, cautious 3회. 실제 기존 외교 API에서 실행.
88. **defense pacts**: 장기/조건 세계에서 신규 체결 0. 별도 공통 침략 위협 fixture에서는 상호 승인·불가침조약을 충족하고 실제 AI가 제재 후 방위조약을 체결하는 검사를 통과했습니다. 장기 발생 빈도는 확인되지 않았습니다.
89. **new countries**: 정상·일반 조건 0. 고독립 기반 3 seed에서는 각각 1개, 합계 3개. 모든 stress 실행에서 최종 3국 공존. 일방독립 건국은 실제 월 계산 PC/모바일 E2E로 별도 확인.
90. **starting-country dissolutions**: 전체 장기·조건·독립 stress 실행 0.
91. **referendums**: 독립 stress에서 실제 AI 요청 3회, 각 seed 1회. 정상·일반 조건 0.
92. **unilateral independence**: 장기·일반 조건·stress에서 0. 실제 AI 일방독립은 극단적 거부/독립 기반 fixture의 PC·모바일 E2E에서 확인. 발생률을 장기 자료로 입증한 것은 아닙니다.
93. **internal conflicts**: 관측 장기/조건/stress 0. AI 일방독립 E2E에서 정치적 대치 생성, 기존 내전·정산·재통합 회귀 통과.
94. **federal mediations**: 정상 600개월 20회=46 (중립22/유보23/타협1); 정상 2,400개월 5회=12 (중립8/유보4). 조건 stable0/moderate12/unstable38/aggressive7/cautious8. 독립 stress26.
95. **political blocs**: 정상 600개월 경제76개, 모두 만료; 2,400개월 경제71개, 69개 만료. 조건 stable 경제13/moderate 경제2/unstable 자치3/aggressive 경제3/cautious 경제1. stress 자치3개 모두 목적 달성으로 종료.
96. **state confrontations**: 장기·조건 집계의 `federal:confront` 0. 조건을 분리한 32-seed 실제 AI 행동 검사에서 criticize/defy/confront 각각 실행 확인. 명시적 counter_policy는 독립 stress에서 2회.
97. **world unifications**: 장기·조건·stress 모두 0. 기존 세계통일 E2E와 업적 회귀는 통과.
98. **profile별 행동 분포**: 원시 strategyAudit.byActor에 국가/주별 기록. 정상 600개월 합계: 독수리 협상239/성명80/중재10, 부엉이 협상148/협력84/중재13, 오리 협상211/중재13/성명11, 비둘기주 협상184/협력95/성명68/중재10. 연방 관계 개선54/중재46, 참새 관계 개선18. 이는 지역 상태도 함께 반영한 행동 분포이며 순수 성향 효과는 항목100의 동일 상태 실험으로 분리했습니다.
99. **stable/moderate/unstable 비교**: 각 3×240개월. stable: 연방 요구0·경제블록13. moderate: 재협상4·중재12·경제블록2. unstable: 자치요구12·재협상28·공동자치3·자치블록3·중재38. 실제 높은 독립 기반 stress: 주민투표3→독립국3. 일시적 불안정만으로 즉시 분리하지 않습니다.
100. **aggressive/cautious fixture 비교**: aggressive 3회에서 전쟁4·제재5·전쟁이 존재한 월 비중 평균13.06%; cautious 3회에서 전쟁3·제재3·평균9.86%. 이 세계 fixture는 성향과 군사/재정 조건을 함께 바꿉니다. 별도 동일 상태·100 seed 성향 교체 검사는 강경 66/100 대 신중0/100의 공격 후보 선택을 확인했습니다.
101. **발견한 chaos 문제**: 평시에 위협 없이 동원을 0→15로 높이려던 기존 AI 호출이 domain 오류를 유발했습니다. 기존 동원 규칙에 맞게 호출 조건만 고쳤고, 이후 조건 15회와 브라우저 회귀 모두 오류 없이 완료했습니다. 전쟁 규칙·내전 공식은 변경하지 않았습니다.
102. **발견한 dormancy 문제**: 기본 두 국가의 군사비율은 초기 약1.10이며 기회 침략 최소1.25와 관계/재정 비용 때문에 정상 25회 모두 전쟁0입니다. 따라서 기본 시작 세계에서 v1.0 대비 전쟁 빈도 증가 목표는 아직 입증되지 않았습니다. 조건 세계의 실제 전쟁 선택은 확인했으나 이를 기본 세계 빈도 증가로 표현하지 않습니다. 방위조약·일방독립·대치의 장기 발생 빈도도 낮아 추가 균형 관측 대상입니다.
103. **조정한 핵심 AI 수치**: 침략 threshold67·ratio1.25·noise±6, personality jitter±6. 연방 utility noise±5·주 평가6개월·저지지 위험선언 약3%. 반복 비용·bloc utility·다중 불만은 위 항목에 명시.
104. **4/5 대비 simulation 성능**: 다른 대규모 검증 종료 후 동일 seed1001·Normal·2,400개월 비교: 4/5 전략 변경을 되돌린 복원본 114.267초, 5/5 113.657초 (약0.53% 차이). GDP 비율215.681286·전쟁0으로 동일. 이 단일 비교에서는 비정상적 증가가 관측되지 않았으며 성능 개선율로 일반화하지 않습니다. 앞선 동시 부하 반복은 170.58→259.07→237.13초였으므로 부하 조건을 구분합니다. 기존 실제 4/5 checkout을 별도로 보존한 것은 아니며 전략 변경을 역적용한 비교용 복원본입니다.
105. **Conflict Update 전체 최종 평가**: 갈등 평가가 실제 전쟁·주정부 명령·블록·외교 API에 연결됐고, 평화/위험 조건에 따라 자제와 행동이 달라집니다. 기존 회귀·저장 v6·튜토리얼·엔딩은 유지했습니다. 다만 정상 시작 세계의 전쟁 빈도 증가와 장기 방위조약/일방독립 빈도는 검증되지 않았으므로 모든 균형 목표를 달성했다고 단정하지 않습니다. 항목102가 잔여 균형 이슈입니다.

## 검증 자료와 실행

`pnpm dev`, `pnpm test`, `pnpm build`. 장기 실행은 `tsx simulation/strategyRun.ts`, 조건 비교는 `tsx simulation/strategyConditional.ts`. 브라우저 실행은 `node tests/strategy-smoke.cjs`이며 `BIRD_MOBILE=1`로 모바일도 검사합니다.

원시 결과: `.test-output/strategy-long/aggregate.json`, `strategy-conditional.json`, `strategy-all-release.txt`, `strategy-browser-*-release.txt`, `strategy-stress.json`, `strategy-report-metrics.json`, `strategy-benchmark-quiet.json`, `strategy-benchmark.json`. 관측 실험에서는 플레이어 사망/선거 패배만 제외하며 경제·전쟁·정치 계산은 실제 월 계산을 사용합니다. 조건 fixture의 초기 위험 상태를 정상 baseline의 발생 빈도로 일반화하지 않습니다.
