# v1.1 Conflict Update 2/5 — 연방정치

검증 결과 및 49개 완료 항목. 1/5의 기존 변경은 유지했으며, 주정부↔주정부 관계나 NPC의 적극적인 도발 가중치는 추가하지 않았다.

1. **수정/추가 파일**: `src/game/federalPolitics.ts`, `federalPoliticsTypes.ts`, `secession.ts`, `secessionTypes.ts`, `secessionEvents.ts`, `strategicEvaluation.ts`, `save.ts`, `types.ts`, `engine.ts`; `src/components/FederalPoliticsView.tsx`, `Dashboard.tsx`, `src/App.tsx`, `src/styles.css`; `tests/federalPolitics.test.ts`, `federalFixtures.ts`, `federal-smoke.cjs`, 기존 버전 기대값 테스트; `simulation/federalRun.ts`, `federalPaths.ts`, `package.json`, README.
2. **기존 구조**: 자동 자치운동은 조직→헌장→자치운동→주민투표 청원→승인→투표→이행→수립이다. 자동 운동의 기간·지지 조건은 유지했다. 주지사의 명시적인 요청·선언은 같은 상태 전이와 국가 생성 엔진으로 들어가는 별도 명령이다. 기간이나 지지도를 가짜로 올려 기존 조건을 충족시키지 않는다.
3. **Assessment**: `assessFederalConfrontation(game,stateId)`가 정치·경제·제도·독립 기반, 종합 실행 가능성, 이유 코드를 반환한다. 점수는 저장 자원이 아니다.
4. **Political backing**: approval×.30 + stability×.20 + 인구 가중 satisfaction×.15 + autonomyDemand×.15 + independence×.10 + (100−integration)×.10. 점수는 0~100 범위다.
5. **Economic backing**: 35 + log(1+GDP)×3 + growth×2 − unemployment×1.2 + min(20,treasury/GDP×100) − min(35,debt/GDP×25). GDP 분모는 최소 1. 이는 협상 기반 평가이며 경제 성장 공식·GDP 상한은 수정하지 않는다.
6. **Institutional backing**: publicSafety×.45 + stability×.35 + min(10,security budget×3) + 기존 conflict capability×.10. 군사력 기여는 최대 10점이다.
7. **Independence backing**: 주류 종족 independence×.50 + autonomy×.25 + (100−satisfaction)×.10 + 인구 가중 independence×.15 + 운동 단계 보정(조직 4, 이후 10). 종합 실행 가능성은 정치 .40 / 경제 .20 / 제도 .15 / 독립 .25다.
8. **공개비판**: 가장 약한 강도의 메시지다. 주민이 원하면 자치·독립 압력이 소폭 증가하고, 원하지 않으면 approval·안정에 비용이 발생한다. 연방 통합도와 행동 기록에 관계 악화를 반영한다. 새로운 주별 관계 자원을 만들지 않았다.
9. **자치권 요구**: limited / substantial / maximum. 강한 요구는 연방 저항과 정치적 비용을 높인다. 제한적 수용·부분 양보는 기존 `concede`, 광범위·최대 요구 수용은 `expand`를 호출한다.
10. **지침 거부**: 일반 연방 행정지침 불복이다. 개별 정책 시스템을 추가하지 않는다. 통합 저하·주민 반응·경제적 압박 가능성을 연결했다.
11. **재협상**: 수용·부분 양보 시 기존 자치 양보와 일회성 재정 구제를 사용한다. 구제액은 min(연방 국고 1%, 주 GDP 0.1%)이며 연방 국고에서 동일액을 이전한다. 기존 양보 행정 비용도 적용한다. 세금 구조는 수정하지 않았다.
12. **주민투표 요구**: 낮은 지지에서도 가능하다. 주지사 명령으로 실제 `referendum_campaign`에 진입한다. 승인은 기존 `approve`를 호출하고 6개월 일정을 사용한다. 거부는 자치운동 단계로 돌아가 대기기간 뒤 다시 요구할 수 있다.
13. **강경 대치**: 강도 5, 기본 대기 6개월. 지지·안정·통합·종족 반응 및 연방 대응에 실제 영향을 준다.
14. **일방 독립**: 첫 턴도 가능하다. 높은 independence, 선행 행동, 최소 운동 기간을 요구하지 않는다. 현재 주민 기반은 선언 비용·초기 정부 안정·분쟁 방어 지지·연방 방침에 반영한다.
15. **주민 반응**: 자치 행동은 autonomy×.65 + independence×.25, 독립·대치·투표는 independence×.65 + autonomy×.25. 각 종족에 approval×.10 + (50−satisfaction)×.10을 더한다. 주 전체 지지는 인구 가중 평균이다. 승인 반응은 (지지−50)/50 × 행동 강도 × 반복 효율 − 반복횟수×.5다.
16. **종족별 반응**: 만족·자치·독립은 각 종족의 지지에서 별도로 계산한다. 친연방 소수 종족은 독립 강경노선에 반발한다. 전 종족 자동결집을 적용하지 않는다.
17. **FederalResponse**: ignore / negotiate / partial_concession / accept / political_pressure / economic_pressure / hardline_rejection. 일방선언에서는 협상·압박·거부를 선택하며, 요청 수용을 국가 승인으로 잘못 표시하지 않는다.
18. **연방 AI 판단**: 주의 종합 기반·독립 기반·GDP 비중·기존 capability, 연방 stability·debt/GDP·재정 적자, 다른 주의 불안, 연방의 진행 중인 전쟁·연방 관할 위기를 읽는다. 타국 위기는 연방 위기로 계산하지 않는다. 강한 주·약한 연방은 협상·양보 utility가 높아지고, 약한 주·안정된 연방은 거부·압박이 유리하다. 실제 주정부 NPC도 동일 API를 호출할 수 있으나 자동 도발 루프에는 연결하지 않았다.
19. **Partial concession**: 실제 기존 `concede`의 자치 +7, 만족·요구·독립 완화와 행정 비용이 적용된다. 협상 성공 브라우저 경로에서 60→67을 확인했다.
20. **Hardline response**: 지지가 충분한 요구에는 기존 `refuse`와 실제 거부 이력을 연결한다. 같은 행동의 반복 거부를 무제한 독립 보너스로 사용하지 못하게 한다. 약한 요구는 추가 approval 손실(강도×1.5), stability 손실(강도×.4), 주류 운동 신뢰·독립 압력 약화를 받는다. 지침 거부의 경제 압박은 GDP×.0005의 국고 비용이다.
21. **Cooldown**: 일반 행동 3개월, 강도 5 이상 6개월. `nextActionTurn`을 기준으로 정확한 턴에 해제한다. 세율·예산 주기는 변경하지 않는다. 시간 진행을 잠그지 않는다.
22. **Diminishing returns**: 최근 24개월의 같은 행동 n회에 효율 1/(1+.8n)을 적용한다. 반복 만족·approval 비용, 자치 −.3n / 독립 −.4n의 정치피로도 적용한다. 연속 비판 8회의 독립성향이 시작값을 초과하지 않는 테스트를 통과했다. 다른 행동의 효율은 해당 행동 이력으로 계산한다.
23. **Autonomy API 연결**: 기존 `applySecessionAction(...,'concede'|'expand'|'refuse')`를 호출한다. 일반 반응의 변경은 집계 보존 공통 `updateState` 경계로 모았다.
24. **Referendum 연결**: 기존 투표 난수·지지 계산·6개월 일정·이행 6개월·국가 수립을 모두 재사용한다. 자동 운동 이벤트는 유지하고, 직접 요청 직후 중복 협상/요구/응답 이벤트를 억제한다. 이미 예정된 투표는 원래 phase 조건으로 중복 요청을 막는다.
25. **Unilateral API 연결**: 기존 secession 명령에 `governor_request`와 `governor_declare`를 추가했다. 직접 운영 연방 주·생존·사건·대기기간을 검증한다. 일반 자동 `declare`와 공개 `createBreakawayCountry`의 기존 조건은 유지한다. 새로운 국가 생성 엔진은 없다.
26. **Disputed breakaway**: 기존 국가 생성이 소유권·집계·동적 ID·정책 일정·플레이어 직위 변경을 처리한다. 선언은 `disputed_breakaway`다. 약한 선언과 강한 연방은 `parent_claims_reunification` 방침을 남긴다.
27. **Internal conflict**: 기존 `createInternalConflict` 및 foundingIndependence/정부 상태 기반 방어 지지 계산을 사용한다. 강경 거부 시 분쟁 tension을 높인다. 내전 capability·전투·피로 공식은 수정하지 않았다. 강제/협상 재통합으로 플레이어가 패배하는 기존 종료 규칙도 유지했다. 마지막 주가 직접 독립하면 기존 빈 연방 소멸 처리와 영토 분쟁 종료를 유지한다. 다시 연방에 소속된 주는 state selector가 복원되며, 실제로 그 주를 운영하는 생존 게임에서는 연방정치 UI를 사용할 수 있다.
28. **Recognition**: 기존 제3국 recognition utility에 이번 직접 일방선언의 기초 기반만 추가 반영한다. foundingIndependence−50에 .15, 현재 stability−50에 .10. 자동 독립과 기존 국가의 recognition 판단은 바꾸지 않았다. 별도 legitimacy 자원을 저장하지 않는다.
29. **Election 영향**: 실제 governance approval·stability·종족 만족도가 기존 선거 snapshot으로 들어간다. 별도 선거 페널티는 없다. 브라우저에서 낮은 주민지지의 대치 3회/실제 12개월 진행 시 approval 35→28.036, stability 38→33.320, 재선확률 24.049%→12.650%를 확인했다. 월간 회복이 비용을 상쇄하던 최초 구현을 이 검증으로 발견해 수정했다.
30. **연방정치 UI**: 정치 메뉴의 주정부 전용 패널. 자치 수준/요구/독립/통합, 요구 수준 선택, 최근 갈등, 다음 행동 날짜, 7개 버튼을 제공한다. 중앙국·독립국에는 숨긴다. 독립은 별도 확인을 요구한다.
31. **Risk preview**: 주민 예상 반응·연방 반발·정치적 위험을 정성적으로 표시한다. +7.3 등 정확한 결과 예고는 하지 않는다. 대기 및 불가 이유는 버튼 근처에도 표시한다.
32. **History 연결**: 공개비판은 지역 행동 기록·로그만 남긴다. 주요 공식 요구·대치·독립은 중복 없는 역사 sourceKey로 기록한다. `recentFederalConfrontations`가 상태별 최근 행동을 조회한다. 국가 소멸 후에도 국가 이름은 기존 역사 조회를 사용한다.
33. **SaveVersion/migration**: 3→4. `world.federalPolitics[stateId]`에 `nextActionTurn`과 최대 80개의 행동 기록만 저장한다. 파생 기반 점수는 저장하지 않는다.
34. **기존 save 호환**: v3의 없는 필드는 빈 map으로 보충하며 원본 JSON을 바꾸지 않는다. v1→2→3→4 경로도 유지한다. 잘못된 map/행동/반응/중복/미래 대기값을 거부한다. 활성 투표·독립 직전 저장 후 동일한 결과를 검사했다.
35. **Achievements 회귀**: 기존 업적 테스트와 실제 엔딩 브라우저 검증. 독수리 독립→전쟁→영토 정산→연방 소멸→역전된 연방 히든 공개 경로를 통과했다.
36. **Tutorial 회귀**: 참새 튜토리얼에 새 단계를 넣지 않았다. 기존 단위 테스트 및 실제 전체 튜토리얼/2034년 재선/활성 튜토리얼 저장·재로드/중도 건너뛰기를 검증했다.
37. **테스트 총 개수**: 최종 검증 결과는 아래 검증 파일에 기록된다. 기존 1,582개 + 신규 87개 = 1,669개. 전체 회귀 1,667개가 통과한 뒤 추가한 저장 손상·최후 주 소멸 2개까지 신규 87개 묶음에서 통과했다. 신규 테스트는 네 주/NPC 행동, 전 행동 범위·차단, 각 기반, 종족 반응, 대응/위기/전쟁, 양보, 투표/독립/내전/재통합/승인, cadence/반복/선거, 저장 손상/이전 버전, 역사·이벤트·튜토리얼을 다룬다.
38. **TypeScript**: 통과. `.test-output/federal-types.txt`.
39. **빌드**: 통과. CSS 57.08 kB, 앱 JS 508.21 kB, vendor 238.23 kB. 앱 단일 청크가 500 kB를 약간 초과하는 기존 빌드 도구 경고는 남아 있다. 이번 기능 범위에서 배포 구조를 변경하지 않았다.
40. **PC/mobile E2E**: 둘 다 결과 0, pageerror 없음. PC 1440px, 모바일 390px 및 추가 320/390/640px 확인. 버튼 클릭·확인창·불가 이유·메뉴 전환·투표 일정 저장/로드·독립 후 UI 제거를 실제 브라우저로 검증했다.
41. **점진 독립 E2E**: 공개비판→실제 3개월→자치 요구/연방 거부→실제 3개월→주민 기반이 성장한 deterministic fixture→투표 요구/승인→수동 저장·재로드→6개월 투표→6개월 이행→기존 이벤트 선택으로 국가 수립. 결과 established 독수리공화국/대통령. 거부 뒤 기반이 바뀌는 부분은 명시적 fixture이며, 행동·월 진행·투표·수립은 실제 UI/API다.
42. **무리한 독립 E2E**: approval35/independence15의 주에서 즉시 선언. 낮은 안정(<30)·분쟁 방어지지(<40), disputed 상태, 연방 재통합 방침, 국가 외교 UI와 주 전용 UI 제거를 확인했다.
43. **협상 성공 E2E**: 강한 주민 요구·보통 연방 협상 fixture에서 광범위 자치 요구→부분 양보→자치60→67, 요구 완화. 전체 PC/mobile 경로를 통과했다.
44. **정치적 역풍 E2E**: 기반이 약한 주에서 강경 대치 반복, 실제 대기기간 경과와 월 계산을 포함해 재선확률 하락 확인. 결과는 항목 29에 있다.
45. **20 seed ×600개월**: 동일 seed의 1/5 결과와 모든 출력 지표가 일치했다. GDP 평균 배율 3.9869203, 연평균 성장 2.8043403%, 평균 approval76.3092787, 최대 debt/GDP .3855320. 전쟁0·독립0·국가소멸0, 평균 활성국가2. 정기 유한값·집계·소유권 검사를 통과했다.
46. **5 seed ×2400개월**: 게임 지표는 모두 1/5와 일치. GDP 평균 배율218.2515679, 연평균 성장2.7285515%, approval79.5905413, 최대 debt/GDP .4165645. 전쟁0·독립0·소멸0, 평균 활성국가2. 저장/로드 후 추가120개월 검사도 통과. 저장 크기만 새 빈 map 때문에 각21바이트 증가했다.
47. **3개 player path**: 실제120개월. moderate federalist: 24개월마다 재협상, 연방 잔류/자치60/최종approval64.98/독립12.28. autonomy-focused: 강한 자치 요구 fixture에서 네 차례 협상으로 자치60→88, 연방 잔류/최종독립19.71. aggressive separatist: 초기 바로 선언, disputed 독수리공화국·기존 분쟁/협상 상태. 세 경로가 모두 독립으로 수렴하지 않았다. 관측용 사망·선거 패배는 우회했으며 사건 난수 .999999로 자연 정치 사건을 억제했다. 자치 경로는 초기 경기침체·종족 불만이 있는 별도 fixture라 최종approval38.25이며 공정한 정책 우열 비교로 해석하지 않는다.
48. **Softlock/무한갈등**: 거부 후 다시 요구 가능, cooldown 중 시간 진행 가능, 투표 일정 저장/로드, 독립 후 참조/정책 갱신에서 softlock 없음. aggressive120개월 관측은 정치 사건을 억제했으므로 분쟁 협상이 미해결로 남는다. 일반 플레이의 자동 분쟁 해결을 강제하거나 전체 이벤트 확률을 조정하지 않았다. NPC의 적극적인 도발·최종 갈등 weighting은 5/5 범위다.
49. **3/5 재사용 interface**: `performFederalAction(game,stateId,action,level)`, `assessFederalConfrontation`, `evaluateFederalActionSupport`, `evaluateFederalResponses`, `selectFederalResponse`, `federalActionBlock`, `isFederalState`, `recentFederalConfrontations`, `FederalActionRecord`. 공통 명령이 불변 업데이트/실제 결과/집계/로그/역사/대기를 함께 처리한다. 이번 단계에서 주정부 간 관계는 추가하지 않았다.

## 검증 자료

- 전체: `.test-output/federal-final-tests.txt` / 신규: `.test-output/federal-tests.txt`
- 실제 UI: `.test-output/federal-browser-pc.txt`, `federal-browser-mobile.txt`
- 기존 튜토리얼/엔딩: `.test-output/federal-tutorial-browser.txt`, `federal-ending-browser.txt`
- 장기 결과: `.test-output/federal-long/aggregate.json`, `.test-output/federal-comparison.json`
- 세 플레이 경로: `.test-output/federal-paths.json`
- 실행: `pnpm dev` / 테스트 `pnpm test` / 빌드 `pnpm build`.
- 재검증: `node node_modules/tsx/dist/cli.mjs simulation/federalRun.ts`, `simulation/federalPaths.ts`; 브라우저는 실행 중인 dev 서버5175에서 `tests/federal-smoke.cjs` (`BIRD_MOBILE=1`은 모바일).
