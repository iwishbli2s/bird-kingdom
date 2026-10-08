# Bird Kingdom

조류 국가 운영 시뮬레이션의 **10B-2 단계: 첫 플레이 튜토리얼·UX 마감**입니다. React, TypeScript, Vite, CSS를 사용합니다.

## 실행

Node.js 20.19+ 또는 22.12+ 및 pnpm이 필요합니다.

```sh
pnpm install
pnpm dev
```

터미널에 표시된 로컬 주소(기본 `http://127.0.0.1:5173`)를 엽니다.

```sh
pnpm test     # 게임 상태 및 월 진행 테스트
pnpm build    # TypeScript 검사 및 프로덕션 빌드
pnpm preview  # 빌드 결과 로컬 확인
```

## 구현 범위

- 첫 브라우저 실행에 선택 가능한 Normal 참새자유공화국 튜토리얼, 첫 재선까지 실제 48개월 운영
- 실제 정책·연구·외교·사건 조작, 안내 강조, 다음 안내까지 월별 진행, 언제든 같은 세계에서 자유 플레이 전환
- 튜토리얼 저장/복원·재실행, 화면별 도움말·용어집·조치 필요 바로가기, 키보드 대화상자와 모바일 마감
- 기존 1,303개 포함 **1,358개 테스트** 통과. 전체 일정·46개 완료 보고·브라우저/600개월 회귀: [TUTORIAL.md](TUTORIAL.md)

- 생산성 기준의 초장기 성장 수확체감과 전쟁 목표·교착에 따른 AI 평화 평가 보정
- 기존 1,271개 포함 총 1,303개 테스트, 20×50년·5×200년·1×500년 재검증과 16항목 보고: [BALANCE_FIXES.md](BALANCE_FIXES.md)


- 쉬움·보통·어려움 선택, 플레이어 관할에만 작은 위기·선거·상황위험 보정, 게임 중 난이도 확인
- 저장 schema 2 및 기존 저장의 보통 난이도 자동 이관
- 집중 밸런스 수정 3개, 재현 가능한 50년·200년·500년 배치와 스트레스 실험
- 구조·실행 방법·44항목 결과와 남은 한계는 [BALANCE.md](BALANCE.md)


- 수동 저장 5개·빠른 저장·매년 1월 자동 저장, JSON 가져오기/내보내기, 전체 세계·역사·난수 상태 복원
- 정부별 세율 3개월·예산 12개월 주기, 위기/전쟁 중 제한된 긴급 예산 수정, AI·독립·재통합 동일 규칙
- 구조·검증·1,218개 테스트·장기 저장 결과·45항목 보고는 [SAVE_LOAD.md](SAVE_LOAD.md)


- 중요한 세계 연표·국가 창건/소멸·전쟁/독립·선거·기술·재난·지도자 통치사를 영구 게임 상태에 보존
- 연 1회 국가/세계 통계, 최대 4개 국가 비교 SVG 차트, 소멸국 이름·이전 자료 유지
- 기록 허브의 연표·국가·전쟁·통계·통치기록·최근 기록 탭, 게임 종료 후 역사 열람
- 구조·연간 관측 시점·검증·47항목 완료 보고는 [HISTORY.md](HISTORY.md)

- 국가별 상대 평가·외교 기조·무역·조약·승인·제재, 자치·독립·내전·참전·동원·평화 전략 AI
- 기존 명령과 공통 조건을 사용하는 NPC 행동, 플레이어에게는 수락·거절 가능한 외교·평화 제안
- 외교 화면의 공개 기조·동원·최근 주요 행동. 구조·검증·장기 통계·45항목 완료 보고는 [STRATEGIC_AI.md](STRATEGIC_AI.md)

