# Hex Control Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 背景の六角形リングのスピードと虹色エフェクトをヘッダーの小型パネルからリアルタイム操作できるようにする。

**Architecture:** Svelte writable store（`hexControls`）がスピードと虹色フラグを保持し、`localStorage` に永続化する。ヘッダーの `⬡` ボタンでフローティングパネルを開閉し、パネルからの操作が store を経由して各ページの ambient SVG に反映される。CSS `animation-duration` を inline style で上書きすることでスピードを適用し、`.--rainbow` クラスで hue-cycle アニメーションを発火させる。

**Tech Stack:** Svelte 5 runes, `svelte/store` (writable), `$app/environment`, Vitest, `@testing-library/svelte`

---

## File Map

| 操作 | ファイル | 役割 |
|------|---------|------|
| Create | `src/lib/stores/hexControls.ts` | store本体 + `speedToDuration` 変換関数 |
| Create | `src/lib/stores/hexControls.test.ts` | ユニットテスト |
| Modify | `src/app.css` | パネル CSS・rainbow スタイル・`hue-cycle` @keyframes |
| Modify | `src/routes/+layout.svelte` | ヘッダーボタン＋フローティングパネル |
| Modify | `src/routes/items/+page.svelte` | ambient ブロックへの store バインド |
| Modify | `src/routes/items/[id]/+page.svelte` | ambient ブロックへの store バインド |

---

## Task 1: hexControls store

**Files:**
- Create: `src/lib/stores/hexControls.ts`
- Create: `src/lib/stores/hexControls.test.ts`

- [ ] **Step 1: テストファイルを作成する（失敗するテストを書く）**

`src/lib/stores/hexControls.test.ts` を新規作成：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
});
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
npm test -- hexControls
```

期待結果: `Cannot find module './hexControls'` のエラーで FAIL

- [ ] **Step 3: ストアファイルを実装する**

`src/lib/stores/hexControls.ts` を新規作成：

```typescript
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface HexState {
  speed: number;    // 1–100。100 = 現在の低速、1 = 最速
  rainbow: boolean;
}

const STORAGE_KEY = 'hex-controls';
const DEFAULTS: HexState = { speed: 100, rainbow: false };

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
    };
  } catch {
    return DEFAULTS;
  }
}

function saveState(state: HexState): void {
  if (!browser) return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ speed: state.speed, rainbow: state.rainbow }),
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
```

- [ ] **Step 4: テストがパスすることを確認する**

```bash
npm test -- hexControls
```

期待結果: 全テスト PASS

- [ ] **Step 5: コミット**

```bash
git add src/lib/stores/hexControls.ts src/lib/stores/hexControls.test.ts
git commit -m "feat: hexControls ストアと speedToDuration 関数を追加"
```

---

## Task 2: CSS 追加

**Files:**
- Modify: `src/app.css`

- [ ] **Step 1: パネル CSS と rainbow スタイルを追記する**

`src/app.css` の末尾（`@layer base { ... }` ブロックの直前）に以下を追加：

```css
/* --- hex control panel --- */
.hex-panel-wrap { position: relative; }
.hex-toggle.--active { background: var(--bg-sunk); box-shadow: var(--neu-inset); }
.hex-panel {
  position: absolute; top: calc(100% + 8px); right: 0;
  width: 220px; padding: 16px;
  background: var(--surface); border-radius: var(--r);
  box-shadow: var(--neu-soft);
  display: flex; flex-direction: column; gap: 14px;
  z-index: 200; outline: none;
}
.hex-panel-row { display: flex; flex-direction: column; gap: 6px; }
.hex-panel-row.--switch {
  flex-direction: row; align-items: center; justify-content: space-between;
}
.hex-panel input[type="range"] {
  width: 100%; accent-color: var(--accent-amber); cursor: pointer;
}
.hex-panel-labels {
  display: flex; justify-content: space-between;
  font-family: var(--f-mono); font-size: 9px; letter-spacing: 0.08em;
  color: var(--fg-soft);
}

/* --- rainbow effect --- */
.ambient.--rainbow .amb-ring polygon {
  stroke: oklch(0.7 0.25 0);
  animation: hue-cycle 3s linear infinite;
}

