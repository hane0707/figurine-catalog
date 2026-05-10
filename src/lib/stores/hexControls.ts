import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface HexState {
  speed: number;    // 1–100。100 = 現在の低速、1 = 最速
  rainbow: boolean;
  inkMode: boolean;
}

const STORAGE_KEY = 'hex-controls';
const DEFAULTS: HexState = { speed: 100, rainbow: false, inkMode: false };

function loadState(): HexState {
  if (!browser) return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<HexState>;
    return {
      speed:
        typeof parsed.speed === 'number'
          ? Math.max(1, Math.min(100, Math.round(parsed.speed)))
          : DEFAULTS.speed,
      rainbow:
        typeof parsed.rainbow === 'boolean' ? parsed.rainbow : DEFAULTS.rainbow,
      inkMode:
        typeof parsed.inkMode === 'boolean' ? parsed.inkMode : DEFAULTS.inkMode,
    };
  } catch {
    return DEFAULTS;
  }
}

function saveState(state: HexState): void {
  if (!browser) return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ speed: state.speed, rainbow: state.rainbow, inkMode: state.inkMode }),
  );
}

function createHexStore() {
  const { subscribe, update } = writable<HexState>(loadState());
  return {
    subscribe,
    setSpeed(speed: number) {
      update(s => {
        const next = { ...s, speed: Math.max(1, Math.min(100, Math.round(speed))) };
        saveState(next);
        return next;
      });
    },
    setRainbow(rainbow: boolean) {
      update(s => {
        const next = { ...s, rainbow };
        saveState(next);
        return next;
      });
    },
    setInkMode(inkMode: boolean) {
      update(s => {
        const next = { ...s, inkMode };
        saveState(next);
        return next;
      });
    },
  };
}

export const hexControls = createHexStore();

/**
 * スライダー値（1–100）を animation-duration の秒数に変換する。
 * 2次曲線スケールにより低速側に余裕を持たせ、高速側を急激に短くする。
 */
export function speedToDuration(speed: number): { r1: number; r2: number } {
  const t = speed / 100;
  return {
    r1: 0.8 + t * t * (80 - 0.8),
    r2: 1.2 + t * t * (120 - 1.2),
  };
}