- 정부별 성향·위기 판단에 따른 NPC 세율·예산·연구·국내 사건 대응, 플레이어와 같은 정책 API 및 다음 달 반영
- 월말 AI 결정, 공통 정책 변경주기·전략 유지, 신생국 초기화·삭제 정리·플레이어 통제권 전환 시 즉시 제외
- 외교 화면의 세계 정부 공개 정책 방향·최근 변경 표시. AI 상세 구조·35항목 완료 보고는 [DOMESTIC_AI.md](DOMESTIC_AI.md)
- 메인 메뉴, 국가 선택, 연방의 4개 주 선택
- 2030년 1월 시작, 1턴 = 1개월, 연도 전환
- 10개 주요 지표, 구성 종족, 최신순 월간 기록
- 세계 전체의 월간 경제 계산, 산업 5개, 경기순환, GDP·성장·실업·물가 갱신
- 모든 정부의 세입·8개 분야 정책지출·이자 결산과 국고 부족분 자동 차입
- 예산 메뉴의 재정·조세 및 8개 분야 예산 편성, 초안·취소·일괄 적용과 예상 월 수지
- 읽기 전용 경제 화면: 주요 지표와 산업 생산량·GDP 비중·생산성
- 플레이어 1세 0개월 시작, 월별 나이 증가와 사망 판정, 사망 시 게임 종료
- 종족별 인구의 출생·자연사망·순이동 및 연방 집계
- 인구 및 종족 화면과 개요 총인구 카드
- 종족별 만족도·정치 영향력·자치 요구·독립 성향의 완만한 월 변화, 정치 카드와 범주
- 생활수준·교육·보건·치안·불평등의 목표 기반 월 변화, 인구·종족정치 연결과 사회 화면
- 지지도·정치 안정도·통합도의 실제 월 변화와 정치 화면, 파생 위험 종족 정보
- 개요·경제·예산·사회·종족·정치·외교·군사·기술·기록 화면
- 대통령/주지사48개월 임기, 최근12개월 기반 재선 전망과 독립 선거 RNG, 승리 안내·선거 패배 게임오버
- 상태·계절·최근 사건 기반 동적 사건29개, 각3선택, 즉시/지속 효과와6개 연쇄 흐름
- 세계5개 직접 운영 정부의 월 사건, NPC 기본 대응, 플레이어 선택창·진행 차단·주요 사건 기록
- 실제 자치권과 운동 단계·최소 기간, 주민투표·6개월 이행·신생국 생성
- 일방 독립의 분쟁 status/방침, 동적 둥지권·세계 국가 목록·임기 보존
- PC 중심의 반응형 화면

저장 후 메인 메뉴의 이어하기에서 슬롯을 선택해 복원할 수 있습니다. 새로고침은 메인 메뉴로 돌아가며 자동으로 마지막 저장을 불러오지는 않습니다. 경제는 매월 변하며 모든 정부의 국고·부채가 매월 결산되며 GovernanceState도 새 사회·종족정치 상태에 따라 매월 갱신됩니다. 금액은 가상 통화 BK의 십억 단위입니다. 연방 플레이에서는 선택한 주의 운영 지표를 표시하며 `국가부채`는 요청된 공통 지표명입니다. 모델과 초기 밸런스는 [ECONOMY.md](ECONOMY.md), 조세·재정 구조는 [FISCAL.md](FISCAL.md), 세부 예산은 [BUDGET.md](BUDGET.md), 인구는 [POPULATION.md](POPULATION.md), 종족정치는 [SPECIES_POLITICS.md](SPECIES_POLITICS.md), 사회 계산과 검증 결과는 [SOCIAL.md](SOCIAL.md), 거버넌스는 [GOVERNANCE.md](GOVERNANCE.md), 임기·선거는 [ELECTIONS.md](ELECTIONS.md), 사건 엔진과 전체29개 목록·조건·22항목 완료 보고는 [EVENTS.md](EVENTS.md), 자치·분리·독립 구조와27항목 보고는 [SECESSION.md](SECESSION.md)를 참고하세요.

## 확장 구조

