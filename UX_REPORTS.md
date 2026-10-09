# Bird Kingdom — 후속 UX 완료 보고

1. **생성·수정 파일** — 주요 추가: src/game/{patchNotes,annualTypes,annual,annualValidation}.ts, src/components/{PatchNotes,AnnualReport}.tsx, tests/annualUx.test.ts, tests/reports-smoke.cjs, simulation/annualRegression.ts. 주요 수정: App, Setup, Dashboard, HistoryView, preferences, engine의 보고 관찰 지점, save, types, CSS, package.json, README. 기존 검증의 현재 버전 기대값과 전략 난수 fixture도 갱신했습니다.

2. **PatchNote 구조** — 버전·제목·요약·4~6개 핵심 강조·상세 section의 제목/항목 배열로 분리했습니다. 긴 JSX 문서 대신 데이터로 렌더링합니다.

3. **latest patch 등록** — patchNotes 배열을 최신순으로 등록하고 latestPatch를 메인 버전 표기와 카드에서 공통 사용합니다.

4. **v1.1 내용** — 전쟁·무명분 비용·AI 침략, 주지사 7행동, 네 주의 관계/정치블록/중재, 상황 기반 갈등/연쇄, 국가·주의 전략 성향을 플레이어 언어로 설명합니다. 내부 utility나 threshold는 노출하지 않습니다.

5. **메인화면 카드** — 메인 메뉴에서 최신 버전과 업데이트 요약, 패치노트 보기 버튼을 제공합니다. 강제 팝업은 없습니다.

6. **NEW 상태** — 최신 version과 lastSeenPatchVersion이 다르면 NEW를 표시합니다. 열람하면 즉시 사라지고 새로운 버전은 다시 NEW가 됩니다.

7. **읽음 저장** — 열람 시 최신 version을 저장합니다. 재실행에서도 읽음 상태가 유지됩니다.

8. **localStorage 방식** — 별도 bird-kingdom:lastSeenPatchVersion 및 annual-autopopup UI 설정입니다. 브라우저 저장이 차단되면 안전하게 메모리 UI로 동작합니다. 보고서 읽음도 캠페인의 seed별로 별도 기억합니다.

9. **과거 patch** — v1.0을 접힌 과거 패치로 제공합니다. 후속 항목을 앞에 추가하는 구조입니다.

10. **모바일 patch** — 390×844 실제 Chrome에서 긴 노트 스크롤, 과거 노트 열기, 닫기/키보드 focus/가로 넘침을 검증했습니다. 메인 제목의 기존 10px 가로 넘침도 줄였습니다.

11. **AnnualSummary 구조** — 연도·관할 ID/이름·제목·1~2문장 설명·비교 기준·시작/종료일·선택된 지표·기존 역사에서 복사한 요약 사건·생성 턴을 저장합니다. 튜토리얼 때 작성된 보고의 자동 표시 억제 여부만 함께 기록합니다.

12. **AnnualSnapshot 구조** — 현재 비교 기준의 날짜/턴·관할 signature·핵심 숫자 record만 저장합니다. 전체 world/산업/로그/GameState 복제는 없습니다. 같은 관할의 평상시 달에는 숫자 집계도 생략합니다.

13. **연간 보고 시점** — 기존 날짜 선증가 방식을 유지합니다. Jan2030에서 11회 진행하면 Dec2030, 12회면 Jan2031이므로 이때 2030년 보고를 생성합니다. 첫 11개월에는 없고 24개월에는 두 개입니다. 보고에는 실제 비교 기간 Jan→Jan도 표시합니다.

14. **month advance hook** — 월 계산 → 튜토리얼/History 수집 → 정책 일정 동기화 뒤 collectAnnualReport 관찰만 추가했습니다. 경제·AI·전쟁 계산의 실행 순서는 그대로입니다.

