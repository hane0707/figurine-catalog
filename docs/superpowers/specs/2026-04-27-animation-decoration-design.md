# Animation & Decoration Design

**Date:** 2026-04-27  
**Status:** Approved

## Overview

コレクション一覧ページ（`/items`）にアニメーションと装飾を追加する。パフォーマンスへの悪影響を最小限に抑えつつ、ページに生き生きとした雰囲気を加える。

## Scope

以下の5つの効果を追加する：

1. 背景六角形リングの回転
2. フィルターボタンのアクティブ状態にフェード＋スケール
3. 統計数字のカウントアップ
4. スポットライト画像のフロート（浮遊感）
5. FAB ボタンのリングにパルス効果

すべて `prefers-reduced-motion: reduce` に対応する。

## Design Decisions

- **CSS ファースト**：六角形・フロート・FABパルスは `@keyframes` のみ。JSゼロ。
- **JS 最小限**：カウントアップのみ `onMount` + `requestAnimationFrame`。外部ライブラリなし。
- **既存トランジションを活かす**：フィルターは既存の `transition: all` に `transform: scale(1.06)` を1行追加するだけ。

## Section 1: 六角形の回転

**ファイル：** `src/app.css`

```css
@keyframes spin-cw  { to { transform: rotate(360deg); } }
@keyframes spin-ccw { to { transform: rotate(-360deg); } }

.ambient .r1 { animation: spin-cw  80s  linear infinite; }
.ambient .r2 { animation: spin-ccw 120s linear infinite; }
```

- 大（`.r1`）：時計回り、80秒/周
- 小（`.r2`）：反時計回り、120秒/周
- SVG 要素の `transform-origin: 50% 50%`（デフォルト）で中心回転
- 既存の `transform="rotate(12)"` は SVG 属性のため CSS `transform` と競合しない

**対象ファイル：** `src/app.css` のみ（CSS が `items/+page.svelte` と `items/[id]/+page.svelte` 両方に適用される）

## Section 2: フィルターボタン（フェード＋スケール）

**ファイル：** `src/app.css`

```css
.seg button.--active {
  background: var(--surface);
  color: var(--fg);
  box-shadow: var(--neu-soft);
  transform: scale(1.06);  /* 追加 */
}
```

既存の `transition: all var(--dur) var(--ease)` が `transform` を拾うため、クラスの切り替え時に smooth にスケールアップ・ダウンする。追加は1行のみ。

## Section 3: 統計数字のカウントアップ

**ファイル：** `src/routes/items/+page.svelte`

```typescript
let displayTotal    = $state(0);
let displayHandmade = $state(0);
let displayBought   = $state(0);
let displaySeries   = $state(0);

onMount(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    displayTotal = data.stats.total; displayHandmade = data.stats.handmade;
    displayBought = data.stats.bought; displaySeries = data.stats.series;
    return;
  }
  const dur = 1200, start = performance.now();
  function tick() {
    const t = Math.min((performance.now() - start) / dur, 1);
    const e = 1 - Math.pow(1 - t, 3); // ease-out cubic
    displayTotal    = Math.round(e * data.stats.total);
    displayHandmade = Math.round(e * data.stats.handmade);
    displayBought   = Math.round(e * data.stats.bought);
    displaySeries   = Math.round(e * data.stats.series);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
});
```

テンプレート内の `{data.stats.total}` 等を `{displayTotal}` 等に差し替える。1.2秒・ease-out cubic でカウントアップ。

## Section 4: スポットライトのフロート

**ファイル：** `src/app.css`

```css
@keyframes float {
  0%, 100% { transform: translateY(0);   }
  50%       { transform: translateY(-8px); }
}

.spotlight {
  animation: float 6s ease-in-out infinite;
}
```

6秒ループ・上下8px。`ease-in-out` で滑らかな往復。

## Section 5: FAB リングのパルス

**ファイル：** `src/app.css`

```css
@keyframes pulse-ring {
  0%   { transform: scale(1);   opacity: 0.3; }
  70%  { transform: scale(1.4); opacity: 0;   }
  100% { transform: scale(1.4); opacity: 0;   }
}

.fab-ring {
  animation: pulse-ring 2.5s ease-out infinite;
}
```

2.5秒ループ。リングが1.4倍に拡大しながらフェードアウト。ログイン時のみ表示されるFABに付与されるため、一般ユーザーには表示されない。

## Section 6: prefers-reduced-motion 対応

**ファイル：** `src/app.css`

```css
@media (prefers-reduced-motion: reduce) {
  .ambient .r1,
  .ambient .r2,
  .spotlight,
  .fab-ring { animation: none; }
}
```

JS カウントアップはセクション3内の `window.matchMedia` チェックで対応済み。

## Files Changed

| ファイル | 変更内容 |
|--------|---------|
| `src/app.css` | keyframes 追加（spin-cw, spin-ccw, float, pulse-ring）、各要素へのアニメーション付与、prefers-reduced-motion 対応 |
| `src/routes/items/+page.svelte` | displayStats 変数追加、onMount カウントアップ実装、テンプレート値差し替え |