- `src/game/historyTypes.ts`, `historyConfig.ts`: 직렬화 가능한 역사 schema와 중요도 기준
- `src/game/history.ts`: 명령 종료/월말의 공통 기록 수집, source ID 중복 방지, 연간 관측
- `src/game/historySelectors.ts`: 연표 필터/정렬·소멸국 null 통계·계보 조회
- `src/components/HistoryView.tsx`, `HistoryTimelineView.tsx`, `CountryHistoryView.tsx`, `HistoryStatisticsView.tsx`, `HistoryChart.tsx`: 장기 기록 허브와 SVG 비교 차트

- `src/game/strategicTypes.ts`, `strategicState.ts`, `strategicConfig.ts`: 국가별 전략 상태·동적 국가 정리·행동 주기
- `src/game/strategicEvaluation.ts`, `strategicParent.ts`, `strategicEvents.ts`: 현재 공개 상태의 상대 평가·외교/전쟁 효용·분리주의/분쟁 사건 판단
- `src/game/strategicAI.ts`, `strategicCommands.ts`: 기존 명령 실행·사람의 동의 제안·최근 결정 기록
- `src/components/StrategicView.tsx`, `ForeignProposalDialog.tsx`: 공개 외교 기조와 제안 응답 화면

- `src/game/government.ts`: 정부 ID·관할권·플레이어 정부 판별, 공통 세율/예산/연구 명령 연결
- `src/game/aiTypes.ts`, `aiState.ts`, `aiConfig.ts`: 정부별 AI 상태·초기화·성향·제한과 유지 기간
- `src/game/aiEvaluation.ts`, `aiEvents.ts`, `ai.ts`: 현재·과거 공개 상태 기반 평가와 월말 명령 실행. AI 전용 난수는 사용하지 않음
- `src/game/eventTypes.ts`, `eventConfig.ts`, `eventHelpers.ts`: 사건 타입·설정·상태/계절/연쇄 helper
- `src/game/eventDefinitions.ts`: 실제29개 사건·87선택·기본 대응·발생 조건과 효과 계획
- `src/game/events.ts`, `eventEffects.ts`: 가중 발생·해결 API·쿨다운·지속 효과·공통 불변 적용
- `src/components/EventDialog.tsx`, `HistoryView.tsx`: 사건 선택창·역순 역사와 일반 로그
- `src/game/types.ts`: CountryDefinition, RegionDefinition, PlayerState, WorldState, CountryRuntimeState, RegionRuntimeState, EconomyState, FiscalState, TaxPolicy, BudgetPolicy, FiscalExpenditure, GovernanceState, SocialState, SpeciesDefinition, SpeciesPopulationState, PopulationState, GameDate, GameLog 타입
- `src/game/data.ts`: 국가·주·종족 설정과 초기값. 지역 특성은 설명 데이터만 포함
- `src/game/engine.ts`: 새 게임 생성, 월 계산, 독립적인 `advanceMonth()` 진입점. 상태를 변경하지 않고 새 객체 반환
- `src/game/populationConfig.ts`, `population.ts`: 종족 정의·초기 인구·월 흐름·연방 집계
- `src/components/PopulationView.tsx`: 운영 대상 인구와 구성비·흐름·연율
- `src/game/electionConfig.ts`, `election.ts`: 임기·12개월 기록·재선 점수/확률·승패·경력
- `src/components/PoliticalCareerView.tsx`, `ElectionVictory.tsx`: 경력·전망·승리 안내
- `src/game/governanceConfig.ts`, `governance.ts`: 초기 거버넌스·목표·월 변화·인구 가중 종족 입력·소수 위기·연방 집계
- `src/components/PoliticsView.tsx`, `governanceLabels.ts`: 정치 카드·범주·추세·위험 종족
- `src/game/socialConfig.ts`, `social.ts`: 초기 사회·계수·목표·월 변화·세계 처리·인구 가중 연방 집계
- `src/components/SocialView.tsx`: 사회 카드·범주·추세·게이지·반응형
- `src/game/world.ts`: 모든 시작 국가·주의 독립적인 초기 런타임 상태 생성과 운영 대상 선택
- `src/game/economyConfig.ts`: 산업 성장·생산성·경기 계수 및 주별 초기 밸런스
- `src/game/economy.ts`: 산업·거시지표 월 계산, 세계 경제 업데이트, 주 경제의 국가 집계
- `src/game/fiscalConfig.ts`, `fiscal.ts`: 재정 초기값 및 순수 월간 세입·지출·국고·차입 계산
- `src/game/budgetConfig.ts`, `budget.ts`, `budgetPolicy.ts`: 분야별 초기값·한도·효과, modifier 합산, 운영 정부 예산 API
- `src/components/BudgetView.tsx`: 0.1%p 조정, 실제 지출과 초안 기준 예상 재정수지
- `src/game/taxPolicy.ts`: 운영 정부 조세 변경 API
- `src/components/FiscalView.tsx`: 재정 결산·세입 상세·세율 초안과 적용
- `src/game/random.ts`: 분리된 경제·선거·사건 발생/결과 스트림에 사용하는 seed와 재현 가능한 PRNG
- `src/components/EconomyView.tsx`, `EconomyMetrics.tsx`: 읽기 전용 산업 화면과 개요/경제 공통 지표 카드
- `src/game/logs.ts`: 턴 번호와 독립적인 ID, 턴·날짜·카테고리를 포함한 최신순 로그 추가
- `src/game/mortality.ts`: 기초 위험 계산, `calculateMonthlyMortalityRisk()`, `rollPlayerDeath()`, 나이·기간 표시
- `src/game/debug.ts`: 개발 환경 전용 사망·선거·사건 테스트 수단
- `src/components/GameOver.tsx`: 최종 나이·집권 기간·마지막 날짜·운영 국가/주와 메인 메뉴 복귀
- `src/components/Setup.tsx`: 메인 메뉴와 시작 선택 흐름
- `src/components/Dashboard.tsx`: 메뉴, 지표, 종족, 월간 기록 및 시간 진행 UI
- `src/App.tsx`: 화면 흐름과 GameState 소유