15. **player jurisdiction 처리** — controlledGovernmentId/governmentRuntime/governmentName을 재사용합니다. 공화국은 국가, 연방 플레이는 선택 주, 독립국은 해당 공화국입니다. 소유 영토 구성이 바뀌면 비교 기준을 다시 잡습니다.

16. **GDP 변화** — 매년 기본 표시. (end-start)/abs(start) 백분율과 시작/종료 규모를 보여줍니다. start=0이면 백분율 대신 절대 차이를 표시합니다.

17. **population 변화** — 총인구를 기본 표시하며 기존 population formatter를 사용합니다. 종족 구성은 2%p 이상 변화한 경우 후보가 됩니다.

18. **unemployment 변화** — 0.5%p 이상을 후보로 선정합니다. 5→6은 +1.0%p로 표시합니다.

19. **inflation 변화** — 0.5%p 이상을 후보로 선정하며 비율의 상대 증가율로 잘못 표시하지 않습니다.

20. **treasury/debt 변화** — 국고/부채 변화의 의미는 기준 GDP 대비 2%/3%로 판단합니다. 부채/GDP 3%p 이상은 부채 절대액보다 우선해 중복을 줄입니다.

21. **approval 변화** — 5점 이상 변화만 후보로 선택합니다.

22. **stability 변화** — 5점 이상 변화만 후보로 선택합니다.

23. **autonomy 변화** — 관할 종족 인구로 가중한 자치권 요구를 비교하며 5점 이상 후보로 선택합니다.

24. **independence 변화** — 관할 종족 인구로 가중한 독립성향을 비교하며 5점 이상 후보로 선택합니다. 좋음/나쁨 색상 평가를 하지 않습니다.

25. **technology 변화** — 완료된 영역별 기술 레벨 합계의 의미 있는 변화와 기존 History의 주요 기술 사건을 사용합니다. 연구 progress 몇 %는 넣지 않습니다.

26. **변화량 필터** — GDP/인구 + threshold 대비 정규화한 의미 변화 상위 6개까지 표시합니다. tiny noise는 생략하며 숫자 방향은 중립적으로 보여줍니다.

27. **threshold config** — annualConfig에 실업/물가 0.5%p, 정치 5점, 사회 3점, 기술 레벨 합 1, 종족비 2%p와 표시 한도를 모았습니다.

28. **major events 선택** — 현재 기간 시작의 History order 이후 major/historic 사건만 사용합니다. 통치했던 국가/영토의 관련 사건을 고르며 별도 연간 사건 timeline은 생성하지 않습니다.

29. **event priority** — 전쟁/평화 → 독립/국가소멸/통일 → 선거 → 위기 → 주민투표 → 정치 → 기술 → 기타. 같은 우선순위에서는 historic와 최근 사건을 우선합니다.

30. **최대 event 수** — 6개. 주요 지표 8개 이내와 함께 짧은 보고를 유지합니다.

31. **headline rule** — 전쟁/평화, 통치질서 변경, 위기, 정치변화, GDP 증가/감소/완만함 순으로 결정론적 제목을 선택합니다. 설명은 실제 GDP 변화와 선택 사건 수로 작성합니다. 난수/LLM을 쓰지 않습니다.

32. **연방/주간 사건** — 기존 연방 행동·정치블록·주간 행동·연방 중재 기록을 재사용합니다. regionIds가 있는 다른 주의 전용 사건은 제외합니다.

33. **전쟁 사건** — 관련 전쟁 발발/평화를 가장 우선해 선택합니다. 주요 사건 수가 늘어도 최대 6개입니다.

34. **선거 사건** — 기존 선거의 major/historic 기록을 사용합니다. 승리 dialog가 열려 있으면 연간 popup은 기다립니다.

35. **독립 사건** — 기존 창건/독립 기록을 사용합니다. 과거 국가 ID가 사라져도 보고의 이름·내용은 보존됩니다.

36. **위기 사건** — 기존 주요 위기 기록을 사용합니다. 사소한 매월 기록은 넣지 않습니다.

