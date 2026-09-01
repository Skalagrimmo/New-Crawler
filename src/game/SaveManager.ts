import { EnemyEntity, PlayerCharacter } from './Entities';
import { GameZone, GameLogEntry, HackPuzzleState } from './GameCore';
import { SerializedWorld } from './GameWorld';

export interface SerializedGameState {
  version: number;
  timestamp: number;
  savedAtFormatted: string;
  slotLabel?: string;
  player: PlayerCharacter;
  playerPos: { x: number; y: number };
  playerDir: 'N' | 'E' | 'S' | 'W';
  zone: GameZone;
  floor: number;
  turn: number;
  weather: string;
  hasKeycard: boolean;
  isGameOver: boolean;
  isGameWon: boolean;
  inCombat: boolean;
  combatTurn: 'player' | 'enemy';
  activeEnemy: EnemyEntity | null;
  isBossFight: boolean;
  world: SerializedWorld;
  logs: GameLogEntry[];
}

export interface SaveSlotMetadata {
  key: string;
  label: string;
  playerName: string;
  className: string;
  level: number;
  hp: number;
  maxHp: number;
  floor: number;
  zone: string;
  credits: number;
  timestamp: number;
  dateFormatted: string;
  isAutoSave: boolean;
  itemCount: number;
}

const STORAGE_PREFIX = 'netcrawler_save_';
const PRIMARY_SAVE_KEY = 'netcrawler_save_primary';
const AUTOSAVE_KEY = 'netcrawler_save_autosave';

export class SaveManager {
  private lastSavedTimestamp: number | null = null;
  private isAutoSaving: boolean = false;
  private autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;
  private listeners: Array<() => void> = [];

  constructor() {
    // Check initial last save
    const primary = this.getSlotData(PRIMARY_SAVE_KEY) || this.getSlotData(AUTOSAVE_KEY);
    if (primary) {
      this.lastSavedTimestamp = primary.timestamp;
    }
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  public getLastSavedTimestamp(): number | null {
    return this.lastSavedTimestamp;
  }

  public formatRelativeTime(timestamp: number): string {
    const elapsedMs = Date.now() - timestamp;
    const seconds = Math.floor(elapsedMs / 1000);
    if (seconds < 5) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  }

  public saveToStorage(state: SerializedGameState, slotKey: string = PRIMARY_SAVE_KEY, label = 'Manual Checkpoint'): boolean {
    try {
      const now = Date.now();
      const enriched: SerializedGameState = {
        ...state,
        timestamp: now,
        savedAtFormatted: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        slotLabel: label,
      };

      const serialized = JSON.stringify(enriched);
      localStorage.setItem(slotKey, serialized);
      
      // If primary or custom slot, also refresh autosave fallback
      if (slotKey === PRIMARY_SAVE_KEY) {
        localStorage.setItem(AUTOSAVE_KEY, serialized);
      }

      this.lastSavedTimestamp = now;
      this.notify();
      return true;
    } catch (err) {
      console.error('[SaveManager] Failed to persist game state to localStorage:', err);
      return false;
    }
  }

  public loadFromStorage(slotKey: string = PRIMARY_SAVE_KEY): SerializedGameState | null {
    try {
      let raw = localStorage.getItem(slotKey);
      if (!raw && slotKey === PRIMARY_SAVE_KEY) {
        // Try fallback to autosave
        raw = localStorage.getItem(AUTOSAVE_KEY);
      }
      if (!raw) return null;

      const parsed: SerializedGameState = JSON.parse(raw);
      if (!parsed || !parsed.player || typeof parsed.player.hp !== 'number') {
        console.warn('[SaveManager] Corrupt save data found.');
        return null;
      }
      return parsed;
    } catch (err) {
      console.error('[SaveManager] Failed to read save state from localStorage:', err);
      return null;
    }
  }

  public hasSave(slotKey: string = PRIMARY_SAVE_KEY): boolean {
    return !!(localStorage.getItem(slotKey) || (slotKey === PRIMARY_SAVE_KEY && localStorage.getItem(AUTOSAVE_KEY)));
  }

  public deleteSave(slotKey: string): boolean {
    try {
      localStorage.removeItem(slotKey);
      if (slotKey === PRIMARY_SAVE_KEY) {
        localStorage.removeItem(AUTOSAVE_KEY);
      }
      this.notify();
      return true;
    } catch (e) {
      return false;
    }
  }

  public scheduleAutoSave(getState: () => SerializedGameState, delayMs = 350) {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    this.autoSaveTimeout = setTimeout(() => {
      this.isAutoSaving = true;
      try {
        const state = getState();
        // Do not auto-save if player is flatlined/dead
        if (!state.isGameOver) {
          this.saveToStorage(state, AUTOSAVE_KEY, 'Auto-Save Sync');
          this.saveToStorage(state, PRIMARY_SAVE_KEY, 'Session Resume');
        }
      } finally {
        this.isAutoSaving = false;
        this.notify();
      }
    }, delayMs);
  }

  public getSlotData(slotKey: string): SerializedGameState | null {
    try {
      const raw = localStorage.getItem(slotKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  public listAllSlots(): SaveSlotMetadata[] {
    const slots: SaveSlotMetadata[] = [];
    const keysToCheck = [
      { key: PRIMARY_SAVE_KEY, label: 'Primary Save (Auto-Sync)' },
      { key: `${STORAGE_PREFIX}slot1`, label: 'Memory Slot Alpha' },
      { key: `${STORAGE_PREFIX}slot2`, label: 'Memory Slot Beta' },
      { key: `${STORAGE_PREFIX}slot3`, label: 'Memory Slot Gamma' },
      { key: `${STORAGE_PREFIX}quicksave`, label: 'QuickSave Buffer' },
    ];

    for (const { key, label } of keysToCheck) {
      const data = this.getSlotData(key);
      if (data && data.player) {
        const itemCount = Object.values(data.player.inventory || {}).reduce((a, b) => a + b, 0);
        slots.push({
          key,
          label: data.slotLabel || label,
          playerName: data.player.name || 'Unknown Runner',
          className: data.player.className || 'Netrunner',
          level: data.player.level || 1,
          hp: data.player.hp,
          maxHp: data.player.maxHp,
          floor: data.floor || 1,
          zone: data.zone || 'BUILDING',
          credits: data.player.credits || 0,
          timestamp: data.timestamp || Date.now(),
          dateFormatted: new Date(data.timestamp || Date.now()).toLocaleString(),
          isAutoSave: key === AUTOSAVE_KEY || key === PRIMARY_SAVE_KEY,
          itemCount,
        });
      }
    }

    return slots;
  }

  public exportSaveFile(slotKey: string = PRIMARY_SAVE_KEY): string | null {
    const data = this.loadFromStorage(slotKey);
    if (!data) return null;
    return JSON.stringify(data, null, 2);
  }

  public importSaveFile(jsonContent: string, targetSlot: string = PRIMARY_SAVE_KEY): { success: boolean; error?: string } {
    try {
      const parsed: SerializedGameState = JSON.parse(jsonContent);
      if (!parsed || !parsed.player || typeof parsed.player.hp !== 'number' || !parsed.world) {
        return { success: false, error: 'Invalid save payload structure.' };
      }
      this.saveToStorage(parsed, targetSlot, parsed.slotLabel || 'Imported Neural Link');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to parse JSON file.' };
    }
  }

  public clearAllGameData(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('netcrawler_save_')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      this.lastSavedTimestamp = null;
      this.notify();
    } catch (e) {
      console.error('Error clearing save data', e);
    }
  }
}

export const saveManager = new SaveManager();