현재 GameState 구조는 다음과 같습니다.

```text
GameState
├─ date, turn, gameOverReason
├─ player: controlledCountryId, controlledRegionId, ageMonths,
│          career, alive, baseMonthlyMortalityRisk, currentMortalityRisk, deathDate
├─ world
│  ├─ countries: Record<CountryId, { id, economy, fiscal, governance?, population, social?, speciesPolitics? }>
│  ├─ diplomacy: 국가 쌍별 관계·승인·제재·조약·외교 역사
│  └─ regions: Record<RegionId, { id, ownerCountryId, economy, fiscal, governance, population, social?, speciesPolitics? }>
├─ events: pendingEvent, cooldowns, activeEffects, history
└─ logs: GameLog[] (id, turn, date, message, category, type)
```

어떤 운영 대상을 선택해도 세계에 시작 국가 2개와 연방의 주 4개가 모두 존재합니다. 국가·주·별도 게임 사이에 경제/운영 객체를 공유하지 않습니다. 대시보드는 `selectControlledRuntime()`으로 플레이어가 운영하는 대상의 지표만 읽습니다. 국가 이름·종족·설명은 정의 데이터이고 주의 실제 소유권은 런타임의 `ownerCountryId`입니다. `StartingCountryId`는 시작 선택용 union이며 런타임 `CountryId`와 `RegionId`는 string으로 동적 ID를 허용합니다. 6B에서 실제 독립 후 동적 국가와 지역을 생성합니다. 집계 국가는 simulationMode와 현재 소유권으로 계산합니다.

`advanceMonth()`는 종료/pending 확인 → `tickEventState()` → `advanceGameDate()` → `updatePlayerAge()` → `updateWorldEconomy()` → `updateWorldFiscal()` → `updateWorldPopulation()` → `updateWorldSocial()` → `updateWorldSpeciesPolitics()` → `updateWorldGovernance()` → 분리주의 타이머 → 내부 분쟁 → 외교 월 갱신 → 정치경력/선거 → 종료되지 않은 경우 `resolvePlayerMortality()` → `appendGameLog()` → 종료되지 않았다면 `generateWorldEvents()` 순서입니다. 로그 ID는 기존 로그의 최대 ID에서 증가하므로 같은 턴에 여러 기록을 추가해도 충돌하지 않습니다. 모든 단계는 입력을 직접 변경하지 않습니다.

