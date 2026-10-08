import type {AchievementDefinition,RuleGrade} from './achievementTypes';
const achievement=(id:string,name:string,description:string,score:number,family?:string,hidden=false):AchievementDefinition=>({id,name,description,score,hidden,...(family?{family}:{})});
export const achievementDefinitions:AchievementDefinition[]=[
 achievement('reign-50','반세기의 통치','50년 이상 재임했습니다.',400,'reign'),
 achievement('reign-100','한 세기의 통치','100년 이상 재임했습니다.',1200,'reign'),
 achievement('election-10','열 번의 신임','플레이어가 참여한 선거에서 10회 연속 승리했습니다.',400,'election'),
 achievement('election-20','스무 번의 신임','직위 전환을 포함해 선거에서 20회 연속 승리했습니다.',1000,'election'),
 achievement('economy-5','세계 최대 경제','연간 기록에서 5년 연속 단독 GDP 1위를 유지했습니다.',400,'economy'),
 achievement('economy-20','경제 패권의 시대','연간 기록에서 20년 연속 단독 GDP 1위를 유지했습니다.',800,'economy'),
 achievement('technology-5','세계 최고의 연구국가','연간 기록에서 5년 연속 단독 기술점수 1위를 유지했습니다.',400,'technology'),
 achievement('technology-20','학술의 세기','연간 기록에서 20년 연속 단독 기술점수 1위를 유지했습니다.',800,'technology'),
 achievement('golden-age','황금시대','10년 연속 생활·교육·의료·치안 85 이상, 불평등 20 이하를 유지했습니다.',600),
 achievement('crisis-1','국가적 재앙 극복','통치 관할의 최고 강도 90 이상 재앙을 실제 회복 완료했습니다.',500,'crisis'),
 achievement('crisis-3','재앙을 넘어선 국가','최고 강도 90 이상 재앙 세 건을 회복 완료했습니다.',800,'crisis'),
 achievement('independence','독립국 수립','처음 통치한 연방 주의 독립국을 계속 통치하며 주권을 확립했습니다.',500),
 achievement('peaceful-independence','투표로 세운 나라','처음 통치한 주가 법적 독립 절차로 건국했습니다.',200),
 achievement('undefeated','전쟁 무패','국제전쟁 다섯 건 이상에서 승리하고 패배한 전쟁이 없습니다.',700),
 achievement('giant-slayer','대국 격파','개전 당시 역량이 두 배 이상인 상대에게 국제전쟁에서 승리했습니다.',800),
 achievement('peace-50','긴 평화','통치 관할이 국제전쟁 없이 50년 연속 존속했습니다.',200,'peace'),
 achievement('peace-100','평화의 세기','통치 관할이 국제전쟁 없이 100년 연속 존속했습니다.',400,'peace'),
 achievement('cohesion','공동체의 시대','25년 연속 안정도 80·통합도 85 이상을 유지했습니다.',500),
 achievement('fiscal','번영의 재정','10년 연속 GDP 대비 부채 10% 이하와 생활 수준 75 이상을 유지했습니다.',400),
 achievement('world-unification','세계 통일','유일한 활성 주권국으로 모든 지역의 소유권을 확보했습니다.',3000),
 achievement('reverse-federation','역전된 연방','연방의 한 주로 시작해 독립을 쟁취하고, 마침내 옛 본국의 모든 영토를 흡수했습니다.',2800,undefined,true),
];
export const achievementConfig={severeCrisis:90,goldenSocial:85,goldenInequality:20,giantRatio:2,cohesionStability:80,cohesionIntegration:85,fiscalDebtRatio:.1,fiscalLiving:75};
export const scoreConfig={achievementScores:Object.fromEntries(achievementDefinitions.map(d=>[d.id,d.score])),gradeThresholds:[{grade:'SSS',score:7000},{grade:'SS',score:4200},{grade:'S',score:2600},{grade:'A',score:1400},{grade:'B',score:700},{grade:'C',score:200},{grade:'D',score:0}] as {grade:RuleGrade;score:number}[]};