@keyframes hue-cycle {
  from { filter: hue-rotate(0deg); }
  to   { filter: hue-rotate(360deg); }
}
```

追加先は `src/app.css` の `@layer base {` ブロック直前（現在の行 784 付近）。

- [ ] **Step 2: コミット**

```bash
git add src/app.css
git commit -m "feat: hex パネル CSS と虹色エフェクトスタイルを追加"
```

---

## Task 3: +layout.svelte — ヘッダーボタン＋パネル

**Files:**
- Modify: `src/routes/+layout.svelte`

- [ ] **Step 1: script ブロックに store と状態を追加する**

`src/routes/+layout.svelte` の `<script lang="ts">` ブロックを以下に置き換える：

```svelte
<script lang="ts">
  import '../app.css';
  import { Toaster } from '$lib/components/ui/sonner';
  import { page } from '$app/state';
  import type { LayoutData } from './$types';
  import { hexControls } from '$lib/stores/hexControls';

  let { children, data }: { children: any; data: LayoutData } = $props();
  const isSecondary = $derived(page.url.pathname !== '/items');

  let panelOpen = $state(false);
  let panelEl: HTMLDivElement | undefined;

  function handleFocusOut(e: FocusEvent) {
    if (!e.relatedTarget || !panelEl?.contains(e.relatedTarget as Node)) {
      panelOpen = false;
    }
  }
</script>
```

- [ ] **Step 2: nav-actions に hex ボタンとパネルを追加する**

`src/routes/+layout.svelte` の `<div class="nav-actions">` ブロック全体を以下に置き換える：

```svelte
    <div class="nav-actions">
      {#if isSecondary}
        <a href="/items" class="btn --ghost" style="gap:6px; padding:8px 14px">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          <span style="font-family:var(--f-mono); font-size:11px; letter-spacing:0.1em">COLLECTION</span>
        </a>
      {:else if data.user}
        {#if data.isDevMode}
          <form method="POST" action="/admin?/logout" style="display:contents">
            <button type="submit" class="btn --ghost" style="font-size:12px; letter-spacing:0.04em">
              ログアウト
            </button>
          </form>
        {:else}
          <a href="/cdn-cgi/access/logout" class="btn --ghost" style="font-size:12px; letter-spacing:0.04em">
            ログアウト
          </a>
        {/if}
      {/if}

      <!-- hex control panel trigger -->
      <div
        class="hex-panel-wrap"
        bind:this={panelEl}
        onfocusout={handleFocusOut}
      >
        <button
          class="btn --ghost --icon hex-toggle"
          class:--active={panelOpen}
          onclick={() => (panelOpen = !panelOpen)}
          aria-label="背景エフェクトの設定"
          aria-expanded={panelOpen}
        >⬡</button>

        {#if panelOpen}
          <div class="hex-panel" tabindex="-1">
            <div class="hex-panel-row">
              <span class="eyebrow">SPEED</span>
              <input
                type="range"
                min="1"
                max="100"
                value={$hexControls.speed}
                oninput={(e) =>
                  hexControls.setSpeed(
                    Number((e.target as HTMLInputElement).value),
                  )}
              />
              <div class="hex-panel-labels">
                <span>Fast</span><span>Slow</span>
              </div>
            </div>
            <div class="hex-panel-row --switch">
              <span class="eyebrow">RAINBOW</span>
              <button
                class="toggle-chip"
                class:--on={$hexControls.rainbow}
                onclick={() => hexControls.setRainbow(!$hexControls.rainbow)}
                aria-pressed={$hexControls.rainbow}
              >
                <span class="toggle-dot"></span>
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
```

- [ ] **Step 3: 動作を手動確認する**

```bash
npm run dev
```

確認項目：
1. ヘッダー右端に `⬡` ボタンが表示される
2. ボタンをクリックするとパネルが開く
3. パネル外をクリックするとパネルが閉じる
4. RAINBOW ボタンが ON/OFF を切り替える（まだ六角形への反映はされていなくて OK）

- [ ] **Step 4: コミット**

```bash
git add src/routes/+layout.svelte
git commit -m "feat: ヘッダーに hex コントロールパネルのトリガーを追加"
```

---

## Task 4: /items ページ — ambient バインド

**Files:**
- Modify: `src/routes/items/+page.svelte`

- [ ] **Step 1: store インポートと derived を追加する**

`src/routes/items/+page.svelte` の `<script lang="ts">` ブロック内、既存のインポート末尾に追加（`let { data }` の前）：

```svelte
  import { hexControls, speedToDuration } from '$lib/stores/hexControls';

  const r1Duration = $derived(speedToDuration($hexControls.speed).r1);
  const r2Duration = $derived(speedToDuration($hexControls.speed).r2);
```

- [ ] **Step 2: ambient ブロックを書き換える**

`src/routes/items/+page.svelte` の ambient ブロック（現在の行 146–168）を以下に置き換える：

```svelte
<!-- 背景装飾 -->
<div class="ambient {$hexControls.rainbow ? '--rainbow' : ''}" aria-hidden="true">
  <div class="blob b1"></div>
  <div class="blob b2"></div>
  <div class="blob b3"></div>
  <svg class="amb-ring r1" style="animation-duration: {r1Duration}s" viewBox="-350 -350 700 700" aria-hidden="true">
    <polygon
      points="0,-350 303,-175 303,175 0,350 -303,175 -303,-175"
      fill="none"
      stroke="var(--line)"
      stroke-width="1"
      transform="rotate(12)"
    />
  </svg>
  <svg class="amb-ring r2" style="animation-duration: {r2Duration}s" viewBox="-210 -210 420 420" aria-hidden="true">
    <polygon
      points="0,-210 182,-105 182,105 0,210 -182,105 -182,-105"
      fill="none"
      stroke="var(--line)"
      stroke-width="1"
      transform="rotate(12)"
    />
  </svg>
</div>
```

- [ ] **Step 3: 動作を手動確認する**

```bash
npm run dev
```

確認項目：
1. `/items` を開きスライダーを左に動かすと六角形が速く回転する
2. スライダーを右端（Slow）にすると現在と同じ速度になる
3. RAINBOW を ON にすると六角形が虹色にアニメーションする
4. ページをリロードしてもスピードと虹色の設定が維持される

- [ ] **Step 4: コミット**

```bash
git add src/routes/items/+page.svelte
git commit -m "feat: /items の ambient ブロックを hexControls ストアにバインド"
```

---

## Task 5: /items/[id] ページ — ambient バインド

**Files:**
- Modify: `src/routes/items/[id]/+page.svelte`

- [ ] **Step 1: store インポートと derived を追加する**

`src/routes/items/[id]/+page.svelte` の `<script lang="ts">` ブロック内、既存のインポート末尾に追加：

```svelte
  import { hexControls, speedToDuration } from '$lib/stores/hexControls';

  const r1Duration = $derived(speedToDuration($hexControls.speed).r1);
  const r2Duration = $derived(speedToDuration($hexControls.speed).r2);
```

- [ ] **Step 2: ambient ブロックを書き換える**

`src/routes/items/[id]/+page.svelte` の ambient ブロック（現在の行 244–256）を以下に置き換える：

```svelte
<div class="ambient {$hexControls.rainbow ? '--rainbow' : ''}" aria-hidden="true">
  <div class="blob b1"></div>
  <div class="blob b2"></div>
  <div class="blob b3"></div>
  <svg class="amb-ring r1" style="animation-duration: {r1Duration}s" viewBox="-350 -350 700 700" aria-hidden="true">
    <polygon points="0,-350 303,-175 303,175 0,350 -303,175 -303,-175"
      fill="none" stroke="var(--line)" stroke-width="1" transform="rotate(12)"/>
  </svg>
  <svg class="amb-ring r2" style="animation-duration: {r2Duration}s" viewBox="-210 -210 420 420" aria-hidden="true">
    <polygon points="0,-210 182,-105 182,105 0,210 -182,105 -182,-105"
      fill="none" stroke="var(--line)" stroke-width="1" transform="rotate(12)"/>
  </svg>
</div>
```

- [ ] **Step 3: 動作を手動確認する**

```bash
npm run dev
```

確認項目：
1. 詳細ページでも六角形のスピードと虹色が store の設定通りに動く
2. `/items` でスピードを変更 → 詳細ページに移動しても設定が維持される

- [ ] **Step 4: 全テストが引き続き通ることを確認する**

```bash
npm test
```

期待結果: 全テスト PASS（既存テストも含めて）

- [ ] **Step 5: コミット**

```bash
git add src/routes/items/\[id\]/+page.svelte
git commit -m "feat: /items/[id] の ambient ブロックを hexControls ストアにバインド"
```