경제는 모든 주를 독립 계산하고, 현재 소유 국가에 속한 주가 있으면 그 국가의 경제를 집계합니다. 주가 없는 공화국은 독립 계산합니다. 국가 ID를 하드코딩해 경제 계산 대상을 결정하지 않습니다. 2B-1에서 재정 계산을 연결했습니다. 2B-2에서 `calculateFiscalExpenditure()`에 분야별 예산을 연결했습니다. 3A에서 인구 계산을 연결했습니다. 3B에서 종족정치를 연결했습니다. 4A에서 사회를 인구와 종족정치 사이에 연결했습니다. 4B-1에서 거버넌스를 종족정치 뒤에 연결했습니다. 4B-2에서 임기·플레이어 선거를 연결했습니다. 5A·5B에서 월 시작 지속 효과와 월말 세계 사건을 연결했습니다. 이후 AI 모듈을 연결할 수 있습니다. 미구현 시스템을 빈 함수나 클래스로 추가하지 않았습니다.

질병·의료·전쟁·암살·쿠데타·재난·스트레스 같은 위험 요인은 `calculateMonthlyMortalityRisk(game, { multiplier })`에 배율을 공급할 수 있습니다. 실제 상황 위험 모듈은 아직 없고 기본 배율 1만 사용합니다. 상태 기반 사건과 자치·주민투표·독립선언·새 국가 생성은 구현했습니다. 6C에서 내부 분쟁·휴전·협상·독립 최종 승인·재통합을 구현했습니다. 7A에서 국가 간 외교·승인·무역·제재·조약을 구현했습니다. 일반 국가 간 전쟁·정식 군사·기술·정치 AI는 이후 단계입니다. 사건은 개인 사망 위험을 변경하지 않습니다.

## 나이 및 사망 판정

`GameState.player`에 총 나이(개월), 기초 월간 사망확률, 최종 월간 사망확률, 생존 여부, 사망 날짜를 보관합니다. 초기 나이는 12개월이며, 매달 날짜와 나이를 증가시킨 후 확률을 계산하고 한 번 판정합니다. 사망 시 그 달의 날짜·나이·기록을 보존하고 추가 월 진행을 차단합니다. 선거가 있는 달에는 선거를 먼저 판정하며 패배면 사망 판정을 생략합니다. 집권 기간은 완료한 월 수(`turn - 1`)입니다.

자연 위험은 `1 - exp(-h₀ × exp(경과 연수 / 8))`의 간단한 비선형 곡선입니다. `h₀`는 1세 위험이 월 0.001%가 되도록 정합니다. 예시 월 위험은 20세 약 0.011%, 60세 약 1.58%, 80세 약 17.6%, 100세 약 90.6%입니다. 초기 증가는 느리고 고령 구간의 증가가 커지며 감소하지 않습니다. 극단적인 나이에도 자연 위험을 99.9999% 이하로 유지해 특정 나이에 반드시 사망하는 제한은 없습니다. 실제 생물학적 수명 모델이 아닌 게임 밸런스용 가상 수치입니다. 정확한 확률은 일반 UI에 표시하지 않습니다.

개발 서버(`pnpm dev`)에서만 브라우저 개발자 도구 콘솔로 다음을 실행할 수 있습니다. 일반 플레이 화면에는 디버그 버튼이 없습니다.

