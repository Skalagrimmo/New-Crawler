import { touchHaptics } from './TouchHaptics';
import { audioSynth } from './AudioSynth';

export type GameAction =
  | 'move_up'
  | 'move_down'
  | 'move_left'
  | 'move_right'
  | 'interact'
  | 'attack'
  | 'defend'
  | 'combat_hack'
  | 'scan'
  | 'quick_item_1'
  | 'quick_item_2'
  | 'toggle_view'
  | 'toggle_crt'
  | 'toggle_mute'
  | 'open_keymap'
  | 'open_character_select';

export type ActionCategory = 'movement' | 'interaction' | 'combat' | 'system';

export interface ActionMeta {
  id: GameAction;
  name: string;
  category: ActionCategory;
  description: string;
  defaultPrimary: string;
  defaultSecondary: string;
}

export const ACTION_DEFINITIONS: ActionMeta[] = [
  // Movement
  {
    id: 'move_up',
    name: 'Move North / Up',
    category: 'movement',
    description: 'Step 1 grid tile north, or shift raymarch perspective forward.',
    defaultPrimary: 'KeyW',
    defaultSecondary: 'ArrowUp',
  },
  {
    id: 'move_down',
    name: 'Move South / Down',
    category: 'movement',
    description: 'Step 1 grid tile south, or shift raymarch perspective backward.',
    defaultPrimary: 'KeyS',
    defaultSecondary: 'ArrowDown',
  },
  {
    id: 'move_left',
    name: 'Move West / Left',
    category: 'movement',
    description: 'Step 1 grid tile west, or turn view angle counter-clockwise.',
    defaultPrimary: 'KeyA',
    defaultSecondary: 'ArrowLeft',
  },
  {
    id: 'move_right',
    name: 'Move East / Right',
    category: 'movement',
    description: 'Step 1 grid tile east, or turn view angle clockwise.',
    defaultPrimary: 'KeyD',
    defaultSecondary: 'ArrowRight',
  },

  // Interactions & Exploration
  {
    id: 'interact',
    name: 'Interact / Breach Node',
    category: 'interaction',
    description: 'Access terminal nodes, pick up data cache, open doors or enter cyber gateways.',
    defaultPrimary: 'KeyE',
    defaultSecondary: 'Enter',
  },
  {
    id: 'scan',
    name: 'Scan Sector / Node Radar',
    category: 'interaction',
    description: 'Ping current grid coordinate, inspect tile signatures and detect hidden nodes.',
    defaultPrimary: 'KeyC',
    defaultSecondary: 'KeyV',
  },
  {
    id: 'quick_item_1',
    name: 'Quick Consumable #1',
    category: 'interaction',
    description: 'Instantly execute primary restorative item (NanoMed.sys).',
    defaultPrimary: 'Digit1',
    defaultSecondary: 'Numpad1',
  },
  {
    id: 'quick_item_2',
    name: 'Quick Consumable #2',
    category: 'interaction',
    description: 'Instantly execute auxiliary overclock item (RAMBoost.exe).',
    defaultPrimary: 'Digit2',
    defaultSecondary: 'Numpad2',
  },

  // Combat Commands
  {
    id: 'attack',
    name: 'Combat: Strike Attack',
    category: 'combat',
    description: 'Execute tactical kinetic/energy strike against active interceptor firewall.',
    defaultPrimary: 'Space',
    defaultSecondary: 'KeyF',
  },
  {
    id: 'defend',
    name: 'Combat: Shield Matrix',
    category: 'combat',
    description: 'Reinforce sub-dermal defense barrier to absorb incoming hostile burst.',
    defaultPrimary: 'KeyQ',
    defaultSecondary: 'ShiftLeft',
  },
  {
    id: 'combat_hack',
    name: 'Combat: Hex Breach Protocol',
    category: 'combat',
    description: 'Initiate buffer injection terminal to disable enemy offensive routines.',
    defaultPrimary: 'KeyH',
    defaultSecondary: 'KeyX',
  },

  // Engine & System
  {
    id: 'toggle_view',
    name: 'Toggle 2D / 3D Raymarch',
    category: 'system',
    description: 'Switch between the 2D Pascal Sprite Batcher and the Retro 3D Raymarcher.',
    defaultPrimary: 'KeyTab',
    defaultSecondary: 'KeyB',
  },
  {
    id: 'toggle_crt',
    name: 'Toggle CRT Shader Filter',
    category: 'system',
    description: 'Toggle phosphor scanlines and curvature CRT post-processing emulation.',
    defaultPrimary: 'KeyT',
    defaultSecondary: 'KeyG',
  },
  {
    id: 'toggle_mute',
    name: 'Toggle Audio Synthesizer',
    category: 'system',
    description: 'Mute or unmute the 8-bit procedural sound effect and ambient synthesizer.',
    defaultPrimary: 'KeyM',
    defaultSecondary: '',
  },
  {
    id: 'open_keymap',
    name: 'Open Controls Remapper',
    category: 'system',
    description: 'Display the accessible keybinding and hardware layout configuration menu.',
    defaultPrimary: 'F1',
    defaultSecondary: 'Slash',
  },
  {
    id: 'open_character_select',
    name: 'Reset / New Runner Protocol',
    category: 'system',
    description: 'Open runner initialization protocol to customize class and reboot node.',
    defaultPrimary: 'KeyR',
    defaultSecondary: '',
  },
];

