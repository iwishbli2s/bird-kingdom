import {latestPatch} from '../game/patchNotes';
import StateRelationsView from './StateRelationsView';
import type {StateAction,BlocPurpose} from '../game/types';
import FederalPoliticsView from './FederalPoliticsView';
import type {FederalAction,AutonomyDemandLevel} from '../game/types';
import AchievementView from './AchievementView';
import {achievementDefinitions} from '../game/achievementConfig';
import ExitGameDialog from './ExitGameDialog';
import TutorialGuide from './TutorialGuide';
import ContextHelp from './ContextHelp';
import {acknowledgeTutorial,skipTutorial,tutorialAdvanceBlock} from '../game/tutorial';
import {selectAttention} from '../game/attention';
import {formatEconomyNumber} from './EconomyMetrics';
import {difficultyConfig} from '../game/difficulty';
import StrategicView from './StrategicView';
import GovernmentPolicyView from './GovernmentPolicyView';
import CrisisView, { LeaderRiskView } from './CrisisView';
import TechnologyView from './TechnologyView';
import type { TechnologyDomain } from '../game/types';
import MilitaryView, { type MilitaryActions } from './MilitaryView';
import type { WarGoal } from '../game/types';
import DiplomacyView from './DiplomacyView';
import type { DiplomaticAction } from '../game/types';
import ConflictView from './ConflictView';
import SecessionView from './SecessionView';
import { countryInfo, regionInfo } from '../game/runtime';
import HistoryView from './HistoryView';
import PoliticalCareerView from './PoliticalCareerView';
import PoliticsView from './PoliticsView';
import SocialView from './SocialView';
import { Activity, ArrowRight, Bird, CalendarDays, ChevronRight, CircleHelp, Flag, Globe2, GraduationCap, History, Landmark, LayoutDashboard, Menu, Shield, TrendingUp, Users, Wallet } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Brand from './Brand';
import { species } from '../game/data';
import { formatDate } from '../game/engine';
import { campaignTimeDisplay } from './timeDisplay';
import type { BudgetPolicy, GameState, TaxPolicy } from '../game/types';
import EconomyMetrics from './EconomyMetrics';
import EconomyView from './EconomyView';
import FiscalView from './FiscalView';
import PopulationView, { formatPopulation } from './PopulationView';
import { selectControlledRuntime } from '../game/world';

const navigation = [
  { id: 'overview', label: '개요', icon: LayoutDashboard }, { id: 'economy', label: '경제', icon: TrendingUp },
  { id: 'budget', label: '예산', icon: Wallet }, { id: 'society', label: '사회', icon: Users },
  { id: 'species', label: '종족', icon: Bird }, { id: 'politics', label: '정치', icon: Landmark },
  { id: 'diplomacy', label: '외교', icon: Globe2 }, { id: 'military', label: '군사', icon: Shield },
  { id: 'technology', label: '기술', icon: GraduationCap }, { id: 'history', label: '기록', icon: History }, {id:'achievements',label:'업적',icon:Flag},
];
const governanceMetrics: { key: 'approval' | 'stability' | 'integration' | 'livingStandard'; label: string; color: string }[] = [
  { key: 'approval', label: '정부 지지도', color: 'mint' }, { key: 'stability', label: '안정도', color: 'blue' },
  { key: 'livingStandard', label: '생활 수준', color: 'gold' }, { key: 'integration', label: '통합도', color: 'purple' },
];

