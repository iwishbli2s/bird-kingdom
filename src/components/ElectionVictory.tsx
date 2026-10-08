import {useDialog} from './useDialog';
import { Check, Landmark } from 'lucide-react';
import type { PoliticalCareerState } from '../game/types';
export default function ElectionVictory({career,onContinue}:{career:PoliticalCareerState;onContinue:()=>void}) {
  const dialogRef=useDialog(onContinue);
  return <div className="modal-backdrop"><section ref={dialogRef} className="exit-dialog election-result" role="dialog" aria-modal="true" aria-labelledby="election-title"><Landmark size={30}/><h2 id="election-title">선거 승리</h2><p>재선에 성공하여 새로운 임기가 시작됩니다.</p><dl><div><dt>선거 당시 재선 확률</dt><dd>{(career.lastElection!.snapshot.reelectionChance*100).toFixed(1)}%</dd></div><div><dt>현재 임기</dt><dd>제{career.termNumber}기</dd></div></dl><button className="primary" autoFocus onClick={onContinue}><Check size={17}/>계속 운영</button></section></div>;
}
