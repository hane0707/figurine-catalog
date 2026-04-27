# Animation & Decoration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** コレクションページに5種類のアニメーション効果（六角形回転・フィルタースケール・統計カウントアップ・スポットライトフロート・FABパルス）を追加する。

**Architecture:** CSS `@keyframes` ベース。統計カウントアップのみ Svelte `onMount` + `requestAnimationFrame` を使用。`prefers-reduced-motion` 対応を両方に組み込む。

**Tech Stack:** SvelteKit 5（runes）、CSS `@keyframes`、`requestAnimationFrame`

---

### Task 1: 背景・装飾アニメーション（CSS）

**Files:**
- Modify: `src/app.css`

六角形の回転・スポットライトフロート・FABリングパルス・`prefers-reduced-motion` 対応をすべて `src/app.css` に追加する。`items/[id]/+page.svelte` にも同じ `.ambient` 六角形があるが、CSS はグローバルに適用されるため追加変更は不要。

- [ ] **Step 1: animations セクションに4つの keyframes を追加**

`src/app.css` の `/* --- animations --- */` セクションにある `@keyframes rise { ... }` の直後（L635付近）に以下を追加：

```css
@keyframes spin-cw  { to { transform: rotate(360deg); } }
@keyframes spin-ccw { to { transform: rotate(-360deg); } }

@keyframes float {
  0%, 100% { transform: translateY(0);   }
  50%       { transform: translateY(-8px); }
}

@keyframes pulse-ring {
  0%   { transform: scale(1);   opacity: 0.3; }
  70%  { transform: scale(1.4); opacity: 0;   }
  100% { transform: scale(1.4); opacity: 0;   }
}
```

- [ ] **Step 2: `.ambient .r1` / `.r2` に回転アニメーションを付与**

`src/app.css` の `.ambient .r1` と `.ambient .r2` の行（L78-79）を以下に差し替え：

```css
.ambient .r1 { width: 700px; height: 700px; top: 10%; left: -200px; animation: spin-cw  80s  linear infinite; }
.ambient .r2 { width: 420px; height: 420px; bottom: 15%; right: -120px; animation: spin-ccw 120s linear infinite; }
```

- [ ] **Step 3: `.spotlight` にフロートアニメーションを付与**

`src/app.css` の `.spotlight { ... }` ブロック（L179付近）に `animation` プロパティを追加：

```css
.spotlight {
  position: relative; aspect-ratio: 4/5;
  border-radius: var(--radius-lg); background: var(--surface);
  box-shadow: var(--neu-deep); overflow: hidden;
  animation: float 6s ease-in-out infinite;
}
```

- [ ] **Step 4: `.fab-ring` にパルスアニメーションを付与**

`src/app.css` の `.fab .fab-ring { ... }` ブロック（L374付近）に `animation` プロパティを追加：

```css
.fab .fab-ring {
  position: absolute; inset: -6px; border-radius: 50%;
  border: 1.5px solid var(--fg); opacity: 0.3; pointer-events: none;
  animation: pulse-ring 2.5s ease-out infinite;
}
```

- [ ] **Step 5: `prefers-reduced-motion` 対応を追加**

`src/app.css` の `@custom-variant dark` の直前（L643付近）に追加：

```css
@media (prefers-reduced-motion: reduce) {
  .ambient .r1,
  .ambient .r2,
  .spotlight,
  .fab-ring { animation: none; }
}
```

- [ ] **Step 6: 開発サーバーでビジュアル確認**

```bash
npm run dev
```

ブラウザで `/items` を開いて確認：
- 左背景の大六角形が時計回りにゆっくり回転している（約80秒/周）
- 右背景の小六角形が反時計回りに回転している（約120秒/周）
- スポットライット画像カードが上下に6秒ループでフロートしている
- 管理者ログイン時: 右下のFABボタン周囲リングがパルスしている

- [ ] **Step 7: コミット**

```bash
git add src/app.css
git commit -m "feat: 背景六角形回転・スポットライトフロート・FABパルスを追加"
```

---

### Task 2: フィルターボタンのアクティブスケール（CSS）

**Files:**
- Modify: `src/app.css`

- [ ] **Step 1: `.seg button.--active` に `transform: scale(1.06)` を追加**

`src/app.css` の `.seg button.--active { ... }` ブロック（L265付近）を以下に差し替え：

```css
.seg button.--active { background: var(--surface); color: var(--fg); box-shadow: var(--neu-soft); transform: scale(1.06); }
```

既存の `transition: all var(--dur) var(--ease)` が `transform` を自動的に補間するため、追加のトランジション指定は不要。

- [ ] **Step 2: 開発サーバーでビジュアル確認**

ブラウザで `/items` を開き、「すべて」「購入品」「自作品」および「最新」「古い順」ボタンをクリックして、アクティブなボタンがスムーズにスケールアップするか確認。

- [ ] **Step 3: コミット**

```bash
git add src/app.css
git commit -m "feat: フィルターボタンのアクティブ時にスケールアニメーションを追加"
```

---

### Task 3: 統計数字のカウントアップ（JS + テンプレート）

**Files:**
- Modify: `src/routes/items/+page.svelte`

- [ ] **Step 1: display 用の `$state` 変数を追加**

`src/routes/items/+page.svelte` の `<script>` 内、`let layout = $state('grid');` の次の行に追加：

```typescript
let displayTotal    = $state(0);
let displayHandmade = $state(0);
let displayBought   = $state(0);
let displaySeries   = $state(0);
```

- [ ] **Step 2: 既存の `onMount` ブロック全体を以下に差し替え**

`src/routes/items/+page.svelte` の `onMount(() => { ... })` ブロックを以下に置き換え（カウントアップを先頭に追加しつつ既存ロジックを保持）：

```typescript
onMount(() => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    displayTotal = data.stats.total; displayHandmade = data.stats.handmade;
    displayBought = data.stats.bought; displaySeries = data.stats.series;
  } else {
    const dur = 1200, start = performance.now();
    const tick = () => {
      const t = Math.min((performance.now() - start) / dur, 1);
      const e = 1 - Math.pow(1 - t, 3);
      displayTotal    = Math.round(e * data.stats.total);
      displayHandmade = Math.round(e * data.stats.handmade);
      displayBought   = Math.round(e * data.stats.bought);
      displaySeries   = Math.round(e * data.stats.series);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  fetchItems();
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && hasMore && !loading) fetchItems();
  });
  observer.observe(sentinel);
  return () => observer.disconnect();
});
```

- [ ] **Step 3: テンプレートの stats 数値バインディングを差し替え**

`src/routes/items/+page.svelte` の stats セクション（L148-172付近）で、`data.stats.*` を `display*` に差し替え：

```html
<!-- 変更前 → 変更後 (4箇所) -->
<div class="stat-value">{data.stats.total}</div>
  → <div class="stat-value">{displayTotal}</div>

<div class="stat-value">{data.stats.handmade}</div>
  → <div class="stat-value">{displayHandmade}</div>

<div class="stat-value">{data.stats.bought}</div>
  → <div class="stat-value">{displayBought}</div>

<div class="stat-value">{data.stats.series}</div>
  → <div class="stat-value">{displaySeries}</div>
```

- [ ] **Step 4: 開発サーバーでビジュアル確認**

ブラウザで `/items` を開き（またはハードリロードし）、ページ表示時に統計数字が 0 から実数値まで約1.2秒かけて ease-out でカウントアップするか確認。

- [ ] **Step 5: コミット**

```bash
git add src/routes/items/+page.svelte
git commit -m "feat: 統計数字のカウントアップアニメーションを追加"
```
