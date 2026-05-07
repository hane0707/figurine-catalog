# Ink Drop Background Design

**Date:** 2026-05-07  
**Status:** Approved

## Overview

墨や絵具を水中に落としたような有機的なブロブエフェクトを背景に追加する。

- **イントロアニメーション**：ページ初回ロード時に3〜4滴の墨が落ちて広がり、自動フェードアウト（`sessionStorage` で再表示防止）
- **INK MODE**：ヘックスコントロールパネルのトグルで六角形リングと切り替え可能。ON の間は定期的に新しい墨が落ちてきて古いものがゆっくり消える

## Requirements

- イントロは `inkMode` の ON/OFF に関わらず初回ロード時のみ走る
- `inkMode: true` のとき六角形リング（`.amb-ring`）を非表示、墨レイヤーをアクティブ化
- 墨の色：`rainbow: false` = モノクロ（暗い墨色）、`rainbow: true` = アクセントカラー
- `inkMode` は `localStorage` に永続化
- 持続モードでは2〜4秒ごとに新しいブロブを追加、各ブロブは8〜10秒かけて広がって消える

## Architecture

### State — `src/lib/stores/hexControls.ts`

```typescript
interface HexState {
  speed: number;    // 既存
  rainbow: boolean; // 既存
  inkMode: boolean; // 新規
}
```

`inkMode` のデフォルトは `false`。

### Gooey Filter

`+layout.svelte` に隠し SVG を置き、`feGaussianBlur` + `feColorMatrix` でブロブが溶け合う「gooey」効果を定義する：

```html
<svg style="display:none" aria-hidden="true">
  <defs>
    <filter id="ink-gooey">
      <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
      <feColorMatrix in="blur" type="matrix"
        values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" />
    </filter>
  </defs>
</svg>
```

### Ink Layer（2 コンテナ）

レイヤーは用途別に2つに分ける：

```
.ink-intro   — イントロ専用。onMount で追加したブロブだけを含む。全ブロブ消滅後に opacity: 0 へ。
.ink-layer   — 持続モード専用。inkMode: true のときのみ active。
```

`+layout.svelte` 内でそれぞれブロブ配列を管理：

```typescript
interface InkBlob {
  id: number;
  x: number;    // vw 単位のランダム位置
  y: number;    // vh 単位
  size: number; // px（200〜500）
  color: string;
  dur: number;  // アニメーション秒数（8〜10）
}

let introBlobs = $state<InkBlob[]>([]);
let introFading = $state(false);

let persistBlobs = $state<InkBlob[]>([]);
```

**イントロ（`onMount`）**：
1. `sessionStorage.getItem('ink-intro-shown')` を確認
2. 未表示なら3〜4個を 300ms 刻みで `introBlobs` に追加
3. `sessionStorage.setItem('ink-intro-shown', '1')` を記録
4. 最後のブロブ追加から 3s 後に `introFading = true`（レイヤーごとフェードアウト）
5. フェード完了後（1.2s）に `introBlobs = []`

**持続モード（`inkMode: true`）**：
- `setInterval(addPersistBlob, 2500)` でブロブを `persistBlobs` に追加
- 各ブロブは CSS アニメーションで拡大→フェード、`animationend` で `persistBlobs` から削除
- `inkMode` が OFF になったら `clearInterval` して `persistBlobs = []`

### CSS Animations — `src/app.css`

```css
.ink-intro,
.ink-layer {
  position: fixed;
  inset: 0;
  filter: url(#ink-gooey);
  pointer-events: none;
  z-index: 0;
}

/* 持続モードが OFF のとき非表示 */
.ink-layer { display: none; }
.ink-layer.--active { display: block; }

/* イントロレイヤー全体のフェードアウト */
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
```

### Color Logic

```typescript
function blobColor(rainbow: boolean, index: number): string {
  if (!rainbow) return 'oklch(0.25 0.01 285 / 0.55)';
  const hues = [55, 230, 140, 285]; // amber, haze, green, violet
  return `oklch(0.6 0.18 ${hues[index % hues.length]} / 0.55)`;
}
```

### Hex Rings Visibility

`+layout.svelte` の ambient div に `--ink` クラスを付与：

```svelte
<div class="ambient {$hexControls.rainbow ? '--rainbow' : ''} {$hexControls.inkMode ? '--ink' : ''}" ...>
```

```css
.ambient.--ink .amb-ring {
  opacity: 0;
  pointer-events: none;
}
```

### Panel UI

```
┌─────────────────────────┐
│  SPEED                  │
│  ◀━━━━━━━━━━━━━━━▶      │
│  Fast          Slow     │
│                         │
│  RAINBOW  ○─────────    │
│                         │
│  INK MODE ○─────────    │
└─────────────────────────┘
```

既存の RAINBOW トグルと同じ `toggle-chip` コンポーネントを流用。

## Files Changed

| ファイル | 変更内容 |
|---|---|
| `src/lib/stores/hexControls.ts` | `inkMode: boolean` を `HexState` に追加、localStorage 永続化 |
| `src/routes/+layout.svelte` | 隠し SVG フィルター定義・墨レイヤー・イントロロジック・INK MODE トグル追加 |
| `src/app.css` | `.ink-layer`・`.ink-blob`・`ink-spread` キーフレーム・`.--ink` ルール追加 |

## Non-Goals

- 墨の落下ポイントのユーザー指定
- ブロブ数・速度のスライダー制御
- モバイルでのタップによる手動追加
