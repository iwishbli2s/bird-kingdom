export interface TutorialStep {
  id: string;
  title: string;
  menu: string;
  target: string;
  text: string;
  kind: 'read' | 'action' | 'wait';
  month?: number;
}
export const tutorialSteps: TutorialStep[] = [
  {id:'overview',title:'국가 개요',menu:'overview',target:'.command-summary',kind:'read',text:'날짜와 직위, GDP·인구·지지도를 먼저 확인하세요. 정부 지지도는 재선에 큰 영향을 주며 경제와 생활 수준, 종족 만족도에 따라 변합니다.'},
  {id:'month',title:'첫 한 달',menu:'overview',target:'.next-month',kind:'action',text:'실제 ‘다음 달’ 버튼을 누르세요. 한 달의 경제·재정·사회 계산과 나이 증가가 함께 진행됩니다.'},
  {id:'economy',title:'경제 읽기',menu:'economy',target:'.economy-summary-grid',kind:'read',text:'GDP는 산업 생산의 합계입니다. 성장·실업·물가를 함께 읽으세요. 농업은 식량, 제조업은 생산, 서비스는 생활, 첨단은 혁신, 방위는 군수 기반입니다. 성장률은 한 달 변화를 연율로 표시하므로 장기 평균과 다릅니다.'},
  {id:'tax',title:'세율 초안과 적용',menu:'budget',target:'.tax-policy-panel',kind:'action',text:'재정 및 조세 탭에서 소득세 등 한 세율의 초안을 조정하고 ‘세율 적용’을 누르세요. 세율은 3개월마다 바꿀 수 있고 새 정책은 다음 달부터 반영됩니다.'},
  {id:'budget',title:'예산 배분',menu:'budget',target:'.budget-policy-panel',kind:'action',text:'‘예산 편성’ 탭에서 인프라 등 한 분야를 0.3%p 정도 조정해 적용하세요. 예상 수지를 확인하세요. 일반 예산은 12개월마다 변경할 수 있습니다.'},
  {id:'population',title:'인구와 구성',menu:'species',target:'.population-view',kind:'read',text:'총인구와 종족 구성, 출생·사망·순이동을 확인하세요. 인구 변화는 생활·보건·이동 여건과 연결됩니다.'},
  {id:'society',title:'사회 기반',menu:'society',target:'.social-view',kind:'read',text:'생활 수준·교육·보건·치안·불평등을 함께 보세요. 예산의 효과는 여러 달에 걸쳐 나타납니다.'},
  {id:'species',title:'종족정치',menu:'species',target:'.species-politics-view',kind:'read',text:'‘종족 정치’ 탭에서 참새·까마귀·제비·까치의 만족도와 자치 요구, 독립 성향을 확인하세요. 불만이 오래 누적되면 자치운동과 독립 문제로 발전할 수 있습니다.'},
  {id:'event-wait',title:'첫 사건까지',menu:'overview',target:'.next-month',kind:'wait',month:6,text:'2030년 7월에 까마귀 행정 청원을 받습니다. ‘다음 안내까지 진행’도 매월 실제 계산을 실행하며 대응할 제안이 있으면 멈춥니다.'},
  {id:'event',title:'사건의 장단점',menu:'species',target:'.event-dialog',kind:'action',text:'사건창의 실제 선택지를 읽고 결정하세요. 모든 선택에는 장단점이 있으며 정답 표시는 없습니다. 선택 후 기록에서 결과를 확인할 수 있습니다.'},
  {id:'technology',title:'연구 시작',menu:'technology',target:'.research-slots',kind:'action',text:'최대 3개 연구 슬롯을 사용할 수 있습니다. 시작 연구가 세 슬롯을 쓰고 있으므로 하나를 ‘연구 중단’한 뒤 아래 다른 기술을 ‘우선 연구 지정’하세요. 중단해도 진척은 보존됩니다. 연구에는 여러 달이 필요하며 인프라 기술은 생산성·재난 대응·보급에도 연결됩니다.'},
  {id:'diplomacy',title:'이웃과 관계 개선',menu:'diplomacy',target:'[data-diplomacy-action="improve"]',kind:'action',text:'비둘기민주연방을 선택하고 ‘관계 개선’을 실행하세요. 관계는 태도, 신뢰는 합의 기반, 위협은 안보 부담, 무역은 교역 수준입니다. 관계 악화와 전쟁명분은 전쟁으로 이어질 수 있습니다.'},
  {id:'crisis-wait',title:'위기 안내까지',menu:'overview',target:'.next-month',kind:'wait',month:24,text:'2032년 1월까지 운영을 이어갑니다. 연구와 정책 효과가 매월 반영되며 NPC 정부도 정상적으로 행동합니다.'},
  {id:'crisis',title:'폭풍과 회복',menu:'society',target:'.crisis-view',kind:'read',text:'중간 강도의 폭풍이 발생했습니다. 강도·영향·회복 진척·회복력을 확인하세요. 앞서 투자한 인프라와 기술은 위기 대응에도 도움이 됩니다.'},
  {id:'emergency',title:'긴급 예산의 조건',menu:'budget',target:'.budget-policy-panel',kind:'read',text:'예산 편성 탭에서 긴급 수정 조건을 확인하세요. 강도 75 이상 위기나 전쟁에서만 사용할 수 있습니다. 이번 중간 폭풍만으로는 열리지 않으며, 사용하면 6개월 대기와 새 12개월 잠금이 적용됩니다.'},
  {id:'risk',title:'지도자 상황위험',menu:'overview',target:'.leader-risk-panel',kind:'read',text:'개요의 지도자 상황위험을 확인하세요. 재난·질병·분쟁이 위험에 영향을 줍니다. 확률 숫자 대신 위험 수준과 요인으로 읽을 수 있습니다.'},
  {id:'election-wait',title:'선거 준비까지',menu:'overview',target:'.next-month',kind:'wait',month:42,text:'2033년 7월까지 진행합니다. 세금·예산·연구는 계속 실제 화면에서 관리할 수 있습니다.'},
  {id:'election-prep',title:'첫 재선 준비',menu:'politics',target:'.career-panel',kind:'read',text:'지지도·안정도·재선 전망·남은 임기를 확인하세요. 선거는 현재 상태와 최근 12개월 운영을 함께 읽습니다. 특정 정책이 승리를 보장하지는 않습니다.'},
  {id:'election',title:'2034년 1월 재선',menu:'politics',target:'.next-month',kind:'wait',month:48,text:'2034년 1월 첫 재선까지 진행하세요. 기존 선거 규칙으로 결과를 결정합니다. 승리하면 같은 세계에서 자유 플레이, 패배하면 집권이 종료됩니다.'},
];
