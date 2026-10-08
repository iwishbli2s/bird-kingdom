import {useEffect,useRef,useState,useCallback} from 'react';
/** Traps only the topmost dialog, then restores the opener's focus. */
export function useDialog(onEscape?:()=>void){
 const [node,setNode]=useState<HTMLElement|null>(null),ref=useCallback((element:HTMLElement|null)=>setNode(element),[]),callback=useRef(onEscape);callback.current=onEscape;
 useEffect(()=>{
  const root=node;if(!root)return;const before=document.activeElement as HTMLElement|null;
  const focusable=()=>Array.from(root.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')).filter(e=>e.getClientRects().length>0);
  const timer=window.setTimeout(()=>{(root.querySelector<HTMLElement>('[autofocus]')??focusable()[0]??root).focus();},0);
  const key=(e:KeyboardEvent)=>{
   const dialogs=document.querySelectorAll('[role="dialog"],[role="alertdialog"]');if(dialogs[dialogs.length-1]!==root)return;
   if(e.key==='Escape'){e.preventDefault();callback.current?.();}
   if(e.key==='Tab'){const items=focusable(),first=items[0],last=items.at(-1);if(!first){e.preventDefault();root.focus();}else if(e.shiftKey&&(document.activeElement===first||!root.contains(document.activeElement))){e.preventDefault();last!.focus();}else if(!e.shiftKey&&(document.activeElement===last||!root.contains(document.activeElement))){e.preventDefault();first.focus();}}
  };
  document.addEventListener('keydown',key);return()=>{clearTimeout(timer);document.removeEventListener('keydown',key);if(before?.isConnected)before.focus();};
 },[node]);
 return ref;
}
