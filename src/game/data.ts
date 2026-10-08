import type { CountryDefinition, RegionDefinition, StartingCountryId } from './types';

export { speciesDefinitions as species } from './populationConfig';
export const countries: readonly (CountryDefinition & { id: StartingCountryId })[] = [
  {
    id: 'sparrow', name: '참새자유공화국', englishName: 'FREE REPUBLIC OF SPARROWS',
    governmentType: 'centralized-presidential-republic', governmentLabel: '중앙집권 공화국',
    description: '네 종족이 함께 세운 대통령제 공화국. 중앙 정부를 이끌며 국가 전체의 새로운 미래를 설계합니다.',
    playScope: '국가 전체를 직접 운영', speciesIds: ['sparrow', 'crow', 'swallow', 'magpie'], regionIds: [],
  },
  {
    id: 'pigeon', name: '비둘기민주연방', englishName: 'DEMOCRATIC FEDERATION OF PIGEONS',
    governmentType: 'federation', governmentLabel: '연방제 국가',
    description: '서로 다른 강점을 지닌 네 개 주의 연방. 하나의 주를 선택해 주 정부의 운영을 시작합니다.',
    playScope: '4개 주 중 하나를 운영', speciesIds: ['pigeon', 'eagle', 'owl', 'duck'],
    regionIds: ['pigeon-state', 'eagle-state', 'owl-state', 'duck-state'],
  },
];
export const regions: readonly RegionDefinition[] = [
  { id: 'pigeon-state', initialOwnerCountryId: 'pigeon', name: '비둘기주', englishName: 'PIGEON STATE', specialty: '정치 · 금융 · 서비스', description: '연방 수도가 자리한 정치·경제 중심지. 금융과 서비스 산업이 모이는 연방의 심장입니다.', isCapital: true },
  { id: 'eagle-state', initialOwnerCountryId: 'pigeon', name: '독수리주', englishName: 'EAGLE STATE', specialty: '군사 · 군수산업 · 중공업', description: '연방의 군사와 제조 기반을 담당하는 지역. 군수산업과 중공업이 중심을 이룹니다.', isCapital: false },
  { id: 'owl-state', initialOwnerCountryId: 'pigeon', name: '부엉이주', englishName: 'OWL STATE', specialty: '연구 · 교육 · 첨단산업', description: '대학과 연구기관이 모인 지식의 중심지. 교육과 첨단산업을 주요 특성으로 갖습니다.', isCapital: false },
  { id: 'duck-state', initialOwnerCountryId: 'pigeon', name: '오리주', englishName: 'DUCK STATE', specialty: '농업 · 식량 · 수자원', description: '넓은 농경지와 풍부한 수자원을 지닌 지역. 연방의 농업과 식량 공급 기반입니다.', isCapital: false },
];
export { initialGovernance } from './governanceConfig';