export interface KeyBindingSlot {
  primary: string;
  secondary: string;
}

export type KeyBindingsMap = Record<GameAction, KeyBindingSlot>;

export interface AccessibilitySettings {
  inputThrottleMs: number; // 0 = no throttle, 80 = fast, 160 = normal, 250 = relaxed
  allowHoldToRepeat: boolean;
  hapticFeedback: boolean;
  soundFeedback: boolean;
  highContrastKeyLabels: boolean;
}

export interface PresetLayout {
  id: string;
  name: string;
  description: string;
  bindings: Partial<Record<GameAction, { primary: string; secondary: string }>>;
}

export const HARDWARE_PRESETS: PresetLayout[] = [
  {
    id: 'qwerty_standard',
    name: 'QWERTY Standard',
    description: 'Standard WASD movement with E-Interact, Space-Strike, Q-Defend and Arrows.',
    bindings: {
      move_up: { primary: 'KeyW', secondary: 'ArrowUp' },
      move_down: { primary: 'KeyS', secondary: 'ArrowDown' },
      move_left: { primary: 'KeyA', secondary: 'ArrowLeft' },
      move_right: { primary: 'KeyD', secondary: 'ArrowRight' },
      interact: { primary: 'KeyE', secondary: 'Enter' },
      attack: { primary: 'Space', secondary: 'KeyF' },
      defend: { primary: 'KeyQ', secondary: 'ShiftLeft' },
      combat_hack: { primary: 'KeyH', secondary: 'KeyX' },
      scan: { primary: 'KeyC', secondary: 'KeyV' },
      quick_item_1: { primary: 'Digit1', secondary: 'Numpad1' },
      quick_item_2: { primary: 'Digit2', secondary: 'Numpad2' },
      toggle_view: { primary: 'KeyTab', secondary: 'KeyB' },
      toggle_crt: { primary: 'KeyT', secondary: 'KeyG' },
      toggle_mute: { primary: 'KeyM', secondary: '' },
      open_keymap: { primary: 'F1', secondary: 'Slash' },
      open_character_select: { primary: 'KeyR', secondary: '' },
    },
  },
  {
    id: 'azerty_french',
    name: 'AZERTY (French Layout)',
    description: 'Tailored for French keyboards with ZQSD movement and accessible secondary keys.',
    bindings: {
      move_up: { primary: 'KeyZ', secondary: 'ArrowUp' },
      move_down: { primary: 'KeyS', secondary: 'ArrowDown' },
      move_left: { primary: 'KeyQ', secondary: 'ArrowLeft' },
      move_right: { primary: 'KeyD', secondary: 'ArrowRight' },
      interact: { primary: 'KeyE', secondary: 'Enter' },
      attack: { primary: 'Space', secondary: 'KeyF' },
      defend: { primary: 'KeyA', secondary: 'ShiftLeft' },
      combat_hack: { primary: 'KeyH', secondary: 'KeyX' },
      scan: { primary: 'KeyC', secondary: 'KeyV' },
      quick_item_1: { primary: 'Digit1', secondary: 'Numpad1' },
      quick_item_2: { primary: 'Digit2', secondary: 'Numpad2' },
      toggle_view: { primary: 'KeyTab', secondary: 'KeyB' },
      toggle_crt: { primary: 'KeyT', secondary: 'KeyG' },
      toggle_mute: { primary: 'KeyM', secondary: '' },
      open_keymap: { primary: 'F1', secondary: 'Slash' },
      open_character_select: { primary: 'KeyR', secondary: '' },
    },
  },
  {
    id: 'numpad_arrows',
    name: 'Numpad & Arrow Keys (One-Handed/Accessibility)',
    description: 'Optimized for full numeric keypad and discrete arrow cluster navigation.',
    bindings: {
      move_up: { primary: 'Numpad8', secondary: 'ArrowUp' },
      move_down: { primary: 'Numpad2', secondary: 'ArrowDown' },
      move_left: { primary: 'Numpad4', secondary: 'ArrowLeft' },
      move_right: { primary: 'Numpad6', secondary: 'ArrowRight' },
      interact: { primary: 'Numpad5', secondary: 'Enter' },
      attack: { primary: 'Numpad0', secondary: 'Space' },
      defend: { primary: 'Numpad7', secondary: 'NumpadAdd' },
      combat_hack: { primary: 'Numpad9', secondary: 'NumpadSubtract' },
      scan: { primary: 'NumpadDecimal', secondary: 'NumpadMultiply' },
      quick_item_1: { primary: 'Numpad1', secondary: 'Digit1' },
      quick_item_2: { primary: 'Numpad3', secondary: 'Digit2' },
      toggle_view: { primary: 'NumpadDivide', secondary: 'KeyTab' },
      toggle_crt: { primary: 'PageUp', secondary: 'KeyT' },
      toggle_mute: { primary: 'PageDown', secondary: 'KeyM' },
      open_keymap: { primary: 'F1', secondary: 'Slash' },
      open_character_select: { primary: 'Delete', secondary: 'KeyR' },
    },
  },
  {
    id: 'vim_hjkl',
    name: 'Vim HJKL (Power User)',
    description: 'Modal editing style: H-Left, J-Down, K-Up, L-Right for rapid touch typists.',
    bindings: {
      move_up: { primary: 'KeyK', secondary: 'ArrowUp' },
      move_down: { primary: 'KeyJ', secondary: 'ArrowDown' },
      move_left: { primary: 'KeyH', secondary: 'ArrowLeft' },
      move_right: { primary: 'KeyL', secondary: 'ArrowRight' },
      interact: { primary: 'KeyE', secondary: 'Enter' },
      attack: { primary: 'Space', secondary: 'KeyF' },
      defend: { primary: 'KeyU', secondary: 'ShiftLeft' },
      combat_hack: { primary: 'KeyX', secondary: 'KeyB' },
      scan: { primary: 'KeyS', secondary: 'KeyC' },
      quick_item_1: { primary: 'Digit1', secondary: 'Numpad1' },
      quick_item_2: { primary: 'Digit2', secondary: 'Numpad2' },
      toggle_view: { primary: 'KeyTab', secondary: 'KeyV' },
      toggle_crt: { primary: 'KeyT', secondary: 'KeyG' },
      toggle_mute: { primary: 'KeyM', secondary: '' },
      open_keymap: { primary: 'F1', secondary: 'Slash' },
      open_character_select: { primary: 'KeyR', secondary: '' },
    },
  },
  {
    id: 'esdf_ergonomic',
    name: 'ESDF (Ergonomic Offset)',
    description: 'Natural touch typing home-row position offering more adjacent macro keys.',
    bindings: {
      move_up: { primary: 'KeyE', secondary: 'ArrowUp' },
      move_down: { primary: 'KeyD', secondary: 'ArrowDown' },
      move_left: { primary: 'KeyS', secondary: 'ArrowLeft' },
      move_right: { primary: 'KeyF', secondary: 'ArrowRight' },
      interact: { primary: 'KeyR', secondary: 'Enter' },
      attack: { primary: 'Space', secondary: 'KeyG' },
      defend: { primary: 'KeyW', secondary: 'KeyA' },
      combat_hack: { primary: 'KeyT', secondary: 'KeyV' },
      scan: { primary: 'KeyC', secondary: 'KeyX' },
      quick_item_1: { primary: 'Digit1', secondary: 'Numpad1' },
      quick_item_2: { primary: 'Digit2', secondary: 'Numpad2' },
      toggle_view: { primary: 'KeyTab', secondary: 'KeyB' },
      toggle_crt: { primary: 'KeyY', secondary: 'KeyH' },
      toggle_mute: { primary: 'KeyM', secondary: '' },
      open_keymap: { primary: 'F1', secondary: 'Slash' },
      open_character_select: { primary: 'KeyU', secondary: '' },
    },
  },
  {
    id: 'left_hand_only',
    name: 'Left-Hand Compact (Single-Handed)',
    description: 'All movement, combat, hacking and item keys cluster on left half of keyboard.',
    bindings: {
      move_up: { primary: 'KeyW', secondary: '' },
      move_down: { primary: 'KeyS', secondary: '' },
      move_left: { primary: 'KeyA', secondary: '' },
      move_right: { primary: 'KeyD', secondary: '' },
      interact: { primary: 'KeyE', secondary: 'KeyR' },
      attack: { primary: 'Space', secondary: 'KeyF' },
      defend: { primary: 'KeyQ', secondary: 'KeyZ' },
      combat_hack: { primary: 'KeyX', secondary: 'KeyC' },
      scan: { primary: 'KeyV', secondary: 'KeyG' },
      quick_item_1: { primary: 'Digit1', secondary: 'KeyT' },
      quick_item_2: { primary: 'Digit2', secondary: 'KeyB' },
      toggle_view: { primary: 'KeyTab', secondary: 'Backquote' },
      toggle_crt: { primary: 'Digit5', secondary: '' },
      toggle_mute: { primary: 'Digit6', secondary: '' },
      open_keymap: { primary: 'F1', secondary: 'Digit4' },
      open_character_select: { primary: 'Digit3', secondary: '' },
    },
  },
  {
    id: 'right_hand_only',
    name: 'Right-Hand Compact (Single-Handed)',
    description: 'All movement, combat, and interaction keys cluster on IJKL and right modifier keys.',
    bindings: {
      move_up: { primary: 'KeyI', secondary: 'ArrowUp' },
      move_down: { primary: 'KeyK', secondary: 'ArrowDown' },
      move_left: { primary: 'KeyJ', secondary: 'ArrowLeft' },
      move_right: { primary: 'KeyL', secondary: 'ArrowRight' },
      interact: { primary: 'KeyO', secondary: 'Enter' },
      attack: { primary: 'KeyU', secondary: 'Numpad0' },
      defend: { primary: 'KeyP', secondary: 'ShiftRight' },
      combat_hack: { primary: 'Semicolon', secondary: 'Quote' },
      scan: { primary: 'Slash', secondary: 'Period' },
      quick_item_1: { primary: 'Digit9', secondary: 'Numpad7' },
      quick_item_2: { primary: 'Digit0', secondary: 'Numpad9' },
      toggle_view: { primary: 'BracketLeft', secondary: 'BracketRight' },
      toggle_crt: { primary: 'Backslash', secondary: '' },
      toggle_mute: { primary: 'KeyM', secondary: '' },
      open_keymap: { primary: 'F1', secondary: 'Minus' },
      open_character_select: { primary: 'Equal', secondary: '' },
    },
  },
];

