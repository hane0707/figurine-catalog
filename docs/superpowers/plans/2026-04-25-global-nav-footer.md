# グローバル nav・フッター + nav フェード効果 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** sticky nav をグローバルレイアウトに移動し全ページで統一表示しつつ、nav 下端にグラデーションフェードとグローバルフッターを追加する。

**Architecture:** `src/app.css` で nav をフルワイド化＋フェード追加。`src/routes/+layout.svelte` に nav とフッターを追加。`$app/state` の `page` で pathname を読み `/items` のみログアウトボタン、その他は ← COLLECTION ボタン。各ページから nav / per-page フッター HTML を削除。詳細ページの編集・削除ボタンは `.page-actions` に移動。

**Tech Stack:** SvelteKit 2, Svelte 5 (runes), CSS

---

## ファイル構成

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `src/app.css` | 修正 | `.nav` CSS 更新、`.nav-inner`・`.nav::after`・`.site-footer` 追加 |
| `src/routes/+layout.svelte` | 修正 | nav・フッターを追加 |
| `src/routes/items/+page.svelte` | 修正 | `<nav class="nav">` ブロック削除 |
| `src/routes/items/[id]/+page.svelte` | 修正 | nav を `.page-actions` に変換 |
| `src/routes/about/+page.svelte` | 修正 | nav・フッター削除 |
| `src/routes/privacy/+page.svelte` | 修正 | nav・フッター削除 |
| `src/routes/admin/+page.svelte` | 修正 | 「← 一覧へ戻る」リンク削除 |

---

## Task 1: `src/app.css` — nav フルワイド化 + フェード + site-footer

**Files:**
- Modify: `src/app.css:107-125`

### 背景知識

現在の `.nav` は ネガティブマージン (`margin-left: -40px; margin-right: -40px;`) を使い、`.app` コンテナの padding と相殺して全幅背景を実現している。グローバルレイアウトに移動すると nav はコンテナ外になるため、ネガティブマージン不要になる。代わりに `padding: 12px 40px;` で全幅に対してパディングをかける。内側コンテンツは `.nav-inner` ラッパーで `max-width: 1240px` に収める。

- [ ] **Step 1: `.nav` の CSS を書き換える**

`src/app.css` の107〜125行目を以下に置き換える:

```css
/* --- nav --- */
.nav {
  position: sticky; top: 0; z-index: 100;
  padding: 12px 40px;
  background: color-mix(in oklch, var(--bg) 82%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
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
.nav-inner {
  max-width: 1240px; margin: 0 auto;
  display: flex; align-items: center; justify-content: space-between;
}
@media (max-width: 720px) {
  .nav { padding: 12px 16px; }
}
```

削除されるプロパティ: `display: flex`, `align-items: center`, `justify-content: space-between`, `margin-bottom: 56px`, `margin-left/right: -40px`, `padding-left/right: 40px`, `padding-top/bottom: 12px`（`padding: 12px 40px;` に統合）、旧 `@media` ブロック全体。

- [ ] **Step 2: `.site-footer` を追加する**

`.nav-actions { ... }` の直後（現在143行目）に以下を追加する:

```css
.site-footer {
  display: flex; gap: 16px; align-items: center; justify-content: center;
  padding: 40px 40px 60px;
  font-family: var(--f-mono); font-size: 11px; letter-spacing: 0.08em;
  color: var(--fg-soft);
}
.site-footer a { color: inherit; text-decoration: none; }
.site-footer a:hover { color: var(--fg); }
@media (max-width: 720px) {
  .site-footer { padding: 32px 16px 48px; }
}
```

- [ ] **Step 3: テストを実行して CSS 変更でビルドが壊れていないことを確認する**

```bash
npm test
```

Expected: 52 tests passed（CSS 変更なのでテスト結果に変化なし）

- [ ] **Step 4: コミット**

```bash
git add src/app.css
git commit -m "style: navをフルワイド化しフェード効果とsite-footerを追加"
```

---

## Task 2: `src/routes/+layout.svelte` — グローバル nav・フッターを追加

**Files:**
- Modify: `src/routes/+layout.svelte`

### 背景知識

`+layout.server.ts` がすでに `user` と `isDevMode` を返しているため、layout コンポーネントで `data` として受け取れる。Svelte 5 runes モードでは `$app/state` から `page` をインポートして `page.url.pathname` を直接参照する（`$app/stores` の `$page` とは異なる）。`$derived()` でリアクティブに isSecondary を計算する。

- [ ] **Step 1: `+layout.svelte` を全文書き換える**

