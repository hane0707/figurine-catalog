# Glitch Text Effect — Design Spec

**Date:** 2026-04-27  
**Status:** Approved

---

## Overview

`GlitchText.svelte` コンポーネントを新規作成し、items ページのヒーロータイトル「雨のあたらない、スーツケースの中。」と about ページの見出し「Haku's suitcase」にグリッチ風のページ読み込み時アニメーションを適用する。

ベースとなる実装は `docs/glitch-text-v4.html` のアニメーションロジック（キャラクター単位のブリンク → マスクオーバーレイ → 溶解 → 確定）で、マスクカラーのみアプリの OKLCH hue 285 系パレットに統一する。

---

## Component API

**ファイル:** `src/lib/components/GlitchText.svelte`

```typescript
type Segment = {
  text: string;
  em?: boolean;         // true のとき <em> で囲む
  breakAfter?: boolean; // true のとき末尾に <br> を挿入
};

// Props
segments: Segment[]
```

コンポーネントは `<span class="glitch-text">` をルートとして各 Segment を順番にレンダリングする。各文字は `<span class="glitch-ch">` に分解される。`em: true` のセグメントの文字は `<em>` の中に入る。

**句読点サイズ:** `、` `。` は `font-size: 0.75em` で小さく表示する（v4 踏襲）。

---

## Animation Logic

### 初期状態
全 `.glitch-ch` は `opacity: 0` でレンダリング。

### onMount で実行
`querySelectorAll('.glitch-ch')` で全文字を取得し、各文字にランダムな delay（`i × 120ms ± ジッター`）を付けて並列でアニメーション開始（`Promise.all`）。

### 1文字のアニメーション（v4 と同一）

| フェーズ | 内容 |
|---|---|
| Phase 1 | 2〜6 回ランダム点滅（opacity 0 ↔ 0.05–0.45）、40〜120ms 間隔 |
| Phase 2 | opacity 0.6〜0.9 で半透明定着。55% の確率でマスクスパンを追加 |
| Phase 3 | マスクを 3〜8 ステップで徐々に opacity 0 に溶かして DOM から除去 |
| Phase 4 | opacity 1 に確定。25% の確率で追加グリッチフラッシュ（opacity 下げ→戻し） |

### prefers-reduced-motion 対応
`window.matchMedia('(prefers-reduced-motion: reduce)').matches` が true の場合、全文字を即座に `opacity: 1` にしてアニメーションをスキップする。

---

## Mask Colors

v4 の RGB 紫系マスクをアプリの OKLCH hue 285 系に統一する。

```ts
const maskColors = [
  'oklch(0.62 0.20 285 / 0.80)',  // mid violet
  'oklch(0.52 0.22 285 / 0.82)',  // --accent-amber 相当
  'oklch(0.72 0.16 285 / 0.75)',  // lighter violet
  'oklch(0.45 0.20 285 / 0.85)',  // dark violet
  'oklch(0.58 0.10 230 / 0.78)',  // --accent-haze 寄り（青紫）
];
```

マスク形状は矩形（`border-radius: 0〜3px`）と正円（`aspect-ratio: 1/1; border-radius: 50%`）をランダムで使い分ける（v4 踏襲）。

---

## Integration

### items/+page.svelte（132〜135行目）

```svelte
<!-- Before -->
<h1 class="display hero-title">
  雨のあたらない、<br />
  <em>スーツケース</em>の中。
</h1>

<!-- After -->
<h1 class="display hero-title">
  <GlitchText segments={[
    { text: '雨のあたらない、', breakAfter: true },
    { text: 'スーツケース', em: true },
    { text: 'の中。' }
  ]} />
</h1>
```

### about/+page.svelte（16〜18行目）

```svelte
<!-- Before -->
<h1 class="display" style="font-size: clamp(32px, 5vw, 64px); margin-bottom: 32px; line-height: 1.1">
  Haku's suitcase
</h1>

<!-- After -->
<h1 class="display" style="font-size: clamp(32px, 5vw, 64px); margin-bottom: 32px; line-height: 1.1">
  <GlitchText segments={[{ text: "Haku's suitcase" }]} />
</h1>
```

---

## Files Changed

| ファイル | 変更種別 |
|---|---|
| `src/lib/components/GlitchText.svelte` | 新規作成 |
| `src/routes/items/+page.svelte` | h1 の中身を `GlitchText` に置き換え |
| `src/routes/about/+page.svelte` | h1 の中身を `GlitchText` に置き換え |