export default function Dashboard({ game, onAdvance, onExit, onTaxPolicy, onBudgetPolicy, onDiplomaticAction, onMobilization, onWarAction, onPeace, onDeclare, onResearch,onFederalAction,onStateAction,onTutorialChange,onFastForward,fastForward,annualAuto,onToggleAnnual }: MilitaryActions & {annualAuto:boolean;onToggleAnnual:()=>void;onStateAction:(target:string,action:StateAction,purpose:BlocPurpose,rival:string|null)=>void;onFederalAction:(action:FederalAction,level:AutonomyDemandLevel)=>void; onTutorialChange:(g:GameState)=>void;onFastForward:()=>void;fastForward:boolean; onResearch:(domain:TechnologyDomain,id:string|null)=>void; onDeclare:(id:string,goal:WarGoal)=>void; game: GameState; onAdvance: () => void; onExit: () => void; onTaxPolicy: (policy: TaxPolicy) => void; onBudgetPolicy: (policy: BudgetPolicy,emergency?:boolean) => void; onDiplomaticAction:(target:string,action:DiplomaticAction)=>void }) {
  const shellRef=useRef<HTMLDivElement>(null),headerRef=useRef<HTMLElement>(null);
  useEffect(()=>{
    const header=headerRef.current,shell=shellRef.current;if(!header||!shell)return;
    const measure=()=>shell.style.setProperty('--topbar-height',header.getBoundingClientRect().height+'px');
    measure();const observer=new ResizeObserver(measure);observer.observe(header);return()=>observer.disconnect();
  },[]);
  const [active, setActive] = useState('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const country = countryInfo(game,game.player.controlledCountryId);
  const region = regionInfo(game,game.player.controlledRegionId);
  const currentMenu = navigation.find(item => item.id === active)!;
  const jurisdiction = region?.name ?? country.name;
  const { economy, fiscal, governance, population, speciesPolitics, social } = selectControlledRuntime(game);
  const attention=selectAttention(game),advanceReason=tutorialAdvanceBlock(game)??(game.events.pendingEvent?'사건 선택을 먼저 완료하세요.':game.world.foreignProposals?.some(p=>p.targetId===game.player.controlledCountryId)||game.world.warfare?.allyRequests.some(p=>p.status==='pending'&&p.allyCountryId===game.player.controlledCountryId)?'외교·동맹 제안에 먼저 답변하세요.':null);
  const timeDisplay = campaignTimeDisplay(game);
  const overview = { ...governance!, livingStandard: social!.livingStandard };
  return <div className="game-shell" ref={shellRef}><aside className={`sidebar ${mobileOpen ? 'is-open' : ''}`}><Brand /><div className="sidebar-section-label">정부 운영</div><nav aria-label="정부 운영 메뉴">{navigation.map(item => <button aria-current={active===item.id?'page':undefined} key={item.id} className={`nav-item ${active === item.id ? 'active' : ''}`} onClick={() => { setActive(item.id); setMobileOpen(false); }}><item.icon size={18} strokeWidth={1.7} /><span>{item.label}</span>{!['overview', 'economy', 'budget', 'species', 'society', 'politics', 'history', 'diplomacy', 'military', 'technology', 'achievements'].includes(item.id) && <span className="nav-soon">예정</span>}{active === item.id && <ChevronRight className="nav-chevron" size={15} />}</button>)}</nav><div className="sidebar-bottom"><div className="build-label"><span className="status-dot" /> 국가 운영 <span>v{latestPatch.version}</span></div><button className="exit-button" onClick={() => setShowExit(true)}><ArrowRight size={16} /> 메인 메뉴</button></div></aside>
    <div className="game-main"><header className="topbar" ref={headerRef}><div className="topbar-country"><button className="mobile-menu icon-button" aria-expanded={mobileOpen} aria-label="메뉴 열기" onClick={() => setMobileOpen(!mobileOpen)}><Menu size={20} /></button><span className="small-emblem"><Flag size={20} /></span><strong>{country.name}</strong>{region && <><span className="topbar-separator">/</span><span className="region-name">{region.name}</span></>}<span className="topbar-tag">{region ? '주 정부' : '중앙 정부'}</span></div><div className="topbar-actions"><div className="topbar-time" role="status" aria-live="polite" aria-atomic="true"><div className="topbar-date"><CalendarDays size={17} aria-hidden="true" /><strong>{formatDate(game.date)}</strong></div><span className="topbar-age">나이 {timeDisplay.age}</span><span className="topbar-reign">{timeDisplay.reign}</span></div><button className="primary next-month" disabled={!!advanceReason} title={advanceReason??'한 달의 운영을 계산합니다.'} aria-describedby={advanceReason?'month-advance-reason':undefined} onClick={onAdvance}>다음 달 <ArrowRight size={19} /></button></div>{advanceReason&&<p id="month-advance-reason" className="advance-reason" role="status">{advanceReason}</p>}</header>
      <main className="dashboard-content"><p className="difficulty-current">난이도: {difficultyConfig[game.difficulty??'normal'].label} · 게임 중 변경 불가</p><label className="annual-setting"><input type="checkbox" checked={annualAuto} onChange={onToggleAnnual}/> 연간 보고 자동 표시</label><ContextHelp menu={active}/>{game.achievements?.unlocked.filter(u=>u.unlockedAt.year===game.date.year&&u.unlockedAt.month===game.date.month).map(u=><p className="achievement-notice" role="status" key={u.achievementId}>대형 업적 달성 · {achievementDefinitions.find(d=>d.id===u.achievementId)?.name}</p>)}<div className="breadcrumb">정부 운영 <ChevronRight size={12} /> {currentMenu.label}</div><div className="page-heading"><div><span className="eyebrow">{active === 'overview' ? 'NATIONAL OVERVIEW' : active === 'economy' ? 'ECONOMIC OVERVIEW' : 'GOVERNMENT OPERATIONS'}</span><h1>{active === 'overview' ? '국정 개요' : active === 'budget' ? '재정 및 조세' : active === 'species' ? '인구 및 종족' : currentMenu.label}</h1><p>{active === 'overview' ? `${jurisdiction}의 주요 지표와 운영 현황을 확인하세요.` : active === 'economy' ? '산업별 생산과 주요 경제 지표를 확인하세요.' : active === 'budget' ? '정부 결산을 확인하고 다음 달에 적용할 세율을 결정하세요.' : active === 'species' ? '현재 인구와 종족별 구성, 월간 변화를 확인하세요.' : active === 'society' ? '생활수준과 사회 기반의 변화, 사회적 격차를 확인하세요.' : active === 'politics' ? '정부 평가, 정치적 안정과 공동체 결속의 변화를 확인하세요.' : active === 'diplomacy' ? '국가 간 관계와 승인, 교역 및 조약을 관리하세요.' : active === 'technology' ? '학술 횃대의 연구와 기술 발전을 관리하세요.' : active === 'military' ? '군사 준비와 동원, 비행회랑 전쟁 및 평화협정을 관리하세요.' : active === 'history' ? '세계의 주요 사건과 정부 대응을 시간순으로 확인하세요.' : active==='achievements' ? '통치의 역사에 남긴 위업과 획득일, 점수를 확인하세요.' : '새로운 운영 시스템을 준비하고 있습니다.'}</p></div><div className="player-status"><span className="player-age" aria-label="플레이어 나이">{timeDisplay.age}</span><span className="live-label"><span className="status-dot" /> {region ? '주 운영 중' : '국가 운영 중'}</span></div></div>
        <TutorialGuide game={game} active={active} onNavigate={setActive} onRead={()=>onTutorialChange(acknowledgeTutorial(game,active))} onStop={()=>onTutorialChange(skipTutorial(game))} onFastForward={onFastForward} busy={fastForward}/>{active==='achievements'?<AchievementView game={game}/>:active === 'overview' ? <><section className="command-summary panel" aria-label="핵심 운영 상태"><div><span>직위 · 나이</span><strong>{region?'주지사':'대통령'} · {timeDisplay.age}</strong></div><div><span>GDP · 십억 BK</span><strong title={economy.gdp.toLocaleString('ko-KR')}>{formatEconomyNumber(economy.gdp)}</strong></div><div><span>총인구</span><strong title={population.total.toLocaleString('ko-KR')}>{formatPopulation(population.total)} 명</strong></div><div><span>정부 지지도</span><strong>{governance!.approval.toFixed(1)} / 100</strong></div><div><span>국고 / 부채 · 십억 BK</span><strong>{formatEconomyNumber(fiscal.treasury)} / {formatEconomyNumber(fiscal.debt)}</strong></div></section><section className="attention-panel panel" aria-label="조치 필요"><h2>조치 필요</h2>{attention.length?attention.map(a=><button className="attention-item secondary" data-level={a.level} key={a.id} onClick={()=>setActive(a.menu)}><span>{({critical:'필수 대응',warning:'주의',info:'안내'})[a.level]}</span>{a.label}<ChevronRight size={14}/></button>):<p>현재 우선 확인할 항목이 없습니다.</p>}</section><section className="identity-banner"><div className="identity-symbol"><Flag size={34} strokeWidth={1.2} /></div><div className="identity-copy"><span className="eyebrow">{region?.englishName ?? country.englishName}</span><h2>{jurisdiction}</h2><p>{region ? region.specialty : country.governmentLabel+' · 국가 전체 운영'}</p></div><div className="identity-detail"><span>운영 체제</span><strong>{region ? '연방제 · 주 정부' : '대통령제 공화국'}</strong></div><div className="identity-detail"><span>운영 시작</span><strong>2030년 1월</strong></div><div className="banner-watermark" aria-hidden="true"><Bird size={130} strokeWidth={0.8} /></div></section>
        <LeaderRiskView game={game}/><section aria-labelledby="economic-heading"><div className="section-heading"><h2 id="economic-heading"><TrendingUp size={17} /> 경제 현황</h2><span>월간 경제 시뮬레이션</span></div><EconomyMetrics economy={economy} fiscal={fiscal} /></section>
        <section aria-labelledby="governance-heading"><div className="section-heading"><h2 id="governance-heading"><Activity size={17} /> 정부와 사회</h2><span>지표 범위 0–100</span></div><div className="governance-grid">{governanceMetrics.map(metric => <article className={`governance-card ${metric.color}`} key={metric.key}><div className="metric-label">{metric.label}<span className="indicator-dot" /></div><div className="governance-value">{overview[metric.key].toFixed(1)}<span>/ 100</span></div><div className="gauge" role="meter" aria-label={metric.label} aria-valuenow={overview[metric.key]} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${overview[metric.key]}%` }} /></div></article>)}</div></section>
        <section className="population-overview"><div><Users size={22} /><div><span>총인구</span><strong data-testid="overview-population">{formatPopulation(population.total)}<small> 명</small></strong></div></div><button className="secondary" onClick={() => setActive('species')}>인구 및 종족 보기 <ChevronRight size={16} /></button></section><div className="bottom-grid"><section className="panel species-panel"><div className="panel-heading"><h2><Users size={17} /> 구성 종족</h2><span>{country.speciesIds.length}개 종족</span></div><p className="panel-description">{country.name}을 함께 구성하는 종족</p><div className="species-list">{country.speciesIds.map(id => { const item = species.find(entry => entry.id === id)!; return <div className="species-item" key={id}><span className="species-icon">{item.code}</span><span>{item.name}</span></div>; })}</div><div className="panel-footnote"><CircleHelp size={13} /> 종족 메뉴에서 인구 구성을 확인할 수 있습니다.</div></section><section className="panel log-panel"><div className="panel-heading"><h2><History size={17} /> 최근 기록</h2><span>전체 {game.logs.length}건</span></div><div className="log-list" aria-live="polite" aria-relevant="additions">{game.logs.map((log, index) => <div className={`log-item ${index === 0 ? 'latest' : ''}`} key={log.id}><span className="log-dot" /><div><time>{formatDate(log.date)}</time><p>{log.message}</p></div>{index === 0 && <span className="log-new">최근</span>}</div>)}</div></section></div><p className="dashboard-note"><CircleHelp size={14} /> 매월 경제·재정·사회가 변화합니다. 정책 효과에는 시간이 필요하며 사건과 제안은 답변 후 다음 달로 진행할 수 있습니다.</p></> : active === 'technology' ? <TechnologyView game={game} onResearch={onResearch}/> : active === 'military' ? <MilitaryView game={game} onMobilization={onMobilization} onWarAction={onWarAction} onPeace={onPeace}/> : active === 'diplomacy' ? <><GovernmentPolicyView game={game}/><StrategicView game={game}/><DiplomacyView game={game} onAction={onDiplomaticAction} onDeclare={onDeclare}/></> : active === 'economy' ? <EconomyView economy={economy} jurisdiction={jurisdiction} /> : active === 'budget' ? <FiscalView game={game} fiscal={fiscal} economy={economy} jurisdiction={jurisdiction} turn={game.turn} onApply={onTaxPolicy} onBudgetApply={onBudgetPolicy} /> : active === 'history' ? <HistoryView game={game}/> : active === 'politics' ? <><PoliticalCareerView game={game} jurisdiction={jurisdiction}/><FederalPoliticsView game={game} onAction={onFederalAction}/><StateRelationsView game={game} onAction={onStateAction}/><ConflictView game={game}/><SecessionView game={game}/><PoliticsView governance={governance!} population={population} politics={speciesPolitics ?? {}} jurisdiction={jurisdiction} /></> : active === 'society' ? <><CrisisView game={game}/><SocialView social={social!} jurisdiction={jurisdiction} /></> : active === 'species' ? <PopulationView politics={speciesPolitics ?? {}} population={population} jurisdiction={jurisdiction} turn={game.turn} /> : <section className="coming-soon"><div className="coming-icon"><currentMenu.icon size={36} strokeWidth={1.3} /></div><span className="eyebrow">COMING IN A FUTURE UPDATE</span><h2>추후 업데이트 예정</h2><p>{currentMenu.label} 시스템은 다음 개발 단계에서 추가됩니다.<br />현재는 개요에서 기본 현황을 확인하고 시간을 진행할 수 있습니다.</p><button className="secondary" onClick={() => setActive('overview')}>개요로 돌아가기 <ArrowRight size={16} /></button></section>}
      </main></div>
    {showExit&&<ExitGameDialog onClose={()=>setShowExit(false)} onExit={onExit}/>}
  </div>;
}






