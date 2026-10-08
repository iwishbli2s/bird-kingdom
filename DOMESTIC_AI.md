# Bird Kingdom 9A-1 완료 보고

NPC 국내정책·위기 대응 AI를 기존 게임에 통합했다. 경제·사회 지표를 직접 변경하는 보정이나 미래 월 시뮬레이션 없이, 기존 정책 명령과 사건 선택지를 사용한다. 9A-2 전략 AI는 구현하지 않았다.

1. **추가·수정 파일**
   - 추가: `src/game/government.ts`, `aiTypes.ts`, `aiConfig.ts`, `aiState.ts`, `aiEvaluation.ts`, `ai.ts`, `aiEvents.ts`, `src/components/GovernmentPolicyView.tsx`, `tests/ai.test.ts`, `tests/legacyEngine.ts`, `tests/legacyEvents.ts`, 이 보고서.
   - 수정: `types.ts`, `world.ts`, `runtime.ts`, `engine.ts`, `events.ts`, `secession.ts`, `taxPolicy.ts`, `budgetPolicy.ts`, `technology.ts`, `Dashboard.tsx`, `styles.css`, `package.json`, `README.md`, 기존 검사 파일의 회귀 모드 import.
2. **GovernmentAIState**: `profile`, `currentStrategy`, `strategyMonths`, `policyCooldowns {taxes,budget,research}`, `lastDecisionMonth`, `recentDecisions`, 최근 12개월 `economicHistory {gdp,growth,balance}`. `WorldState.governmentAI`에 정부 ID별로 저장한다. 실행 여부는 현재 플레이어 관할에서 파생해 통제권 변경 즉시 반영한다.
3. **AI profile**: balanced, industrial, social, research, agricultural, security. 초기 중앙정부·연방정부·4개 주에 각각 독립 상태를 둔다. 성향은 예산 목표, 연구 순위 및 utility 가중치에 반영한다.
4. **AIStrategy**: normal, growth, fiscal_repair, social_recovery, crisis_response, research_push, security_focus. 한국어 공개 정책 방향을 별도로 매핑한다.
5. **urgency 계산**: 모든 항목 0~100. 침체는 최근 성장·GDP 추세, 실업은 5% 기준 초과분, 물가는 인플레이션·디플레이션, 재정은 수지·국고/GDP·부채/GDP·금리·흑자, 사회는 생활·불평등·보건·치안, 불안정은 안정·통합·인구 가중 종족 만족도, 위기는 intensity·severity·recovery 및 다중 위기, 연구격차는 공개된 정부 기술수준 평균을 사용한다.
6. **전략 선택·hysteresis**: 기본 6개월 유지, 새로운 방향이 기존 점수보다 12 이상 높거나 기존 필요도가 충분히 낮아야 전환한다. 위기 urgency 70 이상이면 즉시 위기 대응으로 전환한다. 평시 전환에도 유지 규칙을 적용한다.
7. **세율 AI**: 소득·법인·소비세 단일 후보를 최대 0.5%p 조정한다. 실제 세입식을 이용해 재정 효과를 평가하며 기존 범위·정밀도 validation을 적용한다. 침체 시 소득·법인 인상을 억제하고, 고물가 시 소비세 인상을 피한다. 감세는 낮은 재정 urgency와 GDP 대비 연환산 예상 흑자 1.5%p 이상을 요구한다.
8. **예산 AI**: 8개 분야의 단일 증감 또는 두 분야 재배분 후보를 평가한다. 분야별 최대 0.3%p. 기본 예산·성향·위기·전쟁 부담·재정 사정으로 목표를 만들고 실제 예상 수지와 사회·성장·연구 효과를 함께 평가한다. 0.3% 또는 기존 기초 예산 중 작은 값을 최소 목표로 보호하며 기존 분야/총합 상한을 지킨다.
9. **research AI**: 실제 선행기술·분야·3개 슬롯 validation을 사용한다. 성향, 공개 기술격차, 산업 구조, 현재 위기·전쟁, 보존된 진척을 평가한다. 진척 70%는 42점 유지 보너스, 교체는 추가 18점 우위를 요구한다. 중단·재개 시 기존 progress를 보존한다. 연방 기술은 기존 주 연구 집계 구조를 유지하며 독립 슬롯을 새로 만들지 않는다.
10. **crisis response**: 질병은 보건·의료 연구, 재난은 기반시설·치안, 식량·습지 문제는 복지·산업·기반시설을 우선한다. 사건 선택에서는 현재 회복력·위기 심각도·재정비용·활동 제한·회복 효과를 비교한다. 영토 편입 후 새 소유 정부가 승계 위기에 대응한다.
11. **일반 EventChoice AI**: 실제 선택지의 즉시/지속 effect 계획을 읽어 growth/fiscal/social/stability/research/crisis utility를 합산한다. 확률 효과의 중립 기대 입력 0.5를 사용하며 실제 사건 outcome 난수는 선택 후 기존 엔진에서만 소비한다. 재정 여유가 있는 폭풍 대응은 invest, 부채 위기는 balance로 달라지는 고정 사례를 검증했다. 국제지원은 기존 우호·승인·제재·전쟁 적격 조건을 통과한 파트너가 있어야 수락 후보가 된다.
12. **전략 이벤트 제외**: 분리주의 prefix, conflict/war/diplomacy 이벤트 표식, movement/conflict/war/casus_belli/diplomacy action 효과는 기존 `nonPlayerChoiceId`로 처리한다. 국제 구조·곡물 지원의 비행 지원/관계 개선만 국내 위기 대응 예외다. 평가 불가·비유한 점수·효과 계획 오류도 기존 기본 선택으로 돌아간다.
13. **동일 정책 API**: `setGovernmentTaxPolicy`, `setGovernmentBudgetPolicy`, `setGovernmentResearch`가 공통 validation과 실제 정책 변경을 수행한다. `setControlledTaxPolicy`, `setControlledBudgetPolicy`, `setResearch`는 기존 UI용 wrapper다. AI는 이 API만 호출하며 지표·국고·해금 보너스를 직접 추가하지 않는다.
14. **권한 분리**: `country:*`, `region:*` 정부 ID를 관할권에 매핑한다. 연방은 자신의 재정만, 주는 자신의 정책·연구만 변경한다. 단일 지역 신생국은 국가 ID가 지역의 실제 실행 상태를 위임받고 별도 지역 AI를 제거해 중복 운영을 막는다. 플레이어 정부 제외는 매 실행 시 판별한다.
15. **policy cooldown**: 세금·예산·연구별 6개월. 실제 변경이 있을 때만 설정한다. 사건 대응은 발생한 선택지의 기존 사건 cooldown을 따른다. 같은 월에 다시 AI를 실행해도 중복 결정하지 않는다.
16. **decision timing**: 경제·재정·인구·사회·정치·기술·위기·선거·사망·NPC 사건 처리 뒤 월말에 실행한다. 플레이어 사건이 대기 중이어도 다른 NPC의 정책 결정은 완료한다. 변경된 정책의 수치 효과는 다음 월 계산에서 발생한다. 게임 종료 후에는 실행하지 않는다.
17. **decision history**: 정부별 최신 36개 실제 전략·세율·예산·연구·사건 결정. 날짜·turn·정부 ID·종류·요약·상수 이유 코드를 저장한다. 경제 이력은 12개월. 유지 결정은 기록/월 로그를 늘리지 않는다. 일반 UI는 공개 정책 방향과 최근 정책 요약만 보여준다.
18. **aiRandom**: 사용하지 않는다. 동일 상태에는 동일 결정, 점수 동률은 고정 순서 및 기존 사건 기본 선택으로 결정한다. 경제·사망·사건·위기 등 기존 RNG의 소비 횟수를 침범하지 않는다. 미래 RNG, hidden event chance 조회, 미래 engine rollout은 없다.
19. **신생국 초기화**: 주요 종족 eagle/owl/duck의 성향을 먼저 선택하고 산업 비중, 부모 AI 성향, balanced 순으로 추론한다. 세계 정부 동기화 때 신규 상태를 생성하며 플레이어 신생국은 즉시 실행 대상에서 제외한다.
20. **삭제·재통합**: 현재 존재하는 정부 descriptor만 남겨 삭제 국가와 행정화된 지역 AI를 제거한다. 위기·국가 역사 및 기존 영토 이전 규칙은 유지한다.
21. **참새 profile**: industrial. 산업지원·기반시설·연구 목표와 산업·기반시설·정보 연구를 선호한다. 플레이어가 참새를 통제하면 AI 정책 변경을 하지 않는다.
22. **비둘기주 profile**: social. 복지·보건·교육 예산과 의료·정보·기반시설 연구를 선호한다. 비둘기 연방정부 balanced와 관할을 분리했다.
23. **독수리주 profile**: security. 국방·치안·산업지원, 군사·산업·기반시설 연구를 선호한다. 전쟁 부담이 있을 때 국방·치안·기반시설 목표를 늘리고 전쟁 종료 후 임시 목표가 평시로 돌아오는 것을 검사했다. 자율 선전포고는 없다.
24. **부엉이주 profile**: research. 연구·교육·기반시설, 정보·의료·산업 연구를 선호한다. 5개 장기 시드에서 연구 예산 2.5% 대 독수리 0.6%로 차이를 유지했다. 동일 초기 상태의 600개월 연구 비교에서도 누적 실제 연구 역량 21,021 대 security 성향 19,272, 정보기술 수준/진척 우위를 확인했다. 완료 기술 개수는 두 사례 모두 5개였으며 성향별 분야 선택과 진척 차이로 평가했다.
25. **오리주 profile**: agricultural. 기반시설·복지·산업지원과 농업·기반시설·의료 연구를 선호한다. 습지 가뭄 고정 사례에서 기반시설 대응을 우선하고 분야별 증감 제한을 지킨다.
26. **테스트 총 개수**: 기존 842개 + 신규 AI 81개 = 923개. 기존 assert/시나리오를 제거하지 않았다. 기존 고정 NPC 정책 기준 회귀는 전용 wrapper로 domesticAI=false에 고정하고, 신규 검사는 기본 AI-on 엔진/사건 모듈을 직접 사용한다. 실제 브라우저의 기존 16개 UI 시나리오와 새 AI 시나리오는 기본 AI-on으로 검증했다.
27. **TypeScript**: `tsc -b` 통과.
28. **빌드**: `pnpm build` 통과. Vite production 결과 생성. 브라우저 production에서 디버그 객체가 노출되지 않는 것도 확인했다.
29. **600개월**: 실제 월 엔진에 AI·위기·사건·연구를 켜고 실행했다. GDP/산업 합계, 인구 합계, 유한 재정, 세율·예산 validation, 6개월 세금 변경 간격, 기록 제한, 정책 다양성을 매월 검사했다. 이 장기 밸런스 검사는 지도자 사망/선거 패배로 중단되지 않도록 해당 판정을 고정한다. 사망·선거 실제 흐름은 기존 회귀/브라우저 검사로 별도 검증한다.
30. **5-seed 600개월**: 아래 표 참조. 모든 시드가 완료됐고 최종 NPC 예산 구성이 5종으로 유지됐다. NPC 최대 부채/GDP는 39.96% 미만이었다.
31. **1200개월 endurance**: seed 99101, 실제 정책·전략 결정 893건, 새 기술 완료 46건, 위기 생성 354건, NPC 최대 부채/GDP 37.80% 미만. 기록 36개/경제 이력 12개 상한과 소진된 연구 후보 처리가 정상이다.
32. **신생국 AI E2E**: 독수리공화국 생성→NPC 전환→초기 security→질병 발생→월 진행→crisis_response·보건 예산 대응을 상태 및 실제 화면에서 확인했다.
33. **플레이어 전환 E2E**: AI가 운영하던 주/독수리공화국 통제권을 플레이어로 변경→직접 운영 표시→기존 정책 보존→이후 AI 변경 중단→공통 플레이어 명령으로 직접 변경. 상태 검사와 모바일 포함 실제 화면을 통과했다.
34. **oscillation·장기병리 대응**: 재정이 부족한데 감세와 증세를 번갈아 선택할 수 있는 후보 구조를 점검해 감세에 흑자 여유 기준을 추가했다. 전략 6개월 유지·12점 전환 차이, 분야별 6개월 대기, 연구 진척 유지·18점 교체 차이, 예산 바닥/목표 상한을 적용했다. 최종 6개 장기 실행에서 fiscal_repair 중 감세 감사 건수는 0, 부채/GDP 100% 상한 검사 통과, 기록 누적 폭주 없음. 위기가 새로 발생·회복되면 의도적인 정책 재조정은 가능하다.
35. **9A-2 연결점**: `GovernmentAIState`의 profile/strategy/history, `calculateAIUrgencies`, profile/strategy 가중 `aiUtility`, 정부 descriptor·공통 명령, `recordAIDecision`을 재사용할 수 있다. 전략 사건 제외 gate에 별도 전략 판단기를 연결하고 외교/전쟁 행동은 해당 도메인 API로 수행하도록 확장할 수 있다. 이번에는 전략 행동을 추가하지 않았다.

