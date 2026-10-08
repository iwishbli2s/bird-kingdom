import { createElectionSnapshot } from '../game/election';
import { formatDate } from '../game/engine';
import type { GameState } from '../game/types';
export default function PoliticalCareerView({game,jurisdiction}:{game:GameState;jurisdiction:string}) {
  const c=game.player.career,remaining=c.termLengthMonths-c.monthsInCurrentTerm,snapshot=createElectionSnapshot(game),last=c.lastElection;
  return <section className={`panel career-panel ${remaining<=12?'election-near':''}`} aria-label="정치 경력"><div className="panel-heading"><h2>정치 경력</h2><span>{remaining<=12?'선거 준비 기간':'현 임기 운영 중'}</span></div><dl className="career-grid"><div><dt>현재 직위</dt><dd>{jurisdiction} {c.office==='president'?'대통령':'주지사'}</dd></div><div><dt>현재 임기</dt><dd>제{c.termNumber}기</dd></div><div><dt>현 임기 재임</dt><dd>{c.monthsInCurrentTerm} / {c.termLengthMonths}개월</dd></div><div><dt>다음 선거까지</dt><dd>{remaining}개월</dd></div><div><dt>재선 성공</dt><dd>{c.electionsWon}회</dd></div><div><dt>현재 재선 가능성</dt><dd>{(snapshot.reelectionChance*100).toFixed(1)}%</dd></div></dl><p className="panel-description">현재 상태와 최근 12개월 평균에 따른 추정치입니다. 실제 선거일까지 전망은 달라질 수 있습니다.</p><div className="career-last">최근 선거: {last ? `${formatDate(last.date)} · ${last.won?'승리':'패배'} · 당시 재선 확률 ${(last.snapshot.reelectionChance*100).toFixed(1)}%` : '취임 후 선거 기록 없음'}</div></section>;
}