```svelte
<script lang="ts">
	import '../app.css';
	import { Toaster } from '$lib/components/ui/sonner';
	import { page } from '$app/state';

	let { children, data } = $props();
	const isSecondary = $derived(page.url.pathname !== '/items');
</script>

<svelte:head>
  <link rel="icon" href="/favicon.svg" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <meta name="theme-color" content="#f0edf8" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,300..700,50..100;1,9..144,300..700,50..100&family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet" />
</svelte:head>

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

- [ ] **Step 2: テストを実行する**

```bash
npm test
```

Expected: 52 tests passed

- [ ] **Step 3: コミット**

```bash
git add src/routes/+layout.svelte
git commit -m "feat: +layout.svelteにグローバルnav・フッターを追加"
```

---

## Task 3: `src/routes/items/+page.svelte` — nav を削除

**Files:**
- Modify: `src/routes/items/+page.svelte:107-128`

### 背景知識

グローバル nav が brand + logout ボタンを表示するため、ページ内の nav は完全に不要。`data.user` による条件分岐もレイアウト側に移っている。

- [ ] **Step 1: nav ブロックを削除する**

107〜128行目の以下のブロックを丸ごと削除する:

```svelte
  <!-- ナビ -->
  <nav class="nav">
    <div class="brand">
      <div class="brand-mark" aria-hidden="true"></div>
      <div class="brand-name">Haku's suitcase</div>
    </div>
    <div class="nav-actions">
      {#if data.user}
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
  </nav>
```

- [ ] **Step 2: テストを実行する**

```bash
npm test
```

Expected: 52 tests passed

- [ ] **Step 3: コミット**

```bash
git add src/routes/items/+page.svelte
git commit -m "refactor: items一覧ページからnavを削除（グローバルnavに移行）"
```

---

## Task 4: `src/routes/items/[id]/+page.svelte` — nav を `.page-actions` に変換

**Files:**
- Modify: `src/routes/items/[id]/+page.svelte:202-221`

### 背景知識

詳細ページの nav には2つの要素がある:
1. ← COLLECTION リンク → グローバル nav に移行済み、削除
2. 編集・削除ボタン（ログイン時のみ）→ `.page-actions` div として残す

`.page-actions` は `detail-page` コンテナ内の最初の要素として、編集・削除ボタンを右揃えで表示する。

- [ ] **Step 1: nav ブロックを `.page-actions` に置き換える**

202〜221行目の以下のブロックを:

```svelte
  <!-- ブレッドクラム + アクション -->
  <nav class="nav" style="margin-bottom: 0">
    <a href="/items" class="btn --ghost" style="gap:6px; padding:8px 14px">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      <span style="font-family:var(--f-mono); font-size:11px; letter-spacing:0.1em">COLLECTION</span>
    </a>
    <div class="nav-actions">
      {#if data.user}
        {#if !editing}
          <button class="btn --ghost --danger" onclick={deleteItem}>削除</button>
          <button class="btn --primary" onclick={startEdit}>編集</button>
        {:else}
          <button class="btn --ghost" onclick={() => (editing = false)}>キャンセル</button>
          <button class="btn --primary" disabled={saving} onclick={saveEdit}>
            {saving ? '保存中...' : '保存'}
          </button>
        {/if}
      {/if}
    </div>
  </nav>
```

以下に置き換える:

```svelte
  <!-- ページアクション（編集・削除） -->
  {#if data.user}
    <div class="page-actions">
      {#if !editing}
        <button class="btn --ghost --danger" onclick={deleteItem}>削除</button>
        <button class="btn --primary" onclick={startEdit}>編集</button>
      {:else}
        <button class="btn --ghost" onclick={() => (editing = false)}>キャンセル</button>
        <button class="btn --primary" disabled={saving} onclick={saveEdit}>
          {saving ? '保存中...' : '保存'}
        </button>
      {/if}
    </div>
  {/if}
```

- [ ] **Step 2: scoped `<style>` に `.page-actions` を追加する**

詳細ページの `<style>` ブロック内に追加する（既存の `.detail-page` ルールの後など）:

```css
.page-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-bottom: 24px;
}
```

- [ ] **Step 3: テストを実行する**

```bash
npm test
```

Expected: 52 tests passed（`page.test.ts` が nav HTML をテストしている場合は失敗する可能性がある。その場合、テスト内の nav 関連アサーションを `.page-actions` に更新する）

- [ ] **Step 4: コミット**

```bash
git add src/routes/items/[id]/+page.svelte
git commit -m "refactor: アイテム詳細ページのnavを削除し編集・削除ボタンをpage-actionsに移動"
```

---

## Task 5: `src/routes/about/+page.svelte` — nav とフッターを削除

**Files:**
- Modify: `src/routes/about/+page.svelte`

- [ ] **Step 1: nav ブロックを削除する**

以下のブロックを削除する（14〜19行目）:

```svelte
  <nav class="nav" style="margin-bottom: 0">
    <a href="/items" class="btn --ghost" style="gap:6px; padding:8px 14px">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      <span style="font-family:var(--f-mono); font-size:11px; letter-spacing:0.1em">COLLECTION</span>
    </a>
  </nav>
```

- [ ] **Step 2: フッターブロックを削除する**

以下のブロックを削除する（45〜49行目）:

```svelte
  <footer class="page-footer">
    <a href="/privacy">Privacy Policy</a>
    <span>·</span>
    <a href="/items">← Collection へ戻る</a>
  </footer>
```

- [ ] **Step 3: scoped `<style>` から `.page-footer` ルールを削除する**

`<style>` ブロック内の以下のルールを削除する:

```css
  .page-footer {
    margin-top: 64px;
    display: flex; gap: 16px; align-items: center;
    font-family: var(--f-mono); font-size: 11px; letter-spacing: 0.08em; color: var(--fg-soft);
  }
  .page-footer a { color: inherit; text-decoration: none; }
  .page-footer a:hover { color: var(--fg); }
```

- [ ] **Step 4: テストを実行する**

```bash
npm test
```

Expected: 52 tests passed

- [ ] **Step 5: コミット**

```bash
git add src/routes/about/+page.svelte
git commit -m "refactor: Aboutページからnavとフッターを削除（グローバルレイアウトに移行）"
```

---

## Task 6: `src/routes/privacy/+page.svelte` — nav とフッターを削除

**Files:**
- Modify: `src/routes/privacy/+page.svelte`

- [ ] **Step 1: nav ブロックを削除する**

以下のブロックを削除する（14〜19行目）:

```svelte
  <nav class="nav" style="margin-bottom: 0">
    <a href="/items" class="btn --ghost" style="gap:6px; padding:8px 14px">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      <span style="font-family:var(--f-mono); font-size:11px; letter-spacing:0.1em">COLLECTION</span>
    </a>
  </nav>
```

- [ ] **Step 2: フッターブロックを削除する**

以下のブロックを削除する（77〜81行目）:

```svelte
  <footer class="page-footer">
    <a href="/about">About</a>
    <span>·</span>
    <a href="/items">← Collection へ戻る</a>
  </footer>
```

- [ ] **Step 3: scoped `<style>` から `.page-footer` ルールを削除する**

`<style>` ブロック内の以下のルールを削除する:

```css
  .page-footer {
    margin-top: 64px;
    display: flex; gap: 16px; align-items: center;
    font-family: var(--f-mono); font-size: 11px; letter-spacing: 0.08em; color: var(--fg-soft);
  }
  .page-footer a { color: inherit; text-decoration: none; }
  .page-footer a:hover { color: var(--fg); }
```

- [ ] **Step 4: テストを実行する**

```bash
npm test
```

Expected: 52 tests passed

- [ ] **Step 5: コミット**

```bash
git add src/routes/privacy/+page.svelte
git commit -m "refactor: Privacy Policyページからnavとフッターを削除（グローバルレイアウトに移行）"
```

---

## Task 7: `src/routes/admin/+page.svelte` — 「← 一覧へ戻る」リンクを削除

**Files:**
- Modify: `src/routes/admin/+page.svelte:18-23`

### 背景知識

グローバル nav が admin ページにも ← COLLECTION ボタンを表示するため、ページ内の「← 一覧へ戻る」リンクは重複する。削除する。

- [ ] **Step 1: リンクを削除する**

以下のブロックを削除する（18〜23行目）:

```svelte
    <a
      href="/items"
      style="display: block; margin-top: 16px; font-size: 11px; letter-spacing: 0.08em; color: var(--fg-soft, #888); text-decoration: none;"
    >
      ← 一覧へ戻る
    </a>
```

- [ ] **Step 2: テストを実行する**

```bash
npm test
```

Expected: 52 tests passed

- [ ] **Step 3: コミット**

```bash
git add src/routes/admin/+page.svelte
git commit -m "refactor: adminページから一覧へ戻るリンクを削除（グローバルnavに移行）"
```

---

## 動作確認

全タスク完了後、ローカルで起動して以下を確認する:

```bash
npm run build && npx wrangler pages dev .svelte-kit/cloudflare
```

確認項目:
- [ ] `/items`: brand ロゴ + ログイン時ログアウトボタン表示。スクロールで nav が固定。
- [ ] `/items`: nav 下端が sharp な線でなくグラデーションでフェードしている
- [ ] `/items/123`: brand ロゴ + ← COLLECTION ボタン表示。編集・削除ボタンはページ上部右寄せで表示。
- [ ] `/about`: brand ロゴ + ← COLLECTION ボタン表示。グローバルフッター表示。
- [ ] `/privacy`: brand ロゴ + ← COLLECTION ボタン表示。グローバルフッター表示。
- [ ] `/admin`: brand ロゴ + ← COLLECTION ボタン表示。グローバルフッター表示。
- [ ] フッターの Collection / About / Privacy Policy リンクが正しく遷移する