## 최종 장기 실행 결과

정책 결정 수는 사건 선택을 제외한 전략·세율·예산·연구 변경이다. 부채 비율은 관찰한 NPC 최대값이다.

| seed | 개월 | 정책 결정 | 세율 변경 | 최대 부채/GDP | 기술 완료 | 위기 생성 | 예산 구성 |
|---|---:|---:|---:|---:|---:|---:|---:|
| 91 | 600 | 476 | 32 | 39.95% | 25 | 183 | 5 |
| 2030 | 600 | 513 | 34 | 37.90% | 26 | 177 | 5 |
| 4412 | 600 | 481 | 31 | 37.82% | 27 | 187 | 5 |
| 8451 | 600 | 466 | 33 | 37.83% | 25 | 192 | 5 |
| 9966 | 600 | 478 | 33 | 37.84% | 26 | 180 | 5 |
| 99101 | 1200 | 893 | 34 | 37.79% | 46 | 354 | 5 |

## 화면과 실행

외교 메뉴 상단의 세계 정부 정책 카드에 현재 방향·최근 실제 정책 변경을 표시한다. utility/urgency·내부 이유 코드·정확한 숨은 사건 확률은 일반 화면에 노출하지 않는다. PC·390px 모바일에서 가로 넘침, 신생국 표시, 다음 달, 새로고침, production 표시를 검증했다. 보안 프로그램 관련 지정 404는 요청에 따라 검사 대상에서 제외했다.

`pnpm dev`로 개발 화면, `pnpm test`로 전체 검사, `pnpm build` 및 `pnpm preview`로 production을 확인한다. 실제 저장 기능은 기존과 동일하게 제공하지 않는다.
