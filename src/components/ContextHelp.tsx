import {useState} from 'react';
import {contextHelp,glossary} from '../game/help';
import {useDialog} from './useDialog';
function HelpDialog({menu,onClose}:{menu:string;onClose:()=>void}){
 const ref=useDialog(onClose),h=contextHelp[menu]??contextHelp.overview;
 return <div className="modal-backdrop"><section ref={ref} className="panel help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title" tabIndex={-1}><div className="section-heading"><h2 id="help-title">{h.title} 도움말</h2><button className="secondary" onClick={onClose}>닫기</button></div><p>{h.text}</p><details><summary>작은 용어집</summary><dl>{glossary.map(([word,text])=><div key={word}><dt>{word}</dt><dd>{text}</dd></div>)}</dl></details></section></div>;
}
export default function ContextHelp({menu}:{menu:string}){
 const[open,setOpen]=useState(false);
 return <><button className="context-help secondary" aria-label="현재 화면 도움말" onClick={()=>setOpen(true)}> ? 도움말</button>{open&&<HelpDialog menu={menu} onClose={()=>setOpen(false)}/>}</>;
}
