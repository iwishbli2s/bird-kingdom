import HistoryView from './HistoryView';
import {useState} from 'react';
import { countryInfo, regionInfo } from '../game/runtime';
import { ArrowLeft, Flag, Feather } from 'lucide-react';
import Brand from './Brand';

import { formatDate } from '../game/engine';
import { formatAge, formatDuration } from '../game/mortality';
import type { GameState } from '../game/types';

export default function GameOver({ game, onExit }: { game: GameState; onExit: () => void }) {
  const [showHistory,setShowHistory]=useState(false);
  const country = countryInfo(game,game.player.defeatedCountryId??game.player.controlledCountryId);
  const region = regionInfo(game,game.player.controlledRegionId);
  const stateDefeat=game.gameOverReason==='state_defeat';
  const defeated = game.gameOverReason === 'election_defeat';
  const career = game.player.career;
  return <div className="setup-shell game-over-shell"><header className="setup-header"><Brand /><span className="version">END OF TERM</span></header><main className="game-over-content"><div className="game-over-emblem"><Feather size={44} strokeWidth={1.1} /></div><span className="eyebrow">YOUR CHAPTER HAS ENDED</span><h1>{stateDefeat?'국가 패배':defeated ? '정권 교체' : '플레이어 사망'}</h1><p className="game-over-description">{stateDefeat?'운영하던 국가가 영토를 모두 잃어 국가 운영이 종료되었습니다.':defeated ? '재선에 실패하여 정부 운영이 종료되었습니다.' : '플레이어의 생애가 끝나 정부 운영이 종료되었습니다.'}</p>{game.tutorial&&game.tutorial.mode!=='skipped'&&<p className="tutorial-complete">{defeated?'Bird Kingdom에서는 재선 실패도 통치의 종료입니다. 메인 메뉴에서 튜토리얼을 다시 시작할 수 있습니다.':'메인 메뉴에서 튜토리얼을 다시 시작할 수 있습니다.'}</p>}<section className="game-over-summary" aria-label="최종 운영 기록"><div className="game-over-jurisdiction"><Flag size={22} /><div><strong>{country.name}</strong>{region && <span>{region.name} · 주 정부</span>}</div></div><dl><div><dt>최종 나이</dt><dd>{formatAge(game.player.ageMonths)}</dd></div><div><dt>집권 기간</dt><dd>{formatDuration(game.turn - 1)}</dd></div><div><dt>마지막 플레이 날짜</dt><dd>{formatDate(game.player.deathDate ?? game.date)}</dd></div><div><dt>완료한 임기</dt><dd>{Math.floor((game.turn - 1) / career.termLengthMonths)}기</dd></div><div><dt>선거 승리</dt><dd>{career.electionsWon}회</dd></div><div><dt>선거 패배</dt><dd>{career.electionsLost}회</dd></div></dl></section><button className="secondary" onClick={()=>setShowHistory(!showHistory)}>역사 기록 보기</button>{showHistory&&<HistoryView game={game}/>}<button className="primary" onClick={onExit}><ArrowLeft size={17} /> 메인 메뉴로 돌아가기</button></main><footer className="setup-footer"><span>BIRD KINGDOM / 국가 운영 시뮬레이션</span><span>운영 종료</span></footer></div>;
}

