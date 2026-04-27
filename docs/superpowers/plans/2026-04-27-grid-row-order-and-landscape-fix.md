# グリッド行優先順序と横長画像余白修正 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** アイテムグリッドの並び順を行優先（左→右→次の行）に変更し、横長画像カードの余白を解消する。

**Architecture:** CSS `columns` を `display: flex` ベースの Svelte 管理カラムに置き換えてアイテムをインデックスで列振り分けする。同時に `.card-img` の `min-height` をプレースホルダー側に移すことで画像ありカードの余白を取り除く。

**Tech Stack:** SvelteKit (Svelte 5 runes)、CSS

---

## ファイルマップ

| ファイル | 変更内容 |
|--------|----------|
| `src/app.css` | `.items-grid` を flex に変更、`.items-column` を追加、`.card` の `break-inside` / `margin-bottom` を削除、`.card-img` の `min-height` を削除 |
| `src/routes/items/+page.svelte` | `columnCount` state・`columns` derived を追加、`onMount` にリサイズ監視を統合、グリッドテンプレートをカラム構造に変更 |
| `src/lib/components/ItemCard.svelte` | プレースホルダー div の `height: 100%` を `min-height: 160px` に変更 |

---

## Task 1: app.css — グリッドCSS を flex カラムに更新

**Files:**
- Modify: `src/app.css`（`.items-grid`, `.card`, `.card-img` の各ブロック）

現在の `.items-grid`（lines 280–289 付近）:
```css
/* --- items grid --- */
.items-grid {
  columns: 4; column-gap: 24px;
}
@media (max-width: 1100px) {
  .items-grid { columns: 3; column-gap: 16px; }
}
@media (max-width: 720px) {
  .items-grid { columns: 2; column-gap: 12px; }
}
```

現在の `.card`（lines 291–302 付近）:
```css
/* --- card --- */
.card {
  background: var(--surface); border-radius: var(--radius);
  padding: 14px; box-shadow: var(--neu-soft);
  transition: all var(--dur) var(--ease); cursor: pointer;
  text-align: left; display: flex; flex-direction: column;
  position: relative; text-decoration: none; color: inherit;
  break-inside: avoid;
}
.items-grid .card { margin-bottom: 24px; }
@media (max-width: 720px) {
  .items-grid .card { margin-bottom: 16px; }
}
```

現在の `.card-img`（lines 304–309 付近）:
```css
.card-img {
  border-radius: calc(var(--radius) - 6px);
  overflow: hidden; background: var(--bg-sunk);
  box-shadow: var(--neu-inset); position: relative; margin-bottom: 14px;
  min-height: 160px;
}
```

- [ ] **Step 1: `.items-grid` を flex に置き換え、`.items-column` を追加**

`.items-grid` ブロック全体（3つのメディアクエリを含む）を以下に置き換える:

```css
/* --- items grid --- */
.items-grid {
  display: flex; gap: 24px; align-items: flex-start;
}
@media (max-width: 1100px) {
  .items-grid { gap: 16px; }
}
@media (max-width: 720px) {
  .items-grid { gap: 12px; }
}
.items-column {
  flex: 1; display: flex; flex-direction: column; gap: 24px;
}
@media (max-width: 1100px) {
  .items-column { gap: 16px; }
}
@media (max-width: 720px) {
  .items-column { gap: 12px; }
}
```

- [ ] **Step 2: `.card` から `break-inside: avoid` を削除し、`.items-grid .card` の margin-bottom ルールを削除**

`.card` ブロックと後続の2行を以下に置き換える:

```css
/* --- card --- */
.card {
  background: var(--surface); border-radius: var(--radius);
  padding: 14px; box-shadow: var(--neu-soft);
  transition: all var(--dur) var(--ease); cursor: pointer;
  text-align: left; display: flex; flex-direction: column;
  position: relative; text-decoration: none; color: inherit;
}
```

（`.items-grid .card { margin-bottom: 24px; }` と `@media (max-width: 720px) { .items-grid .card { margin-bottom: 16px; } }` の2ブロックも削除する）

- [ ] **Step 3: `.card-img` から `min-height: 160px` を削除**

```css
.card-img {
  border-radius: calc(var(--radius) - 6px);
  overflow: hidden; background: var(--bg-sunk);
  box-shadow: var(--neu-inset); position: relative; margin-bottom: 14px;
}
```

- [ ] **Step 4: ビルドエラーがないことを確認**

```bash
npm run build 2>&1 | grep -E "error|✔" | head -5
```

Expected: `✔ done`（wrangler の EROFS warning は無視してよい）

- [ ] **Step 5: コミット**

```bash
git add src/app.css
git commit -m "feat: items-gridをflexカラムに変更、card関連CSSをクリーンアップ"
```

---

## Task 2: +page.svelte — Svelte管理カラムに切り替え

