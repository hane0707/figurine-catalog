# Ink Drop Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 墨や絵具を水中に落としたような Gooey ブロブエフェクトを背景に追加し、ページ初回ロード時のイントロと INK MODE 持続トグルを実装する。

**Architecture:** `hexControls` ストアに `inkMode` フラグを追加し、`+layout.svelte` でイントロ（`onMount`）と持続モード（`$effect` + `setInterval`）のブロブ配列を管理する。SVG `feGaussianBlur` + `feColorMatrix`（gooey フィルター）でブロブが溶け合うインク風の見た目を生成する。

**Tech Stack:** SvelteKit, Svelte 5 runes (`$state`, `$effect`, `$derived`), CSS `@keyframes`, SVG フィルター

---

## ファイル構成

| ファイル | 変更 |
|---|---|
| `src/lib/stores/hexControls.ts` | `inkMode` フィールド追加、`setInkMode` メソッド追加、localStorage 永続化 |
| `src/lib/stores/hexControls.test.ts` | `setInkMode` のテスト追加 |
| `src/app.css` | `.ink-intro`・`.ink-layer`・`.ink-blob`・`ink-spread`・`ink-intro-fade`・`.ambient.--ink` ルール追加 |
| `src/routes/+layout.svelte` | gooey SVG フィルター・墨レイヤー HTML・イントロ/持続ロジック・パネル INK MODE トグル・ambient `--ink` クラス追加 |

---

### Task 1: hexControls ストアに `inkMode` を追加

**Files:**
- Modify: `src/lib/stores/hexControls.ts`
- Test: `src/lib/stores/hexControls.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/stores/hexControls.test.ts` の末尾（`});` の前）に追加：

```typescript
  it('setInkMode が inkMode フラグを更新する', () => {
    hexControls.setInkMode(true);
    expect(get(hexControls).inkMode).toBe(true);

    hexControls.setInkMode(false);
    expect(get(hexControls).inkMode).toBe(false);
  });
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
npm test -- --reporter=verbose 2>&1 | grep -A3 "inkMode"
```

Expected: `setInkMode is not a function` などのエラー

- [ ] **Step 3: ストアを更新する**

`src/lib/stores/hexControls.ts` をまるごと以下に置き換える：

```typescript
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
```

- [ ] **Step 4: テストが通ることを確認する**

```bash
npm test 2>&1 | tail -6
```

Expected: `Tests  91 passed (91)`

- [ ] **Step 5: コミットする**

```bash
git add src/lib/stores/hexControls.ts src/lib/stores/hexControls.test.ts
git commit -m "feat: hexControls ストアに inkMode を追加"
```

---

### Task 2: CSS に墨スタイルを追加

**Files:**
- Modify: `src/app.css`

- [ ] **Step 1: rainbow セクションの直後に墨 CSS を追加する**

`src/app.css` の `@keyframes hue-cycle` ブロックの直後（`}` の後）に以下を追加する（`@layer base` の前）：

```css
/* --- ink drop background --- */
.ink-intro,
.ink-layer {
  position: fixed;
  inset: 0;
  filter: url(#ink-gooey);
  pointer-events: none;
  z-index: 0;
}

.ink-layer { display: none; }
.ink-layer.--active { display: block; }

.ink-intro.--fading {
  animation: ink-intro-fade 1.2s ease-out forwards;
}
@keyframes ink-intro-fade {
  to { opacity: 0; }
}

.ink-blob {
  position: absolute;
  border-radius: 50%;
  will-change: transform, opacity;
  animation: ink-spread var(--ink-dur, 9s) ease-out forwards;
}

@keyframes ink-spread {
  0%   { transform: scale(0.05); opacity: 0.85; }
  50%  { opacity: 0.75; }
  100% { transform: scale(1);    opacity: 0; }
}

.ambient.--ink .amb-ring {
  opacity: 0;
  pointer-events: none;
}
```

- [ ] **Step 2: ビルドエラーがないことを確認する**

```bash
npm run build 2>&1 | tail -8
```

Expected: `✓ built in` で終了（エラーなし）

- [ ] **Step 3: コミットする**

```bash
git add src/app.css
git commit -m "feat: 墨ドロップエフェクトの CSS を追加"
```

---

### Task 3: Layout に墨レイヤー・イントロ・パネルトグルを追加

**Files:**
- Modify: `src/routes/+layout.svelte`

- [ ] **Step 1: script ブロックを更新する**

`src/routes/+layout.svelte` の `<script>` ブロック全体を以下に置き換える：

