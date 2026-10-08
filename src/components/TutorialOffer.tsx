import {useDialog} from './useDialog';
export default function TutorialOffer({onStart,onSkip}:{onStart:()=>void;onSkip:()=>void}){
 const ref=useDialog(onSkip);
 return <div className="modal-backdrop"><section ref={ref} className="panel tutorial-offer" role="dialog" aria-modal="true" aria-labelledby="tutorial-offer-title"><span className="eyebrow">첫 번째 임기</span><h2 id="tutorial-offer-title">Bird Kingdom, 처음이신가요?</h2><p>참새자유공화국에서 첫 재선까지 실제 운영하며 배웁니다. Normal 난이도 · 2030년 1월–2034년 1월.</p><p>주요 구간만 안내하며 설명 없는 달은 빠르게 진행할 수 있습니다. 언제든 같은 세계에서 자유 플레이로 전환할 수 있습니다.</p><div><button className="primary" onClick={onStart}>처음부터 배우기</button><button className="secondary" onClick={onSkip}>튜토리얼 건너뛰기</button></div></section></div>;
}