const STORAGE_KEY = 'netcrawler_input_bindings_v1';
const SETTINGS_STORAGE_KEY = 'netcrawler_input_accessibility_v1';

export class InputManager {
  private bindings: KeyBindingsMap;
  private settings: AccessibilitySettings;
  private subscribers: Set<() => void> = new Set();
  private lastActionTimestamp: Record<GameAction, number> = {} as any;

  constructor() {
    this.bindings = this.loadDefaultBindings();
    this.settings = {
      inputThrottleMs: 60,
      allowHoldToRepeat: true,
      hapticFeedback: true,
      soundFeedback: true,
      highContrastKeyLabels: true,
    };

    this.loadFromStorage();
  }

  private loadDefaultBindings(): KeyBindingsMap {
    const map: Partial<KeyBindingsMap> = {};
    for (const def of ACTION_DEFINITIONS) {
      map[def.id] = {
        primary: def.defaultPrimary,
        secondary: def.defaultSecondary,
      };
    }
    return map as KeyBindingsMap;
  }

  private loadFromStorage() {
    try {
      const savedBindings = localStorage.getItem(STORAGE_KEY);
      if (savedBindings) {
        const parsed = JSON.parse(savedBindings);
        this.bindings = { ...this.bindings, ...parsed };
      }
      const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        this.settings = { ...this.settings, ...parsed };
      }
    } catch {
      // Ignore storage read errors
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.bindings));
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Ignore storage write errors
    }
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notify() {
    this.saveToStorage();
    this.subscribers.forEach((cb) => cb());
  }

  public getBindings(): KeyBindingsMap {
    return { ...this.bindings };
  }

  public getSettings(): AccessibilitySettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<AccessibilitySettings>) {
    this.settings = { ...this.settings, ...partial };
    this.notify();
  }

  /**
   * Normalizes keyboard events to a unified Code identifier.
   */
  public normalizeEventCode(e: KeyboardEvent): string {
    if (e.code) {
      return e.code;
    }
    // Fallback for older browsers or special keys
    const key = e.key;
    if (key === ' ') return 'Space';
    if (key === 'Enter') return 'Enter';
    if (key === 'Escape') return 'Escape';
    if (key === 'Tab') return 'KeyTab';
    if (key.length === 1 && key >= 'a' && key <= 'z') {
      return `Key${key.toUpperCase()}`;
    }
    if (key.length === 1 && key >= 'A' && key <= 'Z') {
      return `Key${key}`;
    }
    if (key.length === 1 && key >= '0' && key <= '9') {
      return `Digit${key}`;
    }
    return key;
  }

  /**
   * Returns human-readable label for a key code.
   */
  public getKeyDisplayName(code: string): string {
    if (!code) return 'Unbound';

    // Direct conversions
    if (code.startsWith('Key')) {
      return code.replace('Key', '');
    }
    if (code.startsWith('Digit')) {
      return code.replace('Digit', '');
    }
    if (code.startsWith('Numpad')) {
      const rest = code.replace('Numpad', 'Num ');
      if (rest === 'Num Add') return 'Num +';
      if (rest === 'Num Subtract') return 'Num -';
      if (rest === 'Num Multiply') return 'Num *';
      if (rest === 'Num Divide') return 'Num /';
      if (rest === 'Num Decimal') return 'Num .';
      return rest;
    }
    if (code.startsWith('Arrow')) {
      const dir = code.replace('Arrow', '');
      if (dir === 'Up') return '↑ Up';
      if (dir === 'Down') return '↓ Down';
      if (dir === 'Left') return '← Left';
      if (dir === 'Right') return '→ Right';
      return dir;
    }

    switch (code) {
      case 'Space':
        return 'Spacebar';
      case 'Enter':
        return 'Enter ↵';
      case 'Escape':
        return 'Esc';
      case 'Tab':
      case 'KeyTab':
        return 'Tab ⇥';
      case 'ShiftLeft':
        return 'L-Shift';
      case 'ShiftRight':
        return 'R-Shift';
      case 'ControlLeft':
        return 'L-Ctrl';
      case 'ControlRight':
        return 'R-Ctrl';
      case 'AltLeft':
        return 'L-Alt';
      case 'AltRight':
        return 'R-Alt';
      case 'Backspace':
        return 'Backspace';
      case 'Delete':
        return 'Delete';
      case 'Slash':
        return '/ (Slash)';
      case 'Backslash':
        return '\\ (Backslash)';
      case 'Minus':
        return '- (Minus)';
      case 'Equal':
        return '= (Equal)';
      case 'BracketLeft':
        return '[';
      case 'BracketRight':
        return ']';
      case 'Semicolon':
        return '; (Semi)';
      case 'Quote':
        return "' (Quote)";
      case 'Comma':
        return ', (Comma)';
      case 'Period':
        return '. (Dot)';
      case 'Backquote':
        return '` (Tilde)';
      case 'PageUp':
        return 'PgUp';
      case 'PageDown':
        return 'PgDn';
      default:
        return code;
    }
  }

  /**
   * Find if an action matches the given keyboard event.
   */
  public getActionForEvent(e: KeyboardEvent): GameAction | null {
    const code = this.normalizeEventCode(e);
    const lowerKey = e.key.toLowerCase();

    for (const [actionKey, slot] of Object.entries(this.bindings)) {
      const action = actionKey as GameAction;

      const matchesPrimary =
        slot.primary &&
        (slot.primary === code ||
          slot.primary.toLowerCase() === lowerKey ||
          (slot.primary.startsWith('Key') && slot.primary.slice(3).toLowerCase() === lowerKey) ||
          (slot.primary.startsWith('Digit') && slot.primary.slice(5) === lowerKey));

      const matchesSecondary =
        slot.secondary &&
        (slot.secondary === code ||
          slot.secondary.toLowerCase() === lowerKey ||
          (slot.secondary.startsWith('Key') && slot.secondary.slice(3).toLowerCase() === lowerKey) ||
          (slot.secondary.startsWith('Digit') && slot.secondary.slice(5) === lowerKey));

      if (matchesPrimary || matchesSecondary) {
        // Throttle check for accessibility repeat delay
        if (this.settings.inputThrottleMs > 0 && e.repeat) {
          const now = performance.now();
          const last = this.lastActionTimestamp[action] || 0;
          if (now - last < this.settings.inputThrottleMs) {
            return null; // Suppress repeated spam within throttle interval
          }
          this.lastActionTimestamp[action] = now;
        } else {
          this.lastActionTimestamp[action] = performance.now();
        }

        if (this.settings.hapticFeedback) {
          touchHaptics.trigger('light_tap');
        }

        return action;
      }
    }

    return null;
  }

  /**
   * Assign a new key to a slot.
   */
  public setBinding(action: GameAction, slot: 'primary' | 'secondary', rawCode: string) {
    if (!this.bindings[action]) {
      this.bindings[action] = { primary: '', secondary: '' };
    }
    this.bindings[action][slot] = rawCode;
    this.notify();
  }

  /**
   * Clear a binding slot.
   */
  public clearBinding(action: GameAction, slot: 'primary' | 'secondary') {
    if (this.bindings[action]) {
      this.bindings[action][slot] = '';
      this.notify();
    }
  }

  /**
   * Check for conflicts: returns list of actions that also use this key code.
   */
  public findConflicts(rawCode: string, excludeAction?: GameAction): GameAction[] {
    if (!rawCode) return [];
    const conflicts: GameAction[] = [];
    for (const [actionKey, slot] of Object.entries(this.bindings)) {
      const action = actionKey as GameAction;
      if (excludeAction && action === excludeAction) continue;
      if (slot.primary === rawCode || slot.secondary === rawCode) {
        conflicts.push(action);
      }
    }
    return conflicts;
  }

  /**
   * Apply one of the hardware presets.
   */
  public applyPreset(presetId: string): boolean {
    const preset = HARDWARE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return false;

    const newMap: KeyBindingsMap = this.loadDefaultBindings();
    for (const [action, slot] of Object.entries(preset.bindings)) {
      if (slot) {
        newMap[action as GameAction] = {
          primary: slot.primary,
          secondary: slot.secondary,
        };
      }
    }

    this.bindings = newMap;
    this.notify();
    return true;
  }

  /**
   * Reset everything back to defaults.
   */
  public resetToDefaults() {
    this.bindings = this.loadDefaultBindings();
    this.settings = {
      inputThrottleMs: 60,
      allowHoldToRepeat: true,
      hapticFeedback: true,
      soundFeedback: true,
      highContrastKeyLabels: true,
    };
    this.notify();
  }

  /**
   * Export key bindings as JSON string for backup/sharing.
   */
  public exportJSON(): string {
    return JSON.stringify(
      {
        version: 1,
        engine: 'NetCrawler-FreePascal',
        bindings: this.bindings,
        settings: this.settings,
      },
      null,
      2
    );
  }

  /**
   * Import key bindings from JSON.
   */
  public importJSON(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && parsed.bindings) {
        this.bindings = { ...this.bindings, ...parsed.bindings };
        if (parsed.settings) {
          this.settings = { ...this.settings, ...parsed.settings };
        }
        this.notify();
        return true;
      }
    } catch {
      // Ignore parse failure
    }
    return false;
  }
}

export const inputManager = new InputManager();
