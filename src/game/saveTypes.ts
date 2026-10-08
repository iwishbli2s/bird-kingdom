import type { GameState, GameDate } from './types';
export interface SaveMetadata {
    saveId: string;
    name: string;
    gameDate: GameDate;
    playerCountryName: string;
    playerRegionName?: string;
    playerOffice: string;
    turn: number;
    playStatus: 'active' | 'game_over';
    gameOverReason?: string;
    countryCount: number;
}
export interface SaveGameData {
    saveVersion: number;
    createdAt: string;
    updatedAt: string;
    metadata: SaveMetadata;
    game: GameState;
}
export interface SaveSlot {
    slotId: string;
    metadata: SaveMetadata;
    createdAt: string;
    updatedAt: string;
    characters: number;
    bytes: number;
}
export interface StoredSave extends SaveSlot {
    json: string;
}
