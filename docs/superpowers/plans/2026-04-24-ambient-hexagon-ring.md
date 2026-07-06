# Ambient Hexagon Ring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `.amb-ring` の正円アウトラインを Pointy-top 正六角形（12° 傾き）に変更する。

**Architecture:** `<div class="amb-ring">` を `<svg>` + `<polygon>` に差し替えることで、CSS `clip-path` では実現できない 1px 正確な六角形アウトラインを SVG stroke で描画する。CSS の位置指定（`position`/`top`/`left`/`width`/`height`/`opacity`）はそのまま流用。

**Tech Stack:** SVG, CSS, SvelteKit

---

### Task 1: CSS の `.amb-ring` ルール修正

**Files:**
- Modify: `src/app.css:75-78`

- [ ] **Step 1: `.amb-ring` ルールを更新する**

`src/app.css` の 75〜78 行を以下に書き換える：

変更前:
```css
.ambient .amb-ring {
  position: absolute; border-radius: 50%;
  border: 1px solid var(--line); opacity: 0.5;
}
```

変更後:
```css
.ambient .amb-ring {
  position: absolute; opacity: 0.5; overflow: visible;
}
```

- [ ] **Step 2: コミット**

```bash
git add src/app.css
git commit -m "style: amb-ring から border-radius/border を削除し SVG 用に準備"
```

---

### Task 2: items ページの amb-ring を SVG に差し替え

**Files:**
- Modify: `src/routes/items/+page.svelte:95-96`

- [ ] **Step 1: div を svg + polygon に差し替える**

`src/routes/items/+page.svelte` の以下の箇所を変更：

変更前:
```html
  <div class="amb-ring r1"></div>
  <div class="amb-ring r2"></div>
```

変更後:
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

- [ ] **Step 2: コミット**

```bash
git add src/routes/items/+page.svelte
git commit -m "style: items ページの amb-ring を正六角形 SVG に変更"
```

---

### Task 3: items/[id] ページの amb-ring を SVG に差し替え

**Files:**
- Modify: `src/routes/items/[id]/+page.svelte:190-191`

- [ ] **Step 1: div を svg + polygon に差し替える**

`src/routes/items/[id]/+page.svelte` の以下の箇所を変更：

変更前:
```html
  <div class="amb-ring r1"></div>
  <div class="amb-ring r2"></div>
```

変更後:
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

- [ ] **Step 2: ブラウザで視覚確認**

開発サーバーを起動して `/items` と `/items/[任意の id]` を確認：
- 背景に薄い六角形アウトラインが 2 つ表示されている
- 六角形は Pointy-top（頂点が上下）かつ約 12° 傾いている
- 既存の blob（ぼかし円）は変化なし

```bash
npm run dev
# ブラウザで http://localhost:5173/items を開いて確認
```

- [ ] **Step 3: コミット**

```bash
git add src/routes/items/[id]/+page.svelte
git commit -m "style: items/[id] ページの amb-ring を正六角形 SVG に変更"
```