```js
window.birdKingdomDebug.setConflictRoll(.5)    // 분쟁 난수 고정 (null로 해제)
window.birdKingdomDebug.setSecessionRoll(.99)  // 투표 결과 난수 고정
window.birdKingdomDebug.setSecessionRoll(null) // 자연 투표 난수 복귀
window.birdKingdomDebug.setEventRoll(0)        // 사건 흐름 강제 검증(모든 정부)
window.birdKingdomDebug.setEventRoll(.999999)  // 사건 억제
window.birdKingdomDebug.setEventRoll(null)     // 자연 사건 난수 복귀
window.birdKingdomDebug.setMortalityRisk(1)    // 다음 달에 반드시 사망
window.birdKingdomDebug.setMortalityRisk(0.5)  // 월 사망확률 50%
window.birdKingdomDebug.setMortalityRisk(0)    // 테스트 중 생존 보장
window.birdKingdomDebug.setMortalityRisk(null) // 재정의 해제, 자연 위험 복귀
```

재정의는 페이지를 새로고침하거나 `null`로 해제할 때까지 유지됩니다. 프로덕션 빌드(`pnpm build` / `pnpm preview`)에는 이 콘솔 수단이 포함되지 않습니다. 자동 테스트에서는 난수를 주입해 결과를 결정적으로 검증합니다.

## 검증 결과

- TypeScript 검사 및 프로덕션 빌드 성공
- 총509개 테스트 통과(기존431개 + 외교78개). 기본정책600개월 국가2개 유지·독수리 운동 비활성, 신생국240개월 안정성, 위기360개월 독립성향91.62·주민투표 후보 검증. TypeScript/빌드 성공.
- 독수리/까마귀 독립 PC/모바일 E2E·국가명·대통령·임기·소유/분할·기록·다음달·사망 화면과 기존 UI 회귀 통과.
- 5A·5B 검증: 기본정책 사건600개월: 플레이어145건, 평균4.14개월마다1건, 긍정/혼합76건, 세계796건. 독수리 위기 집회 후보 확률1.404%→10.08%.
- 사건·기록 PC/모바일, 월 진행 차단/해제, NPC4건+플레이어1건, StrictMode·프로덕션·기존 UI 회귀 통과.
- 기존 검증: 사회 기본정책600개월·투자/긴축240개월, 종족정치 위기240개월 검증
- 사회 초기값·목표·속도·범위·불변성·연방 비저장/집계·RNG 독립과 인구/정치 반영 시점 검증
- 정치 UI 참새/독수리주24개월 PC/모바일, 월 게이지·범주·인구 탭과 기존 시스템 회귀 확인
- 인구600개월 정상 및120개월 침체 안정성·정수 인구·월 흐름 회계·연방 집계 확인
- 인구 브라우저 검증: 참새/독수리주24개월, 구성비 변화, 개요 총인구, PC/모바일
- 3B 당시 검증: 기존135개와 종족정치33개. 초기값·산업 합계·세계 전체 계산·연방 집계·RNG 분리·입력 불변성·안전 범위 확인
- 세율 0% 및 최대값 × 120/600개월에서도 모든 정부 재정 유한값·국고 비음수·산업/연방 GDP 합계 유지
- 예산 브라우저 검증: 참새/독수리주 초기 배분, 0.1%p 조정·초안·취소·적용, 예상수지·적자경고·상한 검증, 12개월 지출과 산업 변화, PC/모바일 및 운영 권한
- 정상 예산 600개월 및 총 45% 고지출 예산 120개월 안정성·국고 소진·부채/금리 증가 검증
- 조세 브라우저 검증: 참새/독수리주 초안·취소·적용·다음 달 결산, 정책 로그, 운영 권한 및 여섯 정부 재정 업데이트, PC/모바일
- 브라우저 검증: 공화국·독수리주 각 12개월, 경제/개요 지표 일치, 산업 생산 변화, 세계·연방 변화, 재정 변화, 로그·예정 메뉴·재시작
- 고정 RNG 120개월 및 호황·침체·중립·변동 4조건 × 600개월에서 유한값·산업 합계·연방 집계·안전 범위 유지
- PC 1440px 및 모바일 390px 화면 확인. 모바일 가로 넘침 및 JavaScript 런타임 오류 없음
- 사망 시스템 추가 검증: 초기 나이, 나이·연도 전환, StrictMode에서도 월당 난수 생성 1회, 공화국과 4개 주의 게임 오버 요약, 새 게임 초기화, 모바일 종료 화면, 프로덕션 디버그 미노출 확인
- 사용자 지시에 따라 보안 프로그램 관련 404는 검증 실패에서 제외했습니다. 게임의 JavaScript 오류 및 그 외 콘솔 오류는 확인 대상에 포함했습니다.







