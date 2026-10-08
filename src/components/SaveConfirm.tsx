import {useDialog} from './useDialog';
export default function SaveConfirm({action,busy,onClose,onConfirm}:{action:'save'|'delete';busy:boolean;onClose:()=>void;onConfirm:()=>void}){
 const ref=useDialog(()=>{if(!busy)onClose();});
 return <div className="save-confirm-backdrop"><section ref={ref} className="save-confirm" role="alertdialog" aria-modal="true" aria-label="저장 확인"><p>{action==='save'?'이 슬롯의 기존 저장을 덮어쓰시겠습니까?':'이 저장을 삭제하시겠습니까?'}</p><button className="secondary" disabled={busy} onClick={onClose}>취소</button><button className="primary" disabled={busy} onClick={onConfirm}>확인</button></section></div>;
}