37. **연중 독립 처리** — 연초 주→독립국의 수치를 억지로 직접 비교하지 않습니다. 새 관할 snapshot을 잡고 “관할 변경 이후”로 표기합니다. 그해 앞선 사건 구간과 독립 사건은 유지합니다.

38. **재통합 처리** — 현재 유효한 관할 signature 변경을 감지해 안전하게 기준을 갱신합니다. 보고 내 과거 ID는 활성 world 참조로 강제하지 않습니다.

39. **국가 소멸 처리** — 완성된 보고는 독립적으로 보존합니다. 소멸/통일/선거패배/영토상실 경로의 기존 History와 game over를 유지합니다. 보고 시 유효 관할이 없으면 안전하게 생성하지 않습니다.

40. **자동 popup** — 기본 ON. 읽지 않은 보고를 연도 순으로 표시합니다. 닫기 또는 Escape로 정상 진행을 재개합니다.

41. **popup setting** — 주요 화면의 “연간 보고 자동 표시” 체크박스로 전환합니다. OFF여도 보고 생성은 계속되며 reload 후 설정이 유지됩니다.

42. **History 연결** — 기록 → 연간 보고서에 최신순 목록과 재열람 dialog를 추가했습니다. 기존 연표/통계/전쟁/통치기록을 유지합니다.

43. **tutorial 처리** — 튜토리얼 중 생성된 보고는 자동 표시를 억제합니다. 마지막 선거/완료 월의 보고도 이후 갑자기 튀어나오지 않으며 History에 남습니다. 기존 48개월 안내를 실제 완주했습니다.

44. **pending event 우선순위** — 필수 사건·플레이어 외교 제안·동맹 요청 → 선거 승리 → 연간 보고 순서입니다. 저장 dialog나 튜토리얼 종료 확인 중에도 보고가 끼어들지 않습니다.

45. **game over 우선순위** — 사망/선거패배/국가패배 화면이 최우선입니다. 같은 연도 경계에 보고가 생성돼도 ending을 막지 않습니다.

46. **rapid click 처리** — functional update 내부에서도 미열람 자동 보고를 확인합니다. 한 프레임에 32회 클릭해도 첫 경계 turn13에서 멈추고, 닫은 뒤 다시 32회 클릭하면 turn25의 한 보고만 표시합니다. debounce/animation lock은 없습니다.

47. **saveVersion** — 7. UI 읽음 설정 때문이 아니라 persistent report/baseline 때문입니다.

48. **v6 migration** — v6의 기존 게임 검증 후 summaries=[]와 현재 snapshot을 생성합니다. 과거 보고는 추정하지 않습니다. 다음 정상 연도 경계에 부분 기간 보고를 생성합니다.

49. **save/load roundtrip** — 완성된 문장/지표/사건 및 비교 기준을 그대로 roundtrip합니다. v7에서 연간 기준 자체가 없거나 보고 필드가 손상되면 import를 거부합니다.

50. **save size 증가** — 동일 seed1001의 200년/200보고 기준 기존 4,006,793B → 4,184,417B, +177,624B (+4.43%). 연간 데이터 전체 177,614B입니다. 최적화 후 같은 실행에서 baseline 135.47초/보고 포함 134.60초였습니다. 차이 -0.64%는 실행 잡음으로 보며 속도 향상으로 주장하지 않습니다. 유의미한 처리 비용 증가는 관측되지 않았습니다.

51. **RNG 비소비 검증** — 2,400개월 매월 RNG state를 비교해 동일함을 확인했습니다. 보고 helper 자체도 random/world/history를 변경하지 않는 테스트가 있습니다.

52. **simulation 불변 검증** — 5.1 Git 참조와 같은 seed1001을 월별 SHA256으로 비교합니다. annual만 제외한 전체 GameState가 600/1,200/1,800/2,400개월까지 일치합니다. 경제·정치·전쟁·AI config를 수정하지 않았습니다.