```svelte
<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { Toaster } from '$lib/components/ui/sonner';
	import { page } from '$app/state';
	import type { LayoutData } from './$types';
	import { hexControls, speedToDuration } from '$lib/stores/hexControls';

	let { children, data }: { children: any; data: LayoutData } = $props();
	const isSecondary = $derived(page.url.pathname !== '/items');
	const r1Duration = $derived(speedToDuration($hexControls.speed).r1);
	const r2Duration = $derived(speedToDuration($hexControls.speed).r2);

	let panelOpen = $state(false);
	let panelEl: HTMLDivElement | undefined;

	function handleFocusOut(e: FocusEvent) {
		if (!e.relatedTarget || !panelEl?.contains(e.relatedTarget as Node)) {
			panelOpen = false;
		}
	}

	// --- ink drop ---
	interface InkBlob {
		id: number;
		x: number;
		y: number;
		size: number;
		color: string;
		dur: number;
	}

	let introBlobs = $state<InkBlob[]>([]);
	let introFading = $state(false);
	let persistBlobs = $state<InkBlob[]>([]);
	let blobCounter = 0;

	function blobColor(index: number, rainbow: boolean): string {
		if (!rainbow) return 'oklch(0.25 0.01 285 / 0.55)';
		const hues = [55, 230, 140, 285];
		return `oklch(0.6 0.18 ${hues[index % hues.length]} / 0.55)`;
	}

	function makeBlob(index: number, rainbow: boolean): InkBlob {
		return {
			id: ++blobCounter,
			x: 10 + Math.random() * 80,
			y: 10 + Math.random() * 80,
			size: 200 + Math.random() * 300,
			color: blobColor(index, rainbow),
			dur: 8 + Math.random() * 2,
		};
	}

	onMount(() => {
		if (sessionStorage.getItem('ink-intro-shown')) return;
		sessionStorage.setItem('ink-intro-shown', '1');

		const count = 3 + Math.floor(Math.random() * 2);
		for (let i = 0; i < count; i++) {
			setTimeout(() => {
				introBlobs = [...introBlobs, makeBlob(i, $hexControls.rainbow)];
			}, i * 300);
		}

		setTimeout(() => {
			introFading = true;
			setTimeout(() => {
				introBlobs = [];
				introFading = false;
			}, 1200);
		}, (count - 1) * 300 + 3000);
	});

	$effect(() => {
		if ($hexControls.inkMode) {
			const id = setInterval(() => {
				persistBlobs = [...persistBlobs, makeBlob(persistBlobs.length, $hexControls.rainbow)];
			}, 2500);
			return () => clearInterval(id);
		} else {
			persistBlobs = [];
		}
	});

	function removeBlob(id: number) {
		persistBlobs = persistBlobs.filter(b => b.id !== id);
	}
</script>
```

- [ ] **Step 2: gooey SVG フィルターと墨レイヤーを追加する**

`+layout.svelte` の `<nav class="nav"` の直前に以下を挿入する：

```svelte
<!-- Gooey SVG filter for ink blobs -->
<svg style="display:none" aria-hidden="true">
  <defs>
    <filter id="ink-gooey">
      <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
      <feColorMatrix in="blur" type="matrix"
        values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" />
    </filter>
  </defs>
</svg>

<!-- Intro ink layer (first page load only) -->
{#if introBlobs.length > 0}
  <div class="ink-intro" class:--fading={introFading}>
    {#each introBlobs as blob (blob.id)}
      <div
        class="ink-blob"
        style="left:{blob.x}vw;top:{blob.y}vh;width:{blob.size}px;height:{blob.size}px;background:{blob.color};--ink-dur:{blob.dur}s;margin-left:-{blob.size / 2}px;margin-top:-{blob.size / 2}px"
      ></div>
    {/each}
  </div>
{/if}

<!-- Persistent ink layer (inkMode: true) -->
<div class="ink-layer" class:--active={$hexControls.inkMode}>
  {#each persistBlobs as blob (blob.id)}
    <div
      class="ink-blob"
      style="left:{blob.x}vw;top:{blob.y}vh;width:{blob.size}px;height:{blob.size}px;background:{blob.color};--ink-dur:{blob.dur}s;margin-left:-{blob.size / 2}px;margin-top:-{blob.size / 2}px"
      onanimationend={() => removeBlob(blob.id)}
    ></div>
  {/each}
</div>
```

- [ ] **Step 3: ambient div に `--ink` クラスを追加する**

`+layout.svelte` の ambient div を以下に更新する：

```svelte
<div class="ambient {$hexControls.rainbow ? '--rainbow' : ''} {$hexControls.inkMode ? '--ink' : ''}" aria-hidden="true">
```

- [ ] **Step 4: パネルに INK MODE トグルを追加する**

`+layout.svelte` の RAINBOW トグルの `</div>` の直後に以下を追加する：

```svelte
            <div class="hex-panel-row --switch">
              <span class="eyebrow">INK MODE</span>
              <button
                class="toggle-chip"
                class:--on={$hexControls.inkMode}
                onclick={() => hexControls.setInkMode(!$hexControls.inkMode)}
                aria-pressed={$hexControls.inkMode}
              >
                <span class="toggle-dot"></span>
              </button>
            </div>
```

- [ ] **Step 5: ビルドとテストが通ることを確認する**

```bash
npm test 2>&1 | tail -6
```

Expected: `Tests  91 passed (91)`

```bash
npm run build 2>&1 | tail -6
```

Expected: `✓ built in` で終了

- [ ] **Step 6: コミットする**

```bash
git add src/routes/+layout.svelte
git commit -m "feat: 墨ドロップ背景レイヤーとコントロールパネルトグルを追加"
```
