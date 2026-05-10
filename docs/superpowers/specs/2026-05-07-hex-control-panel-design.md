# Hex Control Panel Design

**Date:** 2026-05-07  
**Status:** Approved

## Overview

背景の六角形リング（`.amb-ring`）のスピードと虹色エフェクトをユーザーがリアルタイムで操作できる、小型フローティングパネルを追加する。パネルはヘッダーのアイコンボタンで開閉し、フォーカスアウトで自動的に閉じる。

## Requirements

- 現状のアニメーション速度をスライダーの最低速（右端）とし、左端は極端に速い「ギュルギュル」状態
- 虹色モード：ストロークの色相が時間とともに自動サイクル
- 設定（スピード・虹色）はページをまたいで保持される（`localStorage`）
- ヘッダースイッチはすべてのページに表示
- パネルはフォーカスアウトで非表示になる

## Architecture

### State — `src/lib/stores/hexControls.ts`

```typescript
interface HexState {
  speed: number;    // 1–100（1 = 最速、100 = 現状の最低速）
  rainbow: boolean;
}
```

`panelOpen` は store に含めない（ローカル UI 状態として `+layout.svelte` 内で管理）。  
`speed` と `rainbow` のみ `localStorage` に永続化する。

### Speed → Duration 変換（対数スケール）

スライダー値 `speed`（1–100）をアニメーション秒数に変換する：

```
r1Duration = 0.8 + (speed / 100)² × (80 - 0.8)    // 0.8s〜80s
r2Duration = 1.2 + (speed / 100)² × (120 - 1.2)   // 1.2s〜120s
```

`speed = 100` のとき現状と同じ（r1: 80s、r2: 120s）。  
`speed = 1` のとき最速（r1: 約 0.8s、r2: 約 1.2s）。

### Header Switch — `src/routes/+layout.svelte`

`.nav-actions` の右端に六角形アイコンボタン（`⬡`）を追加。クリックで `panelOpen` を toggle する。

パネルはボタンの兄弟要素として `position: relative` なラッパー内に配置し、`position: absolute; top: calc(100% + 8px); right: 0` で表示。

フォーカスアウト検知は `focusout` イベントの `relatedTarget` チェックで実装：

```svelte
function handleFocusOut(e: FocusEvent) {
  // relatedTarget が null（ウィンドウ外フォーカス移動）のときも閉じる
  if (!e.relatedTarget || !panelEl.contains(e.relatedTarget as Node)) {
    panelOpen = false;
  }
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
└─────────────────────────┘
```

- 幅: `220px`、パディング: `16px`
- スタイル: `var(--surface)`、`var(--neu-soft)`、`border-radius: var(--r)`
- ラベル: `--f-mono`、`font-size: 10px`、`letter-spacing: 0.14em`、uppercase
- スライダー: `<input type="range" min="1" max="100">`
- トグル: 既存の `$lib/components/ui/switch` コンポーネントを流用

### Animation Binding — items pages

`/items/+page.svelte` と `/items/[id]/+page.svelte` の ambient ブロックに store 値をバインド：

```svelte
<svg class="amb-ring r1" style="animation-duration: {r1Duration}s" ...>
<svg class="amb-ring r2" style="animation-duration: {r2Duration}s" ...>
```

`app.css` の `.r1` / `.r2` ルールから `80s` / `120s` を削除し、inline style を優先させる。

### Rainbow Effect — `src/app.css`

```css
.ambient.--rainbow .amb-ring polygon {
  stroke: oklch(0.7 0.25 0);
  animation: hue-cycle 3s linear infinite;
}

@keyframes hue-cycle {
  from { filter: hue-rotate(0deg); }
  to   { filter: hue-rotate(360deg); }
}
```

`rainbow` が `true` のとき `.ambient` に `--rainbow` クラスを付与する。

## Files Changed

| ファイル | 変更内容 |
|---|---|
| `src/lib/stores/hexControls.ts` | 新規：HexState store + localStorage 永続化 |
| `src/routes/+layout.svelte` | ヘッダーにパネルトリガーボタン＋フローティングパネルを追加 |
| `src/routes/items/+page.svelte` | ambient SVG に `animation-duration` inline style バインド、`--rainbow` クラス付与 |
| `src/routes/items/[id]/+page.svelte` | 同上 |
| `src/app.css` | `.r1`/`.r2` から固定 duration を削除、`hue-cycle` @keyframes と `.--rainbow` ルールを追加 |

## Non-Goals

- アニメーション方向（CW/CCW）の制御
- 個別リングへの独立スピード設定
- ダークモード対応の虹色パレット調整
