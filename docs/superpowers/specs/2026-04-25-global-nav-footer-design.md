# グローバル nav・フッター + nav フェード効果 設計ドキュメント

**Date:** 2026-04-25
**Project:** figurine-catalog
**Branch:** feat/ambient-hexagon-ring

---

## 概要

3つの変更を一括実装する。

1. **nav フェード効果**: sticky nav の下端境界をグラデーションでぼかす
2. **グローバル nav**: nav を `+layout.svelte` に移動し、全ページで統一表示
3. **グローバルフッター**: `+layout.svelte` にフッターを追加（About / Privacy Policy / Collection へのリンク）

---

## 変更ファイル一覧

| ファイル | 種別 | 変更内容 |
|---------|------|---------|
| `src/routes/+layout.svelte` | 修正 | nav・フッターを追加。`data` / `$page` を使用 |
| `src/app.css` | 修正 | `.nav` にフェード用 `::after` 追加。ネガティブマージン削除。`.site-footer` 追加 |
| `src/routes/items/+page.svelte` | 修正 | `<nav class="nav">` ブロックを削除 |
| `src/routes/items/[id]/+page.svelte` | 修正 | `<nav class="nav">` ブロックを削除 |
| `src/routes/about/+page.svelte` | 修正 | `<nav class="nav">` ブロックを削除。`<footer class="page-footer">` を削除 |
| `src/routes/privacy/+page.svelte` | 修正 | `<nav class="nav">` ブロックを削除。`<footer class="page-footer">` を削除 |
| `src/routes/admin/+page.svelte` | 修正 | 「← 一覧へ戻る」リンクを削除（グローバル nav で代替） |

---

## 詳細設計

### A. nav フェード効果（`src/app.css`）

`.nav` に `::after` 擬似要素を追加する。nav 自体の `backdrop-filter` や背景色には変更を加えない。

```css
.nav::after {
  content: '';
  position: absolute;
  left: 0; right: 0; top: 100%;
  height: 32px;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    color-mix(in oklch, var(--bg) 55%, transparent),
    transparent
  );
}
```

### B. グローバル nav（`src/routes/+layout.svelte`）

#### HTML 構造

```svelte
<script lang="ts">
  import '../app.css';
  import { Toaster } from '$lib/components/ui/sonner';
  import { page } from '$app/state';

  let { children, data } = $props();
  const isSecondary = $derived(page.url.pathname !== '/items');
</script>

<nav class="nav">
  <div class="nav-inner">
    <a href="/items" class="brand" style="text-decoration:none; color:inherit">
      <div class="brand-mark" aria-hidden="true"></div>
      <div class="brand-name">Haku's suitcase</div>
    </a>
    <div class="nav-actions">
      {#if isSecondary}
        <a href="/items" class="btn --ghost" style="gap:6px; padding:8px 14px">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          <span style="font-family:var(--f-mono); font-size:11px; letter-spacing:0.1em">COLLECTION</span>
        </a>
      {:else if data.user}
        {#if data.isDevMode}
          <form method="POST" action="/admin?/logout" style="display:contents">
            <button type="submit" class="btn --ghost" style="font-size:12px; letter-spacing:0.04em">
              ログアウト
            </button>
          </form>
        {:else}
          <a href="/cdn-cgi/access/logout" class="btn --ghost" style="font-size:12px; letter-spacing:0.04em">
            ログアウト
          </a>
        {/if}
      {/if}
    </div>
  </div>
</nav>

{@render children()}

<footer class="site-footer">
  <a href="/items">Collection</a>
  <span>·</span>
  <a href="/about">About</a>
  <span>·</span>
  <a href="/privacy">Privacy Policy</a>
</footer>
<Toaster />
```

`data` の型は `LayoutData`（`+layout.server.ts` が返す `user` と `isDevMode` を含む）。

#### nav CSS 変更（`src/app.css`）

ネガティブマージンのトリックを廃止し、フルワイド背景 + 内側 `max-width` ラッパーに切り替える。

**削除するプロパティ:**
- `margin-left: -40px; margin-right: -40px;`
- `padding-left: 40px; padding-right: 40px;`
- `margin-bottom: 56px;`（ページ側コンテナの padding-top で制御）

**追加するプロパティ:**
- `padding: 12px 40px;`（全幅に対して左右パディング）

**`.nav-inner` を追加（新規クラス）:**
```css
.nav-inner {
  max-width: 1240px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
```

モバイル `@media (max-width: 720px)` の nav:
- `padding: 12px 16px;`（margin の削除、padding のみ）

### C. グローバルフッター（`src/app.css` に `.site-footer` 追加）

```css
.site-footer {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: center;
  padding: 40px 40px 60px;
  font-family: var(--f-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--fg-soft);
}
.site-footer a {
  color: inherit;
  text-decoration: none;
}
.site-footer a:hover {
  color: var(--fg);
}
@media (max-width: 720px) {
  .site-footer { padding: 32px 16px 48px; }
}
```

---

## 各ページの変更内容

### `src/routes/items/+page.svelte`

`<nav class="nav">...</nav>` ブロックを丸ごと削除。`.brand`・`.nav-actions` 内の HTML も含む。

### `src/routes/items/[id]/+page.svelte`

`<nav class="nav" style="margin-bottom: 0">...</nav>` ブロックを削除。

### `src/routes/about/+page.svelte`

- `<nav class="nav" style="margin-bottom: 0">...</nav>` を削除
- `<footer class="page-footer">...</footer>` を削除
- scoped `<style>` の `.page-footer` ルールを削除

### `src/routes/privacy/+page.svelte`

- `<nav class="nav" style="margin-bottom: 0">...</nav>` を削除
- `<footer class="page-footer">...</footer>` を削除
- scoped `<style>` の `.page-footer` ルールを削除

### `src/routes/admin/+page.svelte`

グローバル nav の ← COLLECTION で /items への導線ができるため、以下を削除する:
```html
<a href="/items" style="display: block; margin-top: 16px; ...">← 一覧へ戻る</a>
```

---

## 非対象

- `/items/[id]/+page.svelte` のページ内コンテンツ（詳細ページの既存レイアウト）は変更しない
- `+layout.server.ts` は変更しない（既に `user`・`isDevMode` を返している）
- admin ページの `margin-bottom` などログインフォームのスタイルは変更しない
