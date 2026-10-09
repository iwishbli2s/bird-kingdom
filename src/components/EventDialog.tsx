import {regionInfo} from '../game/runtime';
import {useDialog} from './useDialog';
import { eventContext, getEventDefinition, jurisdictionName } from '../game/events';
import { eventCategoryLabels,eventSeverityLabels } from '../game/eventConfig';
import { formatDate } from '../game/engine';
import type { GameState } from '../game/types';
export default function EventDialog({game,onResolve,onEndTutorial}:{onEndTutorial?:()=>void;game:GameState;onResolve:(choice:string)=>void}) {
  const dialogRef=useDialog();
  const pending=game.events.pendingEvent!;const e=getEventDefinition(pending.eventId),context=eventContext(game,pending.jurisdiction,pending.conflictId,pending.diplomaticTargetId,pending.warId,pending.crisisId);context.statePairTarget=pending.statePairTarget;
  return <div className="modal-backdrop"><section ref={dialogRef} className="event-dialog panel" role="dialog" aria-modal="true" aria-labelledby="event-title"><div className="event-meta"><span>{eventCategoryLabels[e.category]}</span><span>{eventSeverityLabels[pending.severity]}</span><time>{formatDate(pending.date)}</time></div><h2 id="event-title">{e.title}</h2><strong className="event-jurisdiction">{jurisdictionName(game,pending.jurisdiction)}</strong>{pending.statePairTarget&&<p>{regionInfo(game,pending.statePairTarget.actorStateId)?.name} → {regionInfo(game,pending.statePairTarget.targetStateId)?.name}</p>}<p className="event-description">{e.description}</p><div className="event-choices">{e.choices.map((choice,i)=><button key={choice.id} autoFocus={i===0} onClick={()=>onResolve(choice.id)}><strong>{choice.labelFor?.(context)??choice.label}</strong><span>{choice.preview}</span></button>)}</div>{game.tutorial?.mode==='active'&&<><p className="tutorial-event-note">사건 선택에는 장단점이 있습니다. 선택지를 읽고 결정하세요.</p><button className="secondary" onClick={onEndTutorial}>튜토리얼 종료</button></>}<p className="event-note">사건 선택 전에는 월 진행이 중단됩니다. 대응을 선택하면 즉시 효과가 반영됩니다. 지속 효과는 다음 달부터 적용됩니다.</p></section></div>;
}
