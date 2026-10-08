import { createSaveData, deserializeSave, serializeSave } from './save';
import type { GameState } from './types';
import type { SaveSlot, StoredSave } from './saveTypes';
export interface SaveStorage {
    list(): Promise<SaveSlot[]>;
    get(id: string): Promise<StoredSave | null>;
    put(value: StoredSave): Promise<void>;
    remove(id: string): Promise<void>;
}
const allowed = (id: string) => id === 'auto' || id === 'quick' || /^manual-[1-5]$/.test(id);
export function createBrowserSaveStorage(): SaveStorage {
    let database: Promise<IDBDatabase> | undefined;
    const db = () => database ??= new Promise((resolve, reject) => { const r = indexedDB.open('bird-kingdom-saves', 1); r.onupgradeneeded = () => r.result.createObjectStore('slots', { keyPath: 'slotId' }); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(new Error('브라우저 저장소를 열 수 없습니다.')); r.onblocked = () => reject(new Error('다른 창에서 저장소를 사용 중입니다.')); });
    const operation = async <T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) => { const d = await db(); return new Promise<T>((resolve, reject) => { const tx = d.transaction('slots', mode), request = run(tx.objectStore('slots')); let result: T; request.onsuccess = () => result = request.result; tx.oncomplete = () => resolve(result); tx.onerror = () => reject(new Error(tx.error?.name === 'QuotaExceededError' ? '저장 공간이 부족합니다. 기존 저장은 유지됩니다.' : '저장소 작업을 완료할 수 없습니다.')); tx.onabort = () => reject(new Error('저장소 작업이 취소되었습니다. 기존 저장은 유지됩니다.')); }); };
    return { async list() { const values = await operation<StoredSave[]>('readonly', s => s.getAll()); return values.map(({ json, ...summary }) => summary); }, async get(id) { return (await operation<StoredSave | undefined>('readonly', s => s.get(id))) ?? null; }, async put(value) { if (!allowed(value.slotId))
            throw new Error('유효하지 않은 저장 슬롯입니다.'); await operation('readwrite', s => s.put(value)); }, async remove(id) { await operation('readwrite', s => s.delete(id)); } };
}
export async function saveToSlot(storage: SaveStorage, id: string, game: GameState, name?: string): Promise<SaveSlot> { if (!allowed(id))
    throw new Error('유효하지 않은 저장 슬롯입니다.'); const old = await storage.get(id); let previous; try {
    if (old)
        previous = deserializeSave(old.json);
}
catch { /* A corrupt old slot can be explicitly overwritten. */ } const data = createSaveData(game, id, name, previous), json = serializeSave(data), stored: StoredSave = { slotId: id, metadata: data.metadata, createdAt: data.createdAt, updatedAt: data.updatedAt, characters: json.length, bytes: new TextEncoder().encode(json).length, json }; await storage.put(stored); const { json: _, ...summary } = stored; return summary; }
export async function loadFromSlot(storage: SaveStorage, id: string): Promise<GameState> { const value = await storage.get(id); if (!value)
    throw new Error('비어 있는 저장 슬롯입니다.'); return deserializeSave(value.json).game; }
export async function importToSlot(storage: SaveStorage, id: string, text: string): Promise<GameState> { if (!allowed(id))
    throw new Error('유효하지 않은 저장 슬롯입니다.'); const data = deserializeSave(text); await saveToSlot(storage, id, data.game, data.metadata.name); return data.game; }
export const autosaveDue = (previous: GameState | null, next: GameState) => !!previous && next.turn > previous.turn && next.date.month === 1 && next.date.year > previous.date.year;
