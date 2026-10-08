import {useDialog} from './useDialog';
export default function ExitGameDialog({onClose,onExit}:{onClose:()=>void;onExit:()=>void}){
 const ref=useDialog(onClose);
 return <div className="modal-backdrop"><section ref={ref} className="exit-dialog" role="dialog" aria-modal="true" aria-labelledby="exit-title"><h2 id="exit-title">메인 메뉴로 돌아가시겠습니까?</h2><p>마지막 저장 이후의 진행은 보존되지 않습니다. 먼저 저장 여부를 확인하세요.</p><div><button className="secondary" onClick={onClose}>계속 운영</button><button className="primary" onClick={onExit}>메인 메뉴로</button></div></section></div>;
}
