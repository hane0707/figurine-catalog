# Ambient Hexagon Ring Design

**Date:** 2026-04-24  
**Status:** Approved

## Overview

背景の Ambient レイヤーに表示されている正円アウトライン（`.amb-ring`）を、Pointy-top 正六角形アウトラインに変更する。

## Problem

`.amb-ring` 要素は現在 `border-radius: 50%` によって正円として描画されている。正六角形の輪郭線に変更したい。

## Solution

`<div>` 要素を `<svg>` 要素に差し替え、`<polygon>` で正六角形アウトラインを描画する。CSS の `border: 1px solid` + `clip-path` の組み合わせでは正確な 1px 六角形アウトラインを描けないため、SVG が唯一クリーンな実装手段。

### 六角形仕様

- **形状:** Pointy-top 正六角形（頂点が上下）
- **傾き:** 12° 回転（SVG `transform="rotate(12)"` で適用）
- **r1:** 外接円半径 350px（700×700 の枠内）
- **r2:** 外接円半径 210px（420×420 の枠内）
- **線:** `stroke="var(--line)"` `stroke-width="1"` `fill="none"`

### 頂点座標

**r1（半径 350）:**
`0,-350  303,-175  303,175  0,350  -303,175  -303,-175`

**r2（半径 210）:**
`0,-210  182,-105  182,105  0,210  -182,105  -182,-105`

## Files Changed

| ファイル | 変更内容 |
|--------|---------|
| `src/app.css` | `.amb-ring` から `border-radius: 50%` と `border` を削除。`overflow: visible` を追加 |
| `src/routes/items/+page.svelte` | `<div class="amb-ring r1/r2">` → `<svg>` + `<polygon>` |
| `src/routes/items/[id]/+page.svelte` | 同上 |

## SVG Markup

```html
<svg class="amb-ring r1" viewBox="-350 -350 700 700" aria-hidden="true">
  <polygon points="0,-350 303,-175 303,175 0,350 -303,175 -303,-175"
    fill="none" stroke="var(--line)" stroke-width="1" transform="rotate(12)"/>
</svg>
<svg class="amb-ring r2" viewBox="-210 -210 420 420" aria-hidden="true">
  <polygon points="0,-210 182,-105 182,105 0,210 -182,105 -182,-105"
    fill="none" stroke="var(--line)" stroke-width="1" transform="rotate(12)"/>
</svg>
```

## CSS Change

```css
.ambient .amb-ring {
  position: absolute; opacity: 0.5; overflow: visible;
}
```