53. **기존 1,940 테스트 유지** — 기존 1,940개 유지. 현재 saveVersion 기대값만 7로 갱신했고, 과거 migration은 보고가 현재 시점에서 새로 시작한다는 요구를 검증합니다. 장기 AI fixture의 누락된 전략 seed도 고정했으며 기존 assertion은 유지했습니다.

54. **신규 테스트 수** — 97개. 패치 preference, 기간/관할, 지표/사건, lifecycle, save, popup selector, 튜토리얼 종료 억제를 검증합니다.

55. **최종 테스트 총수** — 2,037개 검증 대상. 전체 실행 2,031/2,031(기존1,940+당시신규91) 통과 후 최종 신규97/97 별도 통과로 추가6개까지 검증했습니다. 최종 신규97+기존 저장/마이그레이션 관련197의 294/294 재검증도 통과했습니다.

56. **TypeScript** — pnpm exec tsc -b 통과. pnpm build의 선행 tsc -b도 통과.

57. **production build** — production build 통과. 기존 큰 main chunk 경고는 남아 있으며 이번 UX 범위에서 분할하지 않았습니다.

58. **chunk size** — 최종 main 577.82kB / gzip177.50kB. 기존560.54/170.73 대비 +17.28/+6.77kB. CSS60.91/gzip12.73, vendor238.23/gzip72.89kB. 신규 대형 라이브러리는 없습니다.

59. **PC 패치노트 E2E** — NEW → 상세 → 과거 patch → 닫기 → reload 읽음 유지, focus trap을 실제 Chrome에서 통과했습니다.

60. **모바일 패치노트 E2E** — 390×844에서 동일 흐름·스크롤·터치 버튼·가로 넘침 없음 통과.

61. **PC 연간보고 E2E** — 실제 월 버튼12회 → GDP/인구 보고 → 닫기 → 월 진행, History 재열람 및 빠른 연속 클릭을 통과했습니다.

62. **모바일 연간보고 E2E** — 390×844에서 제목/수치/사건/고정 닫기·스크롤·넘침 없음·animation 없음 통과.

63. **자동표시 OFF E2E** — OFF로 다음12개월 → popup없음/보고존재 → History 열기 → reload 설정유지 통과.

64. **연방 연간보고 E2E** — 독수리주에서 기존 연방 강경대치 및 주간 행동 API를 수행하고 실제12개월 진행 후 주 관할/정치 사건 보고를 확인했습니다.

65. **독립연도 E2E** — 5개월 진행 → 기존 일방독립 API →7개월 진행 → 공화국 이름/관할 변경 기준/창건 사건 보고 통과.

66. **발견한 softlock** — 완주 불가 softlock 없음. 필수 사건 뒤 보고, 보고 닫기 뒤 월 진행, rapid click 경계, 튜토리얼 완료를 검증했습니다. 튜토리얼 마지막 달의 자동 보고 충돌은 억제 flag로 해결했습니다.

67. **발견한 save/migration 문제** — 기존 migration 전체 상태 비교가 새 baseline 초기화와 충돌해, 기존 gameplay는 그대로 비교하고 신규 baseline 초기화를 따로 확인하도록 조정했습니다. 손상된v7 연간 자료는 복구를 추측하지 않고 거부합니다. v6 browser import 통과.

68. **최종 UX 평가** — 버전 변화와 지난12개월의 핵심 지표/사건을 짧게 읽을 수 있습니다. 보고를 끄거나 기록에서 다시 볼 수 있고 게임 계산은 동일합니다. 애니메이션·추가 통계 대시보드·새 게임 시스템은 없습니다.

검증 증거: `.test-output/ux-final-tests.txt`, `annual-unit-final.txt`, `ux-save-final.txt`, `annual-regression-final.json`, `reports-desktop-final.txt`, `reports-mobile-final.txt`, `ux-tutorial-final.txt`, `ux-topbar-{desktop,mobile}.txt`, `ux-strategy-{desktop,mobile}.txt`, `ux-build-final.txt`.
