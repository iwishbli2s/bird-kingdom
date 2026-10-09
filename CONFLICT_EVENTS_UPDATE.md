# Bird Kingdom — v1.1 Conflict Update 4/5

기존 상태로 갈등 압력을 파생하고 관련 사건에만 비선형 가중치를 연결했습니다. 단계적 분리주의, 주간 분쟁과 정치블록, 연방 중재를 실제 사건·월 계산에 연결했습니다. NPC 무명분 전쟁의 최종 공격성과 국가별 성향 개편은 이번 작업에 포함하지 않았습니다.

## 요청한 70개 완료 보고

1. **수정/추가 파일**: 신규 `src/game/conflictPressure.ts`, `pressureEvents.ts`, `tests/pressureFixtures.ts`, `conflictPressure.test.ts`, `pressure-smoke.cjs`, `simulation/pressureRun.ts`, `pressureConditional.ts`, `pressurePersistent.ts`. 연결 수정은 `events.ts`, `eventTypes.ts`, `eventEffects.ts`, `secessionEvents.ts`, `stateRelations.ts`, `strategicEvents.ts`, `aiEvents.ts`, `save.ts`, `history.ts`, `EventDialog.tsx`, 저장 버전 기대값 검사, `package.json`, `README.md`입니다. 이전 1/5~3/5 작업을 보존했습니다.
2. **conflict pressure 구조**: `assessConflictPressure(game,jurisdiction)`가 분리주의·연방·주간·종족·국내·외교 압력 6개를 0~100으로 계산합니다. 새 압력 저장 자원은 없습니다. 한 월말 후보 평가에서 같은 관할의 계산값을 공유하며 외부 조회에는 숨은 mutable cache를 사용하지 않습니다.
3. **event family 분류**: autonomy/separatism/federal/state_rivalry/species/domestic_unrest/diplomatic/casus_belli. 기존 분리주의 절차·자치 청원·종족 충돌·적대 외교 사건을 분류하고 신규 사건에는 metadata를 명시합니다. 생태·긍정·일반 경제 사건 전체를 갈등으로 분류하지 않습니다.
4. **multiplier 적용 위치**: `events.ts → calculateEventChance → getConflictEventFamilyMultiplier`. 기존 eligibility와 관할별 cooldown을 먼저 검사합니다. 예약 투표·국가 수립 priority 사건에는 가중치를 적용하지 않습니다.
5. **기존 state multiplier 연결**: 활성 연방 주의 autonomy/separatism/federal/state_rivalry 가족에서 실제 `getStateConflictEventMultiplier`를 호출합니다. 일반 사건에는 적용하지 않습니다.
6. **autonomy multiplier**: 분리주의/연방 압력 중 큰 값을 사용합니다. 실제 자치 요구·독립성향·불만·통합도와 최근 대응에 반응합니다.
7. **separatist multiplier**: 독립성향·자치 요구·통합·만족·안정·지지도·운동 단계·최근 거부/진압·투표 이력으로 계산합니다. 독립성향 30/65/85와 낮은 통합도 조합을 검사했습니다.
8. **federal multiplier**: 최근 연방 대치·거부, 불리한 중재, 블록 참여, 주 정치적 지지, 연방 약화를 사용합니다. `federal-grievance` 집단 항의 사건을 추가했습니다.
9. **state rivalry multiplier**: 관계·경쟁·협력·최근 공격·공동 견제 대상·블록·편파 중재를 사용합니다. `state-dispute`는 실제 주간 정책 분쟁입니다.
10. **species multiplier**: 만족도·정치 영향력·자치/독립·인구 비중·생활 수준 악화를 사용합니다. 기존 종족 충돌의 확률을 상태에 연결합니다.
11. **domestic unrest multiplier**: 지지·안정·생활 수준·실업·물가·불평등·실제 위기·부채/GDP를 조합합니다. 신규 반정부 시위는 지지<55·안정<55·종합 국내압력≥55 조건이 모두 필요합니다. 단일 실업 상승만으로 이 사건을 열지 않습니다.
12. **diplomatic multiplier**: 관계·신뢰·위협·제재·도발 충격·영토 분쟁·최근 침략·조약 파기 기록을 사용합니다. 국가 성향 전체는 개편하지 않았습니다.
13. **CB multiplier**: 기존 국경 침범/제재 보복 CB 경로에 외교 압력을 연결합니다. 외교압력≥70이고 기존 성향이 assertive인 NPC는 강경 대응을 선택할 수 있습니다. 평화로운 관계에는 이 조건이 적용되지 않습니다. 실제 CB 생성 효과를 검사했습니다.
14. **eligibility 수정**: 새 시위·분쟁은 각 압력과 실제 행동 조건으로 열립니다. 고압 분리주의(≥75)의 자치 협상 대기 6→3개월, 재협상 12→6개월, 거부 후 응답 12→6개월로 조정했습니다. 최근 주정부 직접 요구 후 3개월 보호는 유지합니다.
15. **dead gate 수정**: 응답/요청/거부 사건의 36개월 cooldown을 12개월로 줄여 최근 거부의 24개월 유효기간과 충돌하는 재시도 병목을 완화했습니다. 단계 진입 후보에는 압력·최근 이력 가중치를 적용합니다. 임의로 phase를 점프하거나 forced independence를 넣지 않았습니다.
16. **progression**: 조직→6개월 헌장→최소 24개월 활동→주민투표 요구→응답→6개월 투표→이행→국가 수립을 기존 API로 진행합니다. 각 단계 guard와 의미 있는 일방 선언 조건은 유지됩니다.
17. **escalation memory**: 기존 사건 history, 주간 dispute/mediation history, federal confrontation history, movement refusal를 재사용합니다. 12개월 사건 연쇄, 24개월 최근 거부/주간 공격이 압력·가중치에 반영됩니다. 새 장기 marker 배열을 만들지 않았습니다.
18. **de-escalation chain**: 시위 양보는 만족 +5·자치 요구 −5·독립성향 −3·안정 +2와 실제 재정 비용을 적용합니다. 최근 양보는 후속 가족 가중치를 낮춥니다. 브라우저에서 압력 88.08→79.92, 자치 가중치 9.0913→4.9812를 확인했습니다.
19. **protest chain**: 강경 진압은 단기 안정 +1, 만족 −6, 자치 +5, 독립 +4, 통합 −2입니다. 최근 진압이 후속 압력과 가중치에 반영되며 사건별 12개월 cooldown으로 월별 반복을 막습니다.
20. **referendum chain**: 조직/활동 기간과 실제 자치·독립 조건이 필요합니다. 새 사건이 단독으로 투표를 예약하지 않습니다. 고압 지속 스트레스에서는 3 seed 모두 자연 주민투표 요구 4건이 발생했습니다.
21. **unilateral independence chain**: 최근 실제 거부·충분한 운동 기간·독립≥80·자치≥80·만족≤25·통합≤35를 유지합니다. 조건을 갖춘 사건의 실제 일방 선언과 신생국 생성 검사를 통과했습니다.
22. **internal conflict 연결**: 기존 신생국/부모국의 영토 분쟁과 내전 처리 경로를 사용합니다. 직접 선언의 기존 내부 분쟁을 검사했습니다. 고압 지속 관측은 주민투표 독립을 선택했고 자동 내전은 0이었습니다.
23. **state-pair event target**: `PendingEvent/EventHistoryEntry.statePairTarget={actorStateId,targetStateId}`로 발생 당시 쌍을 보존합니다. resolver/AI/사건 화면은 같은 쌍을 사용합니다. 이후 가장 경쟁적인 주가 달라져도 다른 쌍으로 바뀌지 않습니다.
24. **state relation event effects**: `state_politics` effect가 공통 `applyStatePoliticalActionEffects`를 호출합니다. 협상·중재·정책 견제는 기존 관계·주민·반응·중재·기록 처리 규칙을 공유합니다.
25. **pending event/API 충돌**: 일반 UI `performStateAction`의 pending guard는 유지합니다. resolver는 검증된 사건 target으로 하위 효과 함수를 호출합니다. 사망/종료·불법 소유권·비활성 쌍을 일반 명령으로 우회하지 않습니다. 독립한 주를 포함하는 발생 제안은 처리 직전에 다시 유효성을 확인합니다.
26. **natural bloc 로직**: 공동 불만/불만을 동반한 자치 요구, 공동 견제 대상, 실제 재정 이해 충돌이 제안 배경입니다. fiscalConflict>10·충분한 관계/협력의 NPC는 36개월 평가 시 공동 경제 블록을 제안할 수 있습니다.
27. **joint_autonomy 자연 선택**: 양쪽 높은 자치 요구(≥55)와 실제 낮은 만족(<45), 또는 양쪽 최근 연방 거부가 있어야 합니다. 양쪽 federal API 사용 가능 여부를 확인하고 실제 기존 자치요구를 실행합니다.
28. **counter_policy 자연 선택**: 높은 경쟁(>55)과 실제 이해 충돌(>35), 18개월 평가 시점에서 가능합니다. 최종 공격성 개편 없이 기존의 빈 자연 선택 경로를 열었습니다.
29. **bloc 조건**: 관계≥55·협력≥45·utility≥45·경쟁<75는 유지합니다. 기본 협력 drift 목표를 30→38로 조정하고 실제 공통 배경 및 행동 효과로 기준에 접근하게 했습니다. 만료 36개월/결속 해체/독립 cleanup도 유지합니다.
30. **mediation trigger**: rivalry>65 외에 rivalry≥45·관계<55·최근 24개월 공격≥2의 복합 trigger를 추가했습니다. 실제 분쟁 사건에서도 낮은 관계/유의미한 경쟁은 NPC 중재 요청으로 이어집니다. 자동 중재는 동일 쌍 최근 12개월 이력을 존중합니다.
31. **biased mediation 후속효과**: 기존 불리한 주의 통합·자치·주민 비용을 유지하고 최근 편파 이력을 연방/주간 압력에 반영합니다. 반복 편파의 utility 감점과 만족 조건부 간접 독립 압력도 유지됩니다.
32. **rivalry drift**: 구조적 경쟁 목표에 최근 공격 흔적(최대16)을 더합니다. 회복 속도 .008→.003, 월 감소 최대 .10/증가 최대 .15로 바꿉니다. 낮은 경쟁을 일괄 65 이상으로 밀어 올리지 않습니다.
33. **relation persistence**: 고압 갈등의 흔적이 여러 해 남는 회귀를 검사했습니다. 협력·협상·중재와 기존 구조적 개선으로 회복 가능하며 영구적 적대는 강제하지 않습니다.
34. **repeated attack diminishing**: 관계 하락·경쟁 증가·맞비판 추가 효과 모두 반복 effectiveness를 적용합니다. 최소 effectiveness .15로 완전히 무효가 되지 않습니다. 기존 주민 역풍도 유지합니다.
35. **cooperation-purpose mismatch**: `purpose`를 response 평가→수락→bloc 생성까지 동일하게 전달합니다. autonomy/economic/anti_rival 목적을 검사했습니다. 자치 목적의 정치협력도 양쪽 federal cooldown을 원자적으로 검사합니다.
36. **save validation**: v5/v6의 `statePolitics` 누락을 거부합니다. pending state pair는 실제 현재 연방 주·서로 다른 ID·actor=관할 조건을 검사합니다. 기록과 압력 메모리 roundtrip을 검사했습니다.
37. **saveVersion**: **6**. 압력은 비저장이나 새 pending/history target은 저장되므로 버전을 올렸습니다.
38. **migration**: v5→v6은 기존 game/history/memory를 그대로 보존합니다. 가상의 과거 분쟁을 추가하지 않습니다. v4 이하의 기존 단계별 migration은 계속 6까지 진행됩니다.
39. **History**: 신규 대규모 시위·정책 분쟁과 대응을 major 정치 기록으로 남깁니다. 기존 phase/투표/국가 수립 collector를 재사용하며 source key로 중복을 막습니다. 작은 사건 전부를 major로 승격하지 않았습니다.
40. **UI**: 기존 사건 Dialog에 발생한 두 주의 이름을 표시합니다. 기존 주간 정치 화면·월 진행·disabled 사유를 사용합니다. 새 거대 관리 화면이나 애니메이션은 없습니다.
41. **기존 1,762 테스트**: 전부 유지하고 전체 회귀에서 통과했습니다. 실패·취소·건너뛰기 0입니다.
42. **신규 검사**: **69개**. 가족별 압력·후보 확률·모든 새 대응·단계/시간 gate·실제 CB·target·pending·목적·반복 공격·migration·메모리·중재·블록을 검증했습니다.
43. **최종 총 개수**: **1,831 / 1,831 통과**. 기존 1,762개와 신규 69개입니다.
44. **TypeScript**: `tsc -b` 오류 없이 완료했습니다.
45. **빌드**: Vite production build 성공. 메인 JS 547.05 kB(gzip 165.83 kB)이며 기존 chunk 크기 경고가 남아 있습니다.
46. **PC E2E**: 실제 Chrome 1440px에서 신규 4개 흐름, 기존 연방정치, 튜토리얼 완주·저장, 엔딩·업적 회귀를 통과했습니다.
47. **모바일 E2E**: 신규 전체 흐름과 기존 연방정치 회귀를 통과했습니다. 320/390/640px 사건 화면의 가로 넘침 없음과 클릭 가능 상태를 확인하고 스크린샷을 검토했습니다. 신규 흐름 pageerror 0입니다.
48. **분리주의 연쇄 E2E**: 실제 UI federal 거부→실제 weighted candidate 시위→진압→조직→월 6회→헌장→추가 18개월→주민투표 운동을 확인했습니다. milestone의 고압 조건은 fixture로 유지했고, phase/기간/효과는 실제 domain과 월 계산을 사용했습니다. 강제 결과 injection으로 독립을 완성하지 않았습니다.
49. **자연 중재 E2E**: 경쟁 조건 fixture에서 다음 달의 실제 월간 AI가 연방 중재를 기록했습니다. 일반 pending·외교 제안의 월 차단도 유지됩니다.
50. **자연 bloc E2E**: 공동 연방 불만 fixture에서 실제 5개월을 진행해 NPC의 joint autonomy와 블록 생성, 양쪽 기존 federal action 기록을 확인했습니다. 외교 제안은 실제 UI로 거절한 뒤 진행했습니다.
51. **갈등완화 E2E**: 실제 발생 후보의 양보 선택 이후 압력·후속 multiplier 감소를 확인했습니다. PC와 모바일에서 동일합니다.
52. **20 seed×600개월**: Normal·기존 AI·실제 RNG의 관찰 월 계산을 완료했습니다. GDP 배율 평균 3.970934(3/5 3.986920 대비 약 −0.40%), 초기국 해체/내부 분쟁 0입니다. 사망·낙선만 관찰 모드로 제외했습니다.
53. **5 seed×2400개월**: 완료했습니다. 저장 후 추가 120개월 계산과 world 검사도 포함합니다. GDP 배율 평균 219.622989(3/5 218.251568 대비 약 +0.63%), 초기국 해체/내부 분쟁 0입니다.
54. **총 conflict event 수**: 50년 묶음 **1,334**, 200년 묶음 **1,253**. 아래 수치는 묶음 총계이며 family로 분류된 사건만 집계합니다.
55. **autonomy protest**: 정상 baseline 두 묶음 모두 **0**. 조건부 불안정 fixture 및 지속 고압에서는 실제로 발생했습니다. 정상 세계에서 이를 강제하지 않았습니다.
56. **separatist event**: baseline 두 묶음 모두 **0**. 지속 고압 조건에서 조직화·주민투표 등 실제 progression이 발생했습니다.
57. **referendum demand**: baseline **0/0**, 지속 고압 3 seed×120개월 각각 **4**(합계12)입니다.
58. **unilateral attempt**: baseline **0/0**. 별도 조건을 충족한 실제 선언/내부 분쟁 검사는 통과했습니다. 지속 고압 NPC는 승인 투표 경로를 택했고 일방 선언을 강제하지 않았습니다.
59. **internal conflict**: baseline **0/0**, 지속 고압 관측 **0**. 조건부 직접 선언 검사에서는 기존 분쟁이 생성됐습니다. 높아진 독립성향만으로 자동 내전이 나지 않습니다.
60. **state dispute**: baseline **44/13**입니다.
61. **federal mediation**: baseline 자연 발생 **39/12**입니다. 3/5의 **0/0**에서 실제 경로가 활성화됐습니다.
62. **political bloc 생성/해체**: baseline **81/81**, **83/80**입니다. 200년 종료 시 아직 활성인3개는 향후 만료 대상입니다. 3/5 baseline 생성0에서 실제로 증가했습니다.
63. **CB-generating event**: 평화 baseline은 **0/0**. 이는 boundary 사건 수가 아닌 실제 restrict 선택에 의한 CB 생성입니다. 고압 assertive fixture의 실제 기존 CB 효과를 별도로 확인했습니다.
64. **관계 분포**: 50년은 평균 rivalry **10.4315**, 최대 **42.7496**, seed별 P90 평균 **20.3866**, 최저 관계 **45.4705**, 평균 협력 **45.8232**. 200년은 **7.2907 / 41.9487 / 11.3385 / 47.0193 / 51.8211**입니다. P90는 각 seed 월간 활성 쌍 표본의 P90를 계산한 후 평균한 값이며 전체 표본의 pooled P90라고 표시하지 않습니다.
65. **stable/moderate/unstable 비교**: 각 5 seed×240개월. conflict event **134/740/1,055**, autonomy protest **0/11/25**, separatist protest **0/1/12**, state dispute **0/22/41**, mediation **0/13/96**, bloc 생성 **20/1/6**입니다. 주민투표 요구·신생국·초기국 해체는 모두 0입니다. stable의 블록은 높은 초기 관계/협력에 따른 우호적 경제 협력입니다. 일시적 불안정 조건은 월간 회복과 양보로 완화되므로 지속 고압 스트레스와 구분합니다.
66. **chain metric**: 같은 관할·같은 family에서 24개월 내 후속 갈등 사건 비율. 50년 **91/1,268 = 7.18%**, 200년 **86/1,236 = 6.96%**. 마지막 관측의 우측 절단 24개월 표본은 제외했습니다. baseline은 안정 초기 조건이므로 연쇄가 낮으며 고압 진행 가능 여부는 조건부 관측으로 별도 검증했습니다.
67. **chaos 검사**: 정상 baseline 25회와 일시적 불안정 조건에서 초기 연방의 일괄 붕괴는 발견되지 않았습니다. 사건별 cooldown·반복행동 수확체감·확률 포화·블록 만료·양보 회복을 유지합니다. 지속 고압 스트레스는 매월 불만/독립/통합 악화를 의도적으로 고정한 극단 실험이며 일회성 사건의 결과로 일반화하지 않습니다.
68. **dormancy 검사**: 지속 고압 3 seed에서 각 연방 주의 첫 연쇄 사건은 시작 후 대체로 1~6개월 안에 나타났습니다. 관측 전체 연쇄 무발생 최대 간격은 **2/5/3개월**. 각 실험에서4개 주가 실제 주민투표/독립 절차를 완료했습니다. 일시적 불안정은 좋은 월간 결과와 양보로 회복하여 이후 조용해질 수 있습니다.
69. **핵심 밸런스**: 비선형 `1+7×max(0,(pressure−25)/75)^2.2`, 가족 최종 multiplier≤12. 개별 후보는 `0.4×(1−exp(−rawChance/0.4))`로 완만히 포화하고 전체 월 사건 발생 ceiling .75를 유지합니다. 신규 시위 기본 .009/분쟁 .008, cooldown12, 큰 갈등 회복속도 .003, 공격 최소효과 .15, 블록 기준/기간은 기존 유지입니다. 안정 조건에서는 작은 multiplier·eligibility 차단으로 보호합니다.
70. **5/5 재사용 interface**: `assessConflictPressure`, `conflictFamily`, `getConflictEventFamilyMultiplier`, `conflictOpportunity`(압력/escalation/de-escalation/separatist/diplomatic utility), `evaluateStateCooperation`, `evaluateFederalMediation`, `shouldMediateStatePair`, 공통 state action effects와 관측 `conflictAudit`를 사용할 수 있습니다. baseline은 여전히 평화적인 방향으로 회복하며 rivalry가 낮아집니다. 5/5에서는 이 실제 입력·분포를 바탕으로 전략 선택을 조정해야 하며, 모든 나라를 강제로 위기로 만들 필요는 없습니다.

## 실행과 재검증

- 실행: `pnpm dev`. 현재 검증 서버는 `http://127.0.0.1:5175`입니다.
- 검사/빌드: `pnpm test`, `pnpm build`.
- 장기 baseline: `pnpm pressure:regression`.
- 조건 비교: `pnpm pressure:conditional`.
- 지속 고압 스트레스: `pnpm pressure:persistent`.
- 실제 PC 브라우저: `node tests/pressure-smoke.cjs`; 모바일은 `$env:BIRD_MOBILE='1'` 설정 후 같은 명령입니다.
- 원시 관측은 `.test-output/pressure-long/aggregate.json`, `pressure-conditional.json`, `pressure-persistent.json`, 각 검증 로그에 있습니다. 자연 사건과 정치적 결과를 집계하며 특정 개수나 독립 결과를 강제로 만들지 않습니다.