**Files:**
- Modify: `src/routes/items/+page.svelte`

現在のスクリプトセクション冒頭（lines 1–18 付近）:
```svelte
<script lang="ts">
  import type { PageData } from './$types';
  import { onMount } from 'svelte';
  import ItemCard from '$lib/components/ItemCard.svelte';

  let { data }: { data: PageData } = $props();

  let items: any[] = $state([]);
  let offset = $state(0);
  const limit = 30;
  let loading = $state(false);
  let hasMore = $state(true);
  let query = $state('');
  let kindFilter = $state('all');
  let sort = $state('recent');
  let activeTags = $state<string[]>([]);
  let layout = $state('grid');
```

現在の `onMount`（lines 66–91）:
```svelte
  onMount(() => {
    let rafId: number;
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
        if (t < 1) rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    }
    fetchItems();
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) fetchItems();
    });
    observer.observe(sentinel);
    return () => { cancelAnimationFrame(rafId); observer.disconnect(); };
  });
```

現在のグリッドテンプレート（lines 246–259）:
```svelte
  {#if layout === 'grid'}
    <div class="items-grid rise rise-d4">
      {#each items as item (item.id)}
        <ItemCard {item} isOwner={!!data.user} />
      {/each}
    </div>
```

- [ ] **Step 1: `columnCount` state と `columns` derived を追加**

`let layout = $state('grid');` の直後（line 17 の後）に以下を追加:

```svelte
  let columnCount = $state(4);
  let columns = $derived(
    Array.from({ length: columnCount }, (_, col) =>
      items.filter((_, i) => i % columnCount === col)
    )
  );
```

- [ ] **Step 2: `onMount` にカラム数のリサイズ監視を統合**

既存の `onMount` 全体を以下に置き換える:

```svelte
  onMount(() => {
    let rafId: number;
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
        if (t < 1) rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    }
    const updateColumns = () => {
      columnCount = window.innerWidth <= 720 ? 2
                  : window.innerWidth <= 1100 ? 3
                  : 4;
    };
    updateColumns();
    window.addEventListener('resize', updateColumns);
    fetchItems();
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) fetchItems();
    });
    observer.observe(sentinel);
    return () => { cancelAnimationFrame(rafId); observer.disconnect(); window.removeEventListener('resize', updateColumns); };
  });
```

- [ ] **Step 3: グリッドテンプレートを Svelte管理カラムに変更**

```svelte
  {#if layout === 'grid'}
    <div class="items-grid rise rise-d4">
      {#each columns as column, colIdx (colIdx)}
        <div class="items-column">
          {#each column as item (item.id)}
            <ItemCard {item} isOwner={!!data.user} />
          {/each}
        </div>
      {/each}
    </div>
```

- [ ] **Step 4: ビルドエラーがないことを確認**

```bash
npm run build 2>&1 | grep -E "error|✔" | head -5
```

Expected: `✔ done`

- [ ] **Step 5: コミット**

```bash
git add src/routes/items/+page.svelte
git commit -m "feat: Svelte管理カラムで行優先グリッドに変更"
```

---

## Task 3: ItemCard.svelte — プレースホルダー高さを修正

**Files:**
- Modify: `src/lib/components/ItemCard.svelte:26`

現在の該当行（line 26）:
```svelte
      <div style="width:100%; height:100%; display:grid; place-items:center; font-family:var(--f-display); font-size:40px; opacity:0.2; color:var(--fg)">✦</div>
```

- [ ] **Step 1: `height:100%` を `min-height:160px` に変更**

```svelte
      <div style="width:100%; min-height:160px; display:grid; place-items:center; font-family:var(--f-display); font-size:40px; opacity:0.2; color:var(--fg)">✦</div>
```

- [ ] **Step 2: ビルドとテストを確認**

```bash
npm run build 2>&1 | grep -E "error|✔" | head -5 && npm test 2>&1 | grep -E "Tests|passed|failed"
```

Expected:
```
✔ done
 Tests  50 passed (50)
```

- [ ] **Step 3: コミット**

```bash
git add src/lib/components/ItemCard.svelte
git commit -m "fix: 画像なしカードのプレースホルダー高さをmin-height:160pxに変更"
```

---

## 完了チェック

- [ ] スマホ幅（≤720px）: アイテム0が左、アイテム1が右（行優先）
- [ ] デスクトップ幅（>1100px）: 4列で行優先
- [ ] ウィンドウリサイズ時にカラム数が切り替わる
- [ ] 横長画像カードで画像下の余白がない
- [ ] 画像なしカードが ✦ アイコンと共に適切な高さで表示される
- [ ] リストビュー（list モード）が正常に動作する
- [ ] 無限スクロールで新しいアイテムが正しい列に追加される
- [ ] テスト 50/50 パス
