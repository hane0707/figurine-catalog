# About リンク（hero-meta inline）デザイン仕様

**Date:** 2026-04-28  
**Status:** Approved

---

## 概要

`/items` ページのヒーローセクションにある `hero-meta` エリアに、About ページへの控えめなインラインリンクを追加する。「気づいてほしいが押し付けがましくない」存在感を目指す。

---

## 変更箇所

**ファイル:** `src/routes/items/+page.svelte`

### HTML（hero-meta 内の mono span を修正）

```html
<!-- Before -->
<span class="mono" style="font-size:11px; color:var(--fg-soft)">
  {data.stats.total} items · {data.stats.handmade} handmade
</span>

<!-- After -->
<span class="mono" style="font-size:11px; color:var(--fg-soft)">
  {data.stats.total} items · {data.stats.handmade} handmade · <a href="/about" class="hero-about-link">このサイトについて →</a>
</span>
```

### CSS（`<style>` ブロックに追加）

```css
.hero-about-link {
  color: inherit;
  text-decoration: none;
  transition: color var(--dur) var(--ease);
}
.hero-about-link:hover {
  color: var(--fg);
}
```

---

## ビジュアル仕様

| 状態 | 色 | アンダーライン |
|------|-----|----------------|
| 通常 | `var(--fg-soft)`（親継承） | なし |
| ホバー | `var(--fg)` | なし |

- 矢印 `→` はユニコード文字で直接埋め込み（アイコン依存なし）
- 既存の `·` 区切りパターンを踏襲することで stats テキストと自然に連続する

---

## 設計方針

- 新規コンポーネントなし
- 新規 DOM 要素なし（既存 span 内にアンカーを埋め込むのみ）
- 既存のトランジション変数（`--dur`, `--ease`）を流用
- スタイルは `+page.svelte` のローカル `<style>` に閉じ込める

---

## 対象外

- About ページ自体の変更は行わない
- モバイル対応の追加変更は不要（`hero-meta` は現状 flex row でそのまま自然に折り返す）
