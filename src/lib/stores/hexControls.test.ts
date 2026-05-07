import { describe, it, expect, vi } from 'vitest';
import { get } from 'svelte/store';

// $app/environment を mock する（store が browser 判定に使うため）
vi.mock('$app/environment', () => ({ browser: true }));

import { hexControls, speedToDuration } from './hexControls';

describe('speedToDuration', () => {
  it('speed=100 のとき現在の CSS アニメーション秒数を返す', () => {
    const { r1, r2 } = speedToDuration(100);
    expect(r1).toBeCloseTo(80, 1);
    expect(r2).toBeCloseTo(120, 1);
  });

  it('speed=1 のときほぼ最速の秒数を返す', () => {
    const { r1, r2 } = speedToDuration(1);
    expect(r1).toBeGreaterThan(0.8);
    expect(r1).toBeLessThan(1.5);
    expect(r2).toBeGreaterThan(1.2);
    expect(r2).toBeLessThan(2.0);
  });

  it('speed=50 のとき中間の秒数を返す', () => {
    const { r1 } = speedToDuration(50);
    expect(r1).toBeGreaterThan(1);
    expect(r1).toBeLessThan(79);
  });
});

describe('hexControls store', () => {
  it('setSpeed が値を 1–100 にクランプする', () => {
    hexControls.setSpeed(0);
    expect(get(hexControls).speed).toBe(1);

    hexControls.setSpeed(150);
    expect(get(hexControls).speed).toBe(100);
  });

  it('setSpeed が有効な値を正しく設定する', () => {
    hexControls.setSpeed(42);
    expect(get(hexControls).speed).toBe(42);
  });

  it('setRainbow が rainbow フラグを更新する', () => {
    hexControls.setRainbow(true);
    expect(get(hexControls).rainbow).toBe(true);

    hexControls.setRainbow(false);
    expect(get(hexControls).rainbow).toBe(false);
  });

  it('setInkMode が inkMode フラグを更新する', () => {
    hexControls.setInkMode(true);
    expect(get(hexControls).inkMode).toBe(true);

    hexControls.setInkMode(false);
    expect(get(hexControls).inkMode).toBe(false);
  });
});