## 6C 내부 분쟁·재통합

[전체 완료 보고와 28개 검증 항목](CONFLICTS.md). 정치 메뉴에서 분쟁 상대·상태·기간·통제율·지지도·피로를 확인합니다. 일방 독립은 정치적 대치로 시작하며 전쟁을 자동 개시하지 않습니다. 독립 확정과 재통합은 사건 선택으로 해결합니다.

## 7A 국가 간 외교

외교 메뉴에서 모든 상대국과 신생국의 관계·신뢰·위협·무역·승인·제재·조약을 조회하고 행동합니다. 같은 국가 대상 주요 행동은 3개월 대기를 적용합니다. 조약 수락은 결정론적 점수이며 전쟁과 자동참전은 구현하지 않았습니다. [28개 완료 보고 항목과 공식·검증](DIPLOMACY.md).

## 7B 군사·전쟁

준비도·지연 동원·보급·공통 군사 수행력, 전쟁명분과 선전포고, 최초 방어국 동맹의 참전 요청, 월간 전선 통제, 점령과 법적 소유권 구분, 휴전·목표 기반 평화·영토 이전·패전 종료를 구현했습니다. 전쟁 사건 18개를 추가하고 기존 509개를 포함한 619개 테스트를 통과했습니다. 실제 부대·전술·지도·일반 군사 AI는 구현하지 않습니다.

주요 파일과 34개 완료 보고 항목, 공식·제약·검증 결과는 [WARFARE.md](WARFARE.md)에 있습니다. `pnpm dev`, `pnpm test`, `pnpm build`로 실행 및 검증합니다. 개발 전용 `window.birdKingdomDebug.setWarRoll(0.5)`로 전쟁 RNG를 고정할 수 있습니다.

## 8A 기술·연구·혁신

직접 국가/주 연구, 6개 분야·36개 기술, 최대 3개 슬롯, 기술별 진척 보존, 예산·교육·첨단산업·규모·안정 기반 역량, NPC 특성별 연구, 느린 기술확산과 연구 사건 12개를 구현했습니다. 새 기술은 기존 modifier 경로로 경제·사회·인구·군사에 반영되며 독립·재통합·영토이전에서도 지식을 보존합니다. 새 재난·질병·개인 위험은 구현하지 않았습니다.

기존 619개를 포함한 **711개 테스트** 통과. 주요 파일, 공식, 실제 기술 전체 목록과 33개 완료 보고는 [TECHNOLOGY.md](TECHNOLOGY.md)에 있습니다. 실행은 `pnpm dev`, 검증은 `pnpm test`와 `pnpm build`입니다.


## 8B 재난·질병·위기 대응·지도자 위험

10종 지속 위기, 복수 위기·단계/회복, 사회·예산·기술 회복력, 경제/재정/인구/사회 영향, 독립 RNG의 보수적 질병 확산, 국제지원, 전쟁 보급 부담, 영토 대응 승계, 23개 관련 사건과 작은 지도자 상황 사망위험을 구현했습니다. 사회 메뉴에서 위기와 회복력을, 개요에서 지도자 위험을 확인합니다.

기존 711개 시나리오와 신규 131개를 합한 **842개 테스트**, TypeScript·프로덕션 빌드와 16개 브라우저 흐름을 검증했습니다. 공식·파일·600개월 결과·39개 완료 보고 항목은 [CRISES.md](CRISES.md)에 있습니다. 개발 전용 `window.birdKingdomDebug.setCrisisRoll(0.99)`로 확산을 억제하거나 0으로 강제 확산 흐름을 검사할 수 있습니다.



