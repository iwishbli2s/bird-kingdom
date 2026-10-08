import SaveConfirm from './SaveConfirm';
import {countryInfo} from '../game/runtime';
import {useDialog} from './useDialog';
import { useEffect, useState } from 'react';
import { saveToSlot, loadFromSlot, importToSlot, type SaveStorage } from '../game/saveStorage';
import { saveConfig } from '../game/save';
import type { GameState } from '../game/types';
import type { SaveSlot } from '../game/saveTypes';
export default function SaveDialog({ game, storage, onLoad, onClose }: {
    game: GameState | null;
    storage: SaveStorage;
    onLoad: (g: GameState) => void;
    onClose: () => void;
}) {
    const dialogRef=useDialog(()=>{if(!busy&&!confirm)onClose();});
    const [currentSlot,setCurrentSlot]=useState<string|null>(null);
    const [slots, setSlots] = useState<SaveSlot[]>([]), [notice, setNotice] = useState(''), [name, setName] = useState(''), [confirm, setConfirm] = useState<{
        id: string;
        action: 'save' | 'delete';
    } | null>(null), [busy, setBusy] = useState(false);
    const refresh = () => storage.list().then(setSlots);
    useEffect(() => { refresh().catch(() => setNotice('저장 목록을 읽을 수 없습니다.')); }, [storage]);
    const run = async (action: () => Promise<void>) => { setBusy(true); setNotice(''); try {
        await action();
        await refresh();
    }
    catch (e) {
        setNotice(e instanceof Error ? e.message : '저장 작업을 완료할 수 없습니다.');
    }
    finally {
        setBusy(false);
        setConfirm(null);
    } };
    const save = (id: string) => run(async () => { if (game) {
        await saveToSlot(storage, id, game, name);setCurrentSlot(id);
        setNotice('저장되었습니다.');
    } });
    const load = (id: string) => run(async () => { onLoad(await loadFromSlot(storage, id)); });
    const remove = (id: string) => run(async () => { await storage.remove(id); setNotice('저장을 삭제했습니다.'); });
    const exportFile = (id: string) => run(async () => { const s = await storage.get(id); if (!s)
        return; const d = s.metadata.gameDate, blob = new Blob([s.json], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = `bird-kingdom-save-${d.year}-${String(d.month).padStart(2, '0')}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
    return <div className="modal-backdrop save-backdrop"><section ref={dialogRef} className="panel save-dialog" role="dialog" aria-modal="true" aria-labelledby="save-title"><div className="section-heading"><h2 id="save-title">저장 / 불러오기</h2><button className="secondary" onClick={onClose} disabled={busy}>닫기</button></div><p>이 브라우저에 저장합니다. 자동 저장은 매년, 빠른 저장은 현재 진행의 간편 보관입니다. 수동 슬롯은 직접 선택합니다. JSON 파일로 별도 보관할 수 있습니다.</p>{game && <label>저장 이름<input aria-label="저장 이름" value={name} onChange={e => setName(e.target.value)} placeholder="비우면 국가와 날짜로 이름을 붙입니다" maxLength={140}/></label>}<div className="save-slots">{[...Array.from({ length: saveConfig.manualSlots }, (_, i) => 'manual-' + (i + 1)), 'quick', 'auto'].map(id => { const s = slots.find(s => s.slotId === id), label = id === 'auto' ? '자동 저장' : id === 'quick' ? '빠른 저장' : '수동 저장 ' + id.slice(-1); return <article className="save-card" key={id} data-slot={id} data-kind={id==='auto'?'auto':id==='quick'?'quick':'manual'}><h3>{label}{(currentSlot===id||!currentSlot&&game&&s?.metadata.turn===game.turn&&s.metadata.playerCountryName===countryInfo(game,game.player.controlledCountryId).name)&&<small> · 현재 진행 저장</small>}</h3>{s ? <><strong>{s.metadata.name}</strong><p>{s.metadata.gameDate.year}년 {s.metadata.gameDate.month}월 · {s.metadata.playerCountryName}{s.metadata.playerRegionName ? ' — ' + s.metadata.playerRegionName : ''}</p><p>{s.metadata.playerOffice === 'governor' ? '주지사' : '대통령'} · {s.metadata.turn}턴 · {s.metadata.playStatus === 'active' ? '운영 중' : '게임 종료'}</p><small>{new Date(s.updatedAt).toLocaleString('ko-KR')} · {(s.bytes / 1024).toFixed(1)}KB</small></> : <p className="muted">비어 있는 슬롯</p>}<div className="save-actions">{game && id !== 'auto' && <button className="secondary" disabled={busy} onClick={() => s ? setConfirm({ id, action: 'save' }) : save(id)}>저장</button>}<button className="primary" title={busy?'저장 작업 처리 중입니다.':!s?'비어 있는 슬롯입니다.':'이 진행을 불러옵니다.'} disabled={!s || busy} onClick={() => load(id)}>불러오기</button>{s && <><button className="secondary" disabled={busy} onClick={() => exportFile(id)}>내보내기</button><button className="secondary" disabled={busy} onClick={() => setConfirm({ id, action: 'delete' })}>삭제</button></>}</div></article>; })}</div><label className="save-import">JSON 저장 가져오기<input type="file" accept=".json,application/json" disabled={busy} onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (!f)
        return; if (f.size > saveConfig.maxImportBytes) {
        setNotice('가져올 파일이 너무 큽니다.');
        return;
    } run(async () => { const id = Array.from({ length: 5 }, (_, i) => 'manual-' + (i + 1)).find(id => !slots.some(s => s.slotId === id)); if (!id)
        throw new Error('가져오기 전에 수동 슬롯 하나를 비워주세요.'); await importToSlot(storage, id, await f.text()); setNotice('가져왔습니다. 해당 슬롯에서 불러오기를 선택하세요.'); }); }}/></label>{confirm&&<SaveConfirm action={confirm.action} busy={busy} onClose={()=>setConfirm(null)} onConfirm={()=>confirm.action==='save'?save(confirm.id):remove(confirm.id)}/>}<p role="status">{notice}</p></section></div>;
}

