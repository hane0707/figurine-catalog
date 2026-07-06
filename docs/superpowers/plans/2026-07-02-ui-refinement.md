# UI/デザイン全面改善 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 「Haku's suitcase」を、写真体験・タイポグラフィ・配色・細部の詰めすべてで「思わずうなる」水準に引き上げる（調査で洗い出した32項目の改善を16タスクに集約して実装）。

**Architecture:** デザインの実体は `src/app.css` のカスタムCSSトークン（ニューモーフィズム）にあり、Tailwind/shadcnは補助。基盤（トークン・フォント・コントラスト）を先に直し、その上に写真体験（原寸表示・ライトボックス・View Transitions）と演出（チルト・グレイン・スケルトン）を積む。タスクは**この順序で直列に**実行する（多くが `app.css` を触るため並列不可）。

**Tech Stack:** SvelteKit 2 (Svelte 5 runes) / Tailwind CSS 4 / Cloudflare Workers + D1 + R2 / Vitest

## Global Constraints

- ブランチ: `feature/ui-refinement`（現在の `feature/dark-mode` HEAD から作成。Task 1 の Step 0 で作成する）
- コミットメッセージは日本語。末尾に `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` を付ける
- 新規 npm 依存の追加は**禁止**（すべて既存スタックで実装する）
- Svelte 5 runes（`$state` / `$derived` / `$props` / `$effect`）を使う。ストアは既存の `hexControls` のみ
- すべてのアニメーション・演出は `prefers-reduced-motion: reduce` を尊重する（既存の `@media` ブロックや JS ガードのパターンに従う)
- ライトモード・ダークモード（`.dark` クラス、`hexControls.darkMode` 連動）の両方で成立させる
- 各タスク完了時の検証: `npm run check`（svelte-check）と `npm test`（vitest）がエラーゼロであること
- デザイントークン（`--bg`, `--fg`, `--accent-amber` 等）を直接値でハードコードしない。必ず var() 参照
- 既存の視覚署名（GlitchText・六角形アンビエント・インクドロップ・ニューモーフィズム）は**壊さず強化する**

---

### Task 1: デッドコードのトップページ削除＋世界観エラーページ

**Files:**
- Delete: `src/routes/+page.svelte`（`+page.server.ts` が常に `/items` へ 302 リダイレクトするため一切レンダリングされないデッドコード）
- Create: `src/routes/+error.svelte`
- Test: `src/routes/page.server.test.ts`（新規）

**Interfaces:**
- Consumes: `src/routes/+page.server.ts` の `load`（既存・変更しない）
- Produces: なし（終端タスク）

- [ ] **Step 0: 作業ブランチ作成**

```bash
git checkout -b feature/ui-refinement
```

- [ ] **Step 1: リダイレクトのリグレッションテストを書く**

`src/routes/page.server.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { load } from './+page.server';

describe('/ ルート', () => {
  it('/items へ 302 リダイレクトする', () => {
    try {
      // load は引数を使わないため空オブジェクトで十分
      (load as any)({});
      expect.unreachable('redirect が throw されるはず');
    } catch (e: any) {
      expect(e.status).toBe(302);
      expect(e.location).toBe('/items');
    }
  });
});
```

- [ ] **Step 2: テスト実行（PASS することを確認 — 既存挙動の固定）**

Run: `npx vitest run src/routes/page.server.test.ts`
Expected: PASS（リダイレクトは既存実装のため）

- [ ] **Step 3: デッドコードを削除**

```bash
rm src/routes/+page.svelte
```

- [ ] **Step 4: エラーページを作成**

`src/routes/+error.svelte`:

```svelte
<script lang="ts">
  import { page } from '$app/state';
  import GlitchText from '$lib/components/GlitchText.svelte';

  const is404 = $derived(page.status === 404);
</script>

<svelte:head>
  <title>{page.status} — Haku's suitcase</title>
</svelte:head>

<div class="error-page">
  <div class="error-code mono">{page.status}</div>
  <h1 class="display error-title">
    {#if is404}
      <GlitchText
        segments={[
          { text: 'この', small: true },
          { text: 'スーツケース', em: true },
          { text: 'には', breakAfter: true },
          { text: '入っていないようです。' },
        ]}
      />
    {:else}
      <GlitchText
        segments={[
          { text: '雨', large: true, stain: true },
          { text: 'が入り込んだようです。' },
        ]}
      />
    {/if}
  </h1>
  <p class="error-lede">
    {#if is404}
      お探しのものは、別の場所にしまわれているかもしれません。
    {:else}
      少し時間をおいて、もう一度お試しください。
    {/if}
  </p>
  <a href="/items" class="btn --primary">コレクションへ戻る</a>
</div>

<style>
  .error-page {
    position: relative;
    z-index: 1;
    min-height: 70vh;
    max-width: 720px;
    margin: 0 auto;
    padding: 80px 40px 120px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 20px;
  }
  .error-code {
    font-size: 13px;
    letter-spacing: 0.2em;
    color: var(--fg-soft);
  }
  .error-title {
    font-size: clamp(32px, 5.5vw, 64px);
    margin: 0;
  }
  .error-lede {
    color: var(--fg-mute);
    font-size: 15px;
    line-height: 1.7;
    margin: 0 0 12px;
  }
  @media (max-width: 720px) {
    .error-page { padding: 60px 16px 100px; }
  }
</style>
```

- [ ] **Step 5: 検証**

Run: `npm run check && npx vitest run src/routes/page.server.test.ts`
Expected: エラーゼロ / PASS

- [ ] **Step 6: コミット**

```bash
git add -A src/routes/+page.svelte src/routes/+error.svelte src/routes/page.server.test.ts
git commit -m "feat: 世界観に沿ったエラーページを追加し未使用のトップページを削除

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: lang="ja" と theme-color のダークモード連動

**Files:**
- Modify: `src/app.html:2`
- Modify: `src/routes/+layout.svelte:24-32`

**Interfaces:**
- Consumes: `hexControls` ストア（`$hexControls.darkMode: boolean`）
- Produces: なし

- [ ] **Step 1: `src/app.html` の `<html lang="en">` を `<html lang="ja">` に変更**

- [ ] **Step 2: theme-color を darkMode に連動させる**

`src/routes/+layout.svelte` の `$effect`（現在 25-27 行目）を以下に置き換え:

```ts
$effect(() => {
  document.documentElement.classList.toggle('dark', $hexControls.darkMode);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', $hexControls.darkMode ? '#2a292e' : '#e4e1e9');
});
```

`<svelte:head>` 内の `<meta name="theme-color" content="#f0edf8" />` は `content="#e4e1e9"`（`--bg` = oklch(0.90 0.012 285) の近似 hex）に修正して残す（SSR 初期値として機能）。

- [ ] **Step 3: 検証**

Run: `npm run check`
Expected: エラーゼロ。`npm run dev` でダークモード切替時に DevTools で `<meta name="theme-color">` の content が変わること。

- [ ] **Step 4: コミット**

```bash
git add src/app.html src/routes/+layout.svelte
git commit -m "fix: html lang を ja に修正し theme-color をダークモードに連動

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: ヒーローの white-space: nowrap 解除

**Files:**
- Modify: `src/app.css:280-291`（`.hero-title` と `.hero-lede`）

**Interfaces:** なし（改行位置は GlitchText の `breakAfter` セグメントが既に制御している）

- [ ] **Step 1: `.hero-title` から `white-space: nowrap;` を削除**（app.css 283 行目付近）。代わりに `line-break: strict;` を追加。

- [ ] **Step 2: `.hero-lede` から `white-space: nowrap;` を削除**（app.css 290 行目付近）。

- [ ] **Step 3: 検証**

Run: `npm run check`
Expected: エラーゼロ。dev サーバーでビューポート 320px にしてもヒーローが横スクロールしないこと。

- [ ] **Step 4: コミット**

```bash
git add src/app.css
git commit -m "fix: ヒーロー見出しの nowrap を解除し狭幅画面のはみ出しを修正

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: フォント基盤の修正（Inter Variable / 和文明朝 / 擬似イタリック廃止）

**Files:**
- Modify: `src/routes/+layout.svelte:38`（Google Fonts link）
- Modify: `src/app.css:55-58`（フォントトークン）、`src/app.css:150-156`（`.display em`）、`src/app.css:485-496`（`.seg button`）
- Modify: `src/routes/items/+page.svelte:207-226`（統計カードのデルタ文言）

**Interfaces:**
- Produces: `--f-display` に和文明朝フォールバック「Shippori Mincho」が入る。以降のタスクはこれを前提にしてよい。

- [ ] **Step 1: Google Fonts に Shippori Mincho を追加**

`src/routes/+layout.svelte` 38 行目の `<link href="https://fonts.googleapis.com/css2?family=Fraunces:...">` の URL に `&family=Shippori+Mincho:wght@500;600` を追記（`&display=swap` の直前に挿入）。

- [ ] **Step 2: フォントトークンを修正**

`src/app.css` の `--f-display` / `--f-sans` を以下に置き換え:

```css
--f-display: "Fraunces", "Shippori Mincho", "Hiragino Mincho ProN", "Yu Mincho", serif;
--f-sans:
  "Inter Variable", "Hiragino Kaku Gothic ProN", "Yu Gothic", system-ui, sans-serif;
```

（`@fontsource-variable/inter` が登録するファミリー名は "Inter Variable"。現状の "Inter" は不一致で未適用だった）

- [ ] **Step 3: 和文擬似イタリックを廃止**

`.display em`（app.css 150-156 行目）を以下に置き換え。斜体をやめ、色＋わずかな字間で強調する:

```css
.display em {
  font-style: normal;
  font-variation-settings:
    "SOFT" 100,
    "opsz" 144;
  color: var(--accent-amber);
  letter-spacing: 0.01em;
}
```

- [ ] **Step 4: 和文が乗る mono 枠を sans に変更**

`.seg button`（app.css 489 行目）の `font-family: var(--f-mono);` を `font-family: var(--f-sans); font-weight: 500;` に変更（「すべて/購入品/自作品/最新/古い順」は和文のため）。

- [ ] **Step 5: 統計カードのデルタ文言を英語に統一**（mono 枠に和文が混ざる問題の解消）

`src/routes/items/+page.svelte` の統計セクションで:
- `<div class="stat-delta"><span class="dot"></span>自作品</div>` → `…</span>made by hand</div>`
- `<div class="stat-delta"><span class="dot"></span>購入品</div>` → `…</span>found &amp; bought</div>`
- `owned now` と `unique` はそのまま。eyebrow の `COLLECTED` は `Collected` に修正（CSS で大文字化されるため表記を統一）。

- [ ] **Step 6: 検証**

Run: `npm run check`
Expected: エラーゼロ。dev サーバーで (1) ヒーロー和文が明朝（Shippori Mincho）で描画される、(2)「スーツケース」が斜体でなく琥珀色（Task 6 までは紫）になる、(3) 本文が Inter Variable になる（DevTools > Computed > Rendered Fonts で確認）。

- [ ] **Step 7: コミット**

```bash
git add src/routes/+layout.svelte src/app.css src/routes/items/+page.svelte
git commit -m "fix: フォント基盤を修正（Inter Variable適用・和文明朝導入・擬似イタリック廃止）

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: 文字サイズとコントラストの底上げ

**Files:**
- Modify: `src/app.css`（トークン 17-19 行目、`.dark` 1556-1558 行目、および各所の font-size）

**Interfaces:**
- Produces: `--fg-mute` / `--fg-soft` の新しい L 値。以降のタスクはこの値を前提とする。

- [ ] **Step 1: ライトモードの前景トークンを濃くする**

```css
--fg: oklch(0.22 0.014 285);          /* 変更なし */
--fg-mute: oklch(0.45 0.014 285);     /* 0.48 → 0.45 */
--fg-soft: oklch(0.52 0.014 285);     /* 0.62 → 0.52 */
```

- [ ] **Step 2: ダークモードの前景トークンを明るくする**（`.dark` ブロック内）

```css
--fg-mute: oklch(0.70 0.010 285);     /* 0.65 → 0.70 */
--fg-soft: oklch(0.62 0.010 285);     /* 0.52 → 0.62 */
```

- [ ] **Step 3: 極小フォントの引き上げ**（`src/app.css` 内、以下をすべて）

| セレクタ | 現在 | 変更後 |
|---|---|---|
| `.card-badge` | 9px | 10px |
| `.card-meta` | 10px | 11px |
| `.card-series` | 11px | 12px |
| `.stat-delta` | 10px | 11px |
| `.spotlight-tag` | 10px | 11px |
| `.detail-img-panel .overlay-tag` | 10px | 11px |
| `.meta-grid dt` | 10px | 11px |
| `.hex-panel-labels` | 9px | 10px |
| `.chip .count` | 10px | 11px |

`src/lib/components/ItemCard.svelte` の `<style>` 内 `.card-tag` も 9px → 10px に変更。

- [ ] **Step 4: 検証**

Run: `npm run check`
Expected: エラーゼロ。ライト/ダーク両方で eyebrow・card-meta 等の可読性が上がっていること（目視）。

- [ ] **Step 5: コミット**

```bash
git add src/app.css src/lib/components/ItemCard.svelte
git commit -m "fix: 極小フォントの引き上げと前景色コントラストの改善

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: アクセントカラーの琥珀化

**Files:**
- Modify: `src/app.css:24-25`（アクセントトークン）、`src/app.css:1153`（`.field-error`）
- Modify: `src/lib/components/GlitchText.svelte:17-23`（MASK_COLORS）

**Interfaces:**
- Produces: `--accent-amber` が本物の琥珀（hue 70）になる。ダークモードの `--accent-amber-soft` は既に hue 70 なので整合する。

- [ ] **Step 1: ライトモードのアクセントを琥珀に変更**

```css
--accent-amber: oklch(0.58 0.14 70);        /* 旧: oklch(0.52 0.22 285) 紫 */
--accent-amber-soft: oklch(0.92 0.05 80);   /* 旧: oklch(0.93 0.06 285) */
```

- [ ] **Step 2: ダークモードに `--danger` の明度補正を追加**（`.dark` トークンブロック内に追記）

```css
--danger: oklch(0.68 0.16 25);
```

- [ ] **Step 3: `.field-error` の未定義変数を修正**

`color: var(--error, #ef4444);` → `color: var(--danger);`

- [ ] **Step 4: GlitchText のマスク色を琥珀×ヘイズ×ラベンダーの混合に更新**

`src/lib/components/GlitchText.svelte` の `MASK_COLORS` を以下に置き換え:

```ts
const MASK_COLORS = [
  'oklch(0.62 0.14 70 / 0.80)',
  'oklch(0.52 0.15 65 / 0.82)',
  'oklch(0.72 0.12 78 / 0.75)',
  'oklch(0.58 0.10 230 / 0.78)',
  'oklch(0.50 0.12 285 / 0.80)',
];
```

- [ ] **Step 5: 検証**

Run: `npm run check && npm test`
Expected: エラーゼロ。ライトモードで「スーツケース」・バッジ・FAB リング・トグル等が琥珀に変わり、ラベンダーグレー背景と補色関係になること。ダークモードでも破綻しないこと（--accent-amber は共通値、soft は既存の hue 70 のまま）。

- [ ] **Step 6: コミット**

```bash
git add src/app.css src/lib/components/GlitchText.svelte
git commit -m "feat: アクセントカラーを琥珀に変更しトークン名と実色を一致させる

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: shadcn トークンを独自デザインシステムへブリッジ

**Files:**
- Modify: `src/app.css:1477-1510`（`:root` の shadcn トークン）、`src/app.css:1512-1544`（`.dark` の shadcn トークン）

**Interfaces:**
- Consumes: Task 5/6 で確定した `--bg` / `--fg` / `--accent-amber` / `--danger`
- Produces: shadcn 系コンポーネント（Toaster 等）が独自トークンと同じ配色で描画される

- [ ] **Step 1: `:root` の shadcn セマンティックトークンを var() 参照に置き換え**

1477 行目からの `:root` ブロック内で、以下のキーだけを置き換える（`--chart-*`、`--sidebar*`、`--radius` は現状維持）:

```css
--background: var(--bg);
--foreground: var(--fg);
--card: var(--surface);
--card-foreground: var(--fg);
--popover: var(--surface-2);
--popover-foreground: var(--fg);
--primary: var(--fg);
--primary-foreground: var(--bg);
--secondary: var(--surface-2);
--secondary-foreground: var(--fg);
--muted: var(--bg-sunk);
--muted-foreground: var(--fg-mute);
--accent: var(--accent-amber-soft);
--accent-foreground: var(--fg);
--destructive: var(--danger);
--border: var(--line);
--input: var(--line);
--ring: var(--accent-amber);
```

- [ ] **Step 2: `.dark` ブロック（1512-1544 行目）から上記 18 キーの重複定義を削除**

var() は使用時に解決されるため、`.dark` で `--bg` 等が切り替われば shadcn トークンも自動で追従する。`--chart-*` と `--sidebar*` は `.dark` に残す。

- [ ] **Step 3: 検証**

Run: `npm run check && npm run build`
Expected: エラーゼロ。dev サーバーでトースト（アイテム保存時など）が白浮きせず、ライト/ダーク両方で背景・文字色が周囲と馴染むこと。

- [ ] **Step 4: コミット**

```bash
git add src/app.css
git commit -m "refactor: shadcnトークンを独自デザイントークンへブリッジし二重体制を解消

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: 詳細ページの原寸画像表示＋ライトボックス

**Files:**
- Create: `src/lib/components/Lightbox.svelte`
- Modify: `src/routes/items/[id]/+page.svelte`（メイン画像・All Photos グリッド）
- Modify: `src/routes/items/+page.server.ts:18-38`（spotlight に origUrl 追加）
- Modify: `src/routes/items/+page.svelte:170-199`（spotlight の画像を origUrl に）

**Interfaces:**
- Consumes: `[id]/+page.server.ts` が既に返している `photo.origUrl: string`（`:33` で presign 済み・未使用だった）
- Produces: `Lightbox.svelte` — props: `{ photos: { id: string; thumbUrl: string; origUrl: string }[]; index: number (bindable); open: boolean (bindable) }`

- [ ] **Step 1: Lightbox コンポーネントを作成**

`src/lib/components/Lightbox.svelte`:

```svelte
<!-- src/lib/components/Lightbox.svelte -->
<script lang="ts">
  type Photo = { id: string; thumbUrl: string; origUrl: string };
  let {
    photos,
    index = $bindable(0),
    open = $bindable(false),
  }: { photos: Photo[]; index?: number; open?: boolean } = $props();

  let dialogEl: HTMLDialogElement | undefined = $state();
  let loaded = $state(false);
  const current = $derived(photos[index]);

  $effect(() => {
    if (!dialogEl) return;
    if (open && !dialogEl.open) dialogEl.showModal();
    if (!open && dialogEl.open) dialogEl.close();
  });

  $effect(() => {
    // index が変わったらロード状態をリセット
    void index;
    loaded = false;
  });

  function prev() {
    index = (index - 1 + photos.length) % photos.length;
  }
  function next() {
    index = (index + 1) % photos.length;
  }
  function onKeydown(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
  }
  function onBackdropClick(e: MouseEvent) {
    if (e.target === dialogEl) open = false;
  }
</script>

<svelte:window onkeydown={onKeydown} />

<dialog
  class="lightbox"
  bind:this={dialogEl}
  onclose={() => (open = false)}
  onclick={onBackdropClick}
  aria-label="写真の拡大表示"
>
  {#if current}
    <div class="lb-stage">
      <img
        class="lb-img"
        class:--loaded={loaded}
        src={current.origUrl}
        alt=""
        style="background-image: url({current.thumbUrl})"
        onload={() => (loaded = true)}
      />
      {#if !loaded}<div class="lb-spinner mono">LOADING…</div>{/if}
    </div>
    {#if photos.length > 1}
      <button class="lb-nav --prev" onclick={prev} aria-label="前の写真">←</button>
      <button class="lb-nav --next" onclick={next} aria-label="次の写真">→</button>
      <div class="lb-count mono">{index + 1} / {photos.length}</div>
    {/if}
    <button class="lb-close" onclick={() => (open = false)} aria-label="閉じる">×</button>
  {/if}
</dialog>

<style>
  .lightbox {
    border: none;
    padding: 0;
    background: transparent;
    max-width: 100vw;
    max-height: 100vh;
    width: 100vw;
    height: 100vh;
    outline: none;
  }
  .lightbox::backdrop {
    background: oklch(0.12 0.01 285 / 0.88);
    backdrop-filter: blur(10px);
  }
  .lb-stage {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    padding: 48px;
    pointer-events: none;
  }
  .lb-img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 12px;
    background-size: cover;
    background-position: center;
    opacity: 0.4;
    transition: opacity 320ms ease;
    box-shadow: 0 32px 80px oklch(0 0 0 / 0.5);
  }
  .lb-img.--loaded {
    opacity: 1;
    background-image: none !important;
  }
  .lb-spinner {
    position: absolute;
    bottom: 28px;
    left: 50%;
    transform: translateX(-50%);
    color: oklch(1 0 0 / 0.7);
    font-size: 11px;
    letter-spacing: 0.16em;
  }
  .lb-nav,
  .lb-close {
    position: fixed;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1px solid oklch(1 0 0 / 0.25);
    background: oklch(0.2 0.01 285 / 0.6);
    color: oklch(1 0 0 / 0.9);
    font-size: 16px;
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: background 160ms ease;
  }
  .lb-nav:hover,
  .lb-close:hover {
    background: oklch(0.3 0.01 285 / 0.8);
  }
  .lb-nav.--prev { left: 20px; top: 50%; transform: translateY(-50%); }
  .lb-nav.--next { right: 20px; top: 50%; transform: translateY(-50%); }
  .lb-close { top: 20px; right: 20px; }
  .lb-count {
    position: fixed;
    top: 28px;
    left: 50%;
    transform: translateX(-50%);
    color: oklch(1 0 0 / 0.7);
    font-size: 11px;
    letter-spacing: 0.14em;
  }
  @media (max-width: 720px) {
    .lb-stage { padding: 16px; }
    .lb-nav.--prev { left: 8px; }
    .lb-nav.--next { right: 8px; }
  }
</style>
```

- [ ] **Step 2: 詳細ページに組み込む**

`src/routes/items/[id]/+page.svelte`:
1. import 追加: `import Lightbox from '$lib/components/Lightbox.svelte';`
2. 状態追加（`coverPhoto` 定義の近く）:

```ts
let lightboxOpen = $state(false);
let lightboxIndex = $state(0);
function openLightbox(photo: any) {
  const i = item.photos.indexOf(photo);
  lightboxIndex = i >= 0 ? i : 0;
  lightboxOpen = true;
}
```

3. メイン画像 `<img src={selectedPhoto.thumbUrl} …>` を、クリックでライトボックスを開くボタンでラップし、`src` は `selectedPhoto.origUrl` に変更（サムネは背景でプレースホルダ）:

```svelte
<button class="detail-img-btn" onclick={() => openLightbox(selectedPhoto)} aria-label="写真を拡大表示">
  <img
    src={selectedPhoto.origUrl}
    alt={item.name ?? ''}
    style="background-image: url({selectedPhoto.thumbUrl}); background-size: cover; background-position: center"
  />
</button>
```

`<style>` に追加:

```css
.detail-img-btn {
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: none;
  background: none;
  cursor: zoom-in;
}
.detail-img-btn img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  position: relative;
}
```

4. 「All Photos」グリッドの各ボタンの `onclick={() => (selectedPhoto = photo)}` を `onclick={() => openLightbox(photo)}` に変更。
5. テンプレート末尾（`</div>` 閉じの直前）に `<Lightbox photos={item.photos} bind:index={lightboxIndex} bind:open={lightboxOpen} />` を追加。

- [ ] **Step 3: spotlight を原寸画像にする**

`src/routes/items/+page.server.ts` の spotlight クエリに `r2KeyOrig: photos.r2KeyOrig,` を追加し、presign 部を:

```ts
if (spotlightRows[0]) {
  const row = spotlightRows[0];
  const [thumbUrl, origUrl] = await Promise.all([
    getPresignedGetUrl(platform!.env, row.r2KeyThumb),
    getPresignedGetUrl(platform!.env, row.r2KeyOrig),
  ]);
  spotlight = { ...row, thumbUrl, origUrl };
}
```

`src/routes/items/+page.svelte` の spotlight `<img src={data.spotlight.thumbUrl}` を `src={data.spotlight.origUrl}` に変更し、`style="background-image: url({data.spotlight.thumbUrl}); background-size: cover"` を追加。

- [ ] **Step 4: 検証**

Run: `npm run check && npm test`
Expected: エラーゼロ・既存テスト（`page.server.test.ts` 群）PASS。dev サーバーで: 詳細ページのメイン画像がシャープになる／クリックで全画面ライトボックスが開く／← → キーとボタンで巡回できる／ESC・背景クリックで閉じる。

- [ ] **Step 5: コミット**

```bash
git add src/lib/components/Lightbox.svelte "src/routes/items/[id]/+page.svelte" src/routes/items/+page.server.ts src/routes/items/+page.svelte
git commit -m "feat: 詳細ページとspotlightを原寸画像化しライトボックスを追加

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: View Transitions（一覧⇄詳細の画像モーフィング）

**Files:**
- Modify: `src/routes/+layout.svelte`（onNavigate）
- Modify: `src/lib/components/ItemCard.svelte`（view-transition-name）
- Modify: `src/routes/items/[id]/+page.svelte`（view-transition-name）
- Modify: `src/app.css`（トランジション調整 CSS）

**Interfaces:**
- Produces: 命名規則 `item-img-${item.id}`（一覧カードと詳細画像パネルで共有）

- [ ] **Step 1: `+layout.svelte` に onNavigate フックを追加**

`<script>` 内:

```ts
import { onNavigate } from '$app/navigation';

onNavigate((navigation) => {
  if (!document.startViewTransition) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  return new Promise((resolve) => {
    document.startViewTransition(async () => {
      resolve();
      await navigation.complete;
    });
  });
});
```

- [ ] **Step 2: ItemCard の画像枠に view-transition-name を付与**

`src/lib/components/ItemCard.svelte` の `<div class="card-img">` を:

```svelte
<div class="card-img" style="view-transition-name: item-img-{item.id}">
```

- [ ] **Step 3: 詳細ページの画像パネルに同名を付与**

`src/routes/items/[id]/+page.svelte` の `<div class="detail-img-panel">` を:

```svelte
<div class="detail-img-panel" style="view-transition-name: item-img-{item.id}">
```

- [ ] **Step 4: トランジション CSS を app.css に追加**（`/* --- animations --- */` セクションの直前）

```css
/* --- view transitions --- */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 240ms;
  animation-timing-function: var(--ease);
}
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none !important;
  }
}
```

- [ ] **Step 5: 検証**

Run: `npm run check`
Expected: エラーゼロ。Chromium 系ブラウザで一覧カード→詳細へ遷移すると画像がモーフィングする。Firefox 等未対応ブラウザでは通常遷移（progressive enhancement）。

- [ ] **Step 6: コミット**

```bash
git add src/routes/+layout.svelte src/lib/components/ItemCard.svelte "src/routes/items/[id]/+page.svelte" src/app.css
git commit -m "feat: View Transitions APIで一覧と詳細の画像モーフィング遷移を追加

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: spotlight 3Dチルト＋無限スクロール登場アニメ＋GlitchText再訪短縮

**Files:**
- Create: `src/lib/actions/reveal.ts`
- Modify: `src/routes/items/+page.svelte`（spotlight チルト）
- Modify: `src/lib/components/ItemCard.svelte`（use:reveal）
- Modify: `src/lib/components/GlitchText.svelte`（セッション制御）
- Modify: `src/app.css`（.reveal スタイル）

**Interfaces:**
- Produces: `reveal(node: HTMLElement): { destroy(): void }` — IntersectionObserver で `.in` クラスを付与する Svelte action

- [ ] **Step 1: reveal アクションを作成**

`src/lib/actions/reveal.ts`:

```ts
// ビューポート進入時に .in を付与するスクロールリビール用アクション
export function reveal(node: HTMLElement) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    node.classList.add('in');
    return {};
  }
  const io = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        node.classList.add('in');
        io.disconnect();
      }
    },
    { rootMargin: '0px 0px -40px 0px' },
  );
  io.observe(node);
  return { destroy: () => io.disconnect() };
}
```

- [ ] **Step 2: ItemCard に適用**

`src/lib/components/ItemCard.svelte`:

```svelte
<script lang="ts">
  import { reveal } from '$lib/actions/reveal';
  // …既存の props 定義…
</script>

<a href="/items/{item.id}" class="card reveal" use:reveal>
```

- [ ] **Step 3: .reveal スタイルを app.css に追加**（`.rise` 定義の近く）

```css
.reveal {
  opacity: 0;
  transform: translateY(18px);
  transition:
    opacity 640ms var(--ease-out),
    transform 640ms var(--ease-out);
}
.reveal.in {
  opacity: 1;
  transform: none;
}
@media (prefers-reduced-motion: reduce) {
  .reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```

`src/routes/items/+page.svelte` のグリッドコンテナ `<div class="items-grid rise rise-d4">` は `rise rise-d4` を外し `<div class="items-grid">` にする（カード個別リビールと二重にならないように）。リスト表示側のコンテナ `class="rise rise-d4"` も同様に外す。

- [ ] **Step 4: spotlight にマウス追従チルトを実装**

`src/routes/items/+page.svelte` の `<script>` に追加:

```ts
let tiltX = $state(0);
let tiltY = $state(0);
let canHover = $state(false);
onMount(() => {
  canHover = window.matchMedia('(hover: hover)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
});
function handleTilt(e: MouseEvent) {
  if (!canHover) return;
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const px = (e.clientX - rect.left) / rect.width - 0.5;
  const py = (e.clientY - rect.top) / rect.height - 0.5;
  tiltX = py * -7;
  tiltY = px * 9;
}
function resetTilt() {
  tiltX = 0;
  tiltY = 0;
}
```

`.spotlight` の div を以下のようにラップ構造へ変更（float は外側・チルトは内側で transform 競合を回避）:

```svelte
<div
  class="spotlight-frame"
  onmousemove={handleTilt}
  onmouseleave={resetTilt}
  role="presentation"
>
  <div
    class="spotlight"
    style="transform: perspective(900px) rotateX({tiltX}deg) rotateY({tiltY}deg)"
  >
    <!-- 既存の spotlight 内部そのまま -->
  </div>
</div>
```

`app.css` の変更:
- `.spotlight` から `animation: float 6s ease-in-out infinite;` を削除し、`transition: transform 300ms var(--ease-out); transform-style: preserve-3d; will-change: transform;` を追加
- 新規 `.spotlight-frame { animation: float 6s ease-in-out infinite; }` を追加
- `@media (prefers-reduced-motion: reduce)` ブロックの `.spotlight` を `.spotlight-frame` に変更

- [ ] **Step 5: GlitchText の再訪時短縮**

`src/lib/components/GlitchText.svelte` の `onMount` 冒頭を修正:

```ts
onMount(() => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const chars = Array.from(container.querySelectorAll<HTMLElement>('.glitch-ch'));

  if (prefersReduced) {
    chars.forEach(el => { el.style.opacity = '1'; });
    return;
  }

  // 再訪（同一セッション2回目以降）は短縮版：ステインとマスクを省き素早く出す
  const seen = sessionStorage.getItem('glitch-seen');
  if (seen) {
    chars.forEach((el, i) => {
      el.style.transition = 'opacity 260ms ease';
      setTimeout(() => { el.style.opacity = '1'; }, i * 22);
    });
    return;
  }
  sessionStorage.setItem('glitch-seen', '1');

  const BASE = 120;
  const JITTER = 180;
  Promise.all(
    chars.map((el, i) => {
      const delay = i * BASE + rand(-JITTER * 0.3, JITTER);
      return sleep(Math.max(0, delay)).then(() => animateChar(el));
    })
  );
});
```

- [ ] **Step 6: 検証**

Run: `npm run check && npm test`
Expected: エラーゼロ。(1) spotlight がマウスに追従して傾く（タッチ端末・reduced-motion では無効）、(2) スクロールで下のカードが順に立ち上がる、(3) リロード 2 回目はヒーローが素早く表示される。

- [ ] **Step 7: コミット**

```bash
git add src/lib/actions/reveal.ts src/routes/items/+page.svelte src/lib/components/ItemCard.svelte src/lib/components/GlitchText.svelte src/app.css
git commit -m "feat: spotlightチルト・スクロールリビール・GlitchText再訪短縮を追加

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 11: グレインテクスチャ＋スケルトンローディング

**Files:**
- Modify: `src/routes/+layout.svelte`（grain 要素追加）
- Modify: `src/app.css`（.grain / .skel-* スタイル）
- Modify: `src/routes/items/+page.svelte`（LOADING テキスト → スケルトン）

**Interfaces:** なし

- [ ] **Step 1: グレインオーバーレイを追加**

`src/routes/+layout.svelte` の `<InkLayer />` の直後に:

```svelte
<div class="grain" aria-hidden="true"></div>
```

`src/app.css` に追加（`.ambient` セクションの後）:

```css
/* --- grain overlay --- */
.grain {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  opacity: 0.4;
  mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");
}
.dark .grain {
  mix-blend-mode: screen;
  opacity: 0.25;
  filter: invert(1);
}
```

- [ ] **Step 2: スケルトンローディングに置き換え**

`src/routes/items/+page.svelte` の `{#if loading}` ブロック（LOADING... テキスト）を:

```svelte
{#if loading}
  <div class="skel-grid" aria-hidden="true">
    {#each Array(columnCount * 2) as _, i (i)}
      <div class="skel-card" style="animation-delay: {i * 90}ms">
        <div class="skel-img"></div>
        <div class="skel-line"></div>
        <div class="skel-line --short"></div>
      </div>
    {/each}
  </div>
{/if}
```

`src/app.css` に追加（`.card` セクションの後）:

```css
/* --- skeleton --- */
.skel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 24px;
  margin-top: 24px;
}
.skel-card {
  background: var(--surface-raised);
  border-radius: var(--r);
  padding: 14px;
  box-shadow: var(--neu-soft);
  animation: skel-pulse 1.6s ease-in-out infinite;
}
.skel-img {
  aspect-ratio: 4/5;
  border-radius: calc(var(--r) - 6px);
  background: var(--bg-sunk);
  box-shadow: var(--neu-inset);
  margin-bottom: 14px;
}
.skel-line {
  height: 12px;
  border-radius: 6px;
  background: var(--bg-sunk);
  box-shadow: var(--neu-inset);
  margin-bottom: 8px;
}
.skel-line.--short {
  width: 55%;
  margin-bottom: 0;
}
@keyframes skel-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}
@media (prefers-reduced-motion: reduce) {
  .skel-card { animation: none; }
}
```

- [ ] **Step 3: 検証**

Run: `npm run check`
Expected: エラーゼロ。全面に微細な質感が乗る（ライト=乗算・ダーク=スクリーン）。読み込み中はニューモーフィックなスケルトンが明滅する。

- [ ] **Step 4: コミット**

```bash
git add src/routes/+layout.svelte src/app.css src/routes/items/+page.svelte
git commit -m "feat: グレインテクスチャとスケルトンローディングを追加

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 12: フィルタのURL同期＋日付整形ユーティリティ

**Files:**
- Create: `src/lib/utils/date.ts`
- Create: `src/lib/utils/date.test.ts`
- Modify: `src/routes/items/+page.svelte`（URL 同期・日付適用）
- Modify: `src/lib/components/ItemCard.svelte`（日付適用）
- Modify: `src/routes/items/[id]/+page.svelte`（overlay-tag の日付適用）

**Interfaces:**
- Produces: `formatDate(iso: string | null | undefined): string` — `"2026-04-21T…"` → `"2026.04.21"`、null/undefined → `""`

- [ ] **Step 1: 日付ユーティリティのテストを書く**

`src/lib/utils/date.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatDate } from './date';

describe('formatDate', () => {
  it('ISO日時をドット区切りに整形する', () => {
    expect(formatDate('2026-04-21T09:30:00Z')).toBe('2026.04.21');
  });
  it('日付のみの文字列も整形する', () => {
    expect(formatDate('2026-04-21')).toBe('2026.04.21');
  });
  it('null/undefined/空文字は空文字を返す', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('')).toBe('');
  });
  it('不正な形式はそのまま返す', () => {
    expect(formatDate('unknown')).toBe('unknown');
  });
});
```

- [ ] **Step 2: テスト実行（FAIL 確認）**

Run: `npx vitest run src/lib/utils/date.test.ts`
Expected: FAIL（`./date` が存在しない）

- [ ] **Step 3: 実装**

`src/lib/utils/date.ts`:

```ts
/** ISO 8601 日時/日付文字列を「YYYY.MM.DD」に整形する。null系は空文字、不正形式はそのまま返す。 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[1]}.${m[2]}.${m[3]}`;
}
```

- [ ] **Step 4: テスト実行（PASS 確認）**

Run: `npx vitest run src/lib/utils/date.test.ts`
Expected: PASS（4件）

- [ ] **Step 5: 日付表示箇所に適用**

`createdAt?.slice(0, 10)` を `formatDate(item.createdAt)` に置き換える（各ファイルで `import { formatDate } from '$lib/utils/date';` を追加）:
- `src/lib/components/ItemCard.svelte:56`
- `src/routes/items/+page.svelte`（リストビューの日付、400 行目付近）
- `src/routes/items/[id]/+page.svelte`（overlay-tag 内 `item.createdAt?.slice(0, 10)`）

- [ ] **Step 6: フィルタ状態を URL クエリに同期**

`src/routes/items/+page.svelte`:

1. import 追加: `import { replaceState } from '$app/navigation';` と `import { page } from '$app/state';`
2. 初期値を URL から復元（`$state` 宣言を置き換え）:

```ts
let query = $state(page.url.searchParams.get('q') ?? '');
let kindFilter = $state(page.url.searchParams.get('kind') ?? 'all');
let sort = $state(page.url.searchParams.get('sort') ?? 'recent');
let activeTags = $state<string[]>(
  page.url.searchParams.get('tags')?.split(',').filter(Boolean) ?? [],
);
```

3. 同期関数を追加:

```ts
function syncUrl() {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (kindFilter !== 'all') params.set('kind', kindFilter);
  if (sort !== 'recent') params.set('sort', sort);
  if (activeTags.length > 0) params.set('tags', activeTags.join(','));
  const qs = params.toString();
  replaceState(qs ? `?${qs}` : page.url.pathname, {});
}
```

4. `handleSearch` の setTimeout 内・`setKind`・`setSort`・`toggleTag`・タグクリアの各所で `fetchItems(true)` の直前に `syncUrl();` を呼ぶ。

- [ ] **Step 7: 検証**

Run: `npm run check && npm test`
Expected: エラーゼロ・全テスト PASS。dev サーバーで検索・タグ選択すると URL に `?q=…&tags=…` が付き、その URL をリロードすると状態が復元される。日付が `2026.04.21` 形式になる。

- [ ] **Step 8: コミット**

```bash
git add src/lib/utils/date.ts src/lib/utils/date.test.ts src/routes/items/+page.svelte src/lib/components/ItemCard.svelte "src/routes/items/[id]/+page.svelte"
git commit -m "feat: フィルタ状態のURL同期と日付表示の整形を追加

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 13: リストビューのクラス化＋詳細ページ前後ナビ

**Files:**
- Modify: `src/routes/items/+page.svelte`（リストビューのインライン style をクラスへ）
- Modify: `src/routes/items/[id]/+page.server.ts`（前後アイテム ID の取得）
- Modify: `src/routes/items/[id]/+page.svelte`（前後ナビ UI＋キーボード）

**Interfaces:**
- Produces: `[id]/+page.server.ts` の戻り値に `prevId: string | null` / `nextId: string | null` が追加される（作成日時順で前後の閲覧可能アイテム）

- [ ] **Step 1: リストビューをクラス化**

`src/routes/items/+page.svelte` のリスト表示（`{:else}` ブロック内、354-404 行目付近）を以下に置き換え:

```svelte
<div class="row-list">
  {#each items as item (item.id)}
    <a href="/items/{item.id}" class="card row-card reveal" use:reveal>
      <div class="row-thumb">
        {#if item.thumbUrl}
          <img src={item.thumbUrl} alt="" />
        {:else}
          <div class="row-thumb-empty">✦</div>
        {/if}
      </div>
      <div class="row-body">
        <h3>{item.name ?? '名称未設定'}</h3>
        <div class="row-sub mono">
          {item.series ?? '—'} · {item.isHandmade === 1
            ? 'HANDMADE'
            : item.isHandmade === 0
              ? 'COLLECTED'
              : '—'}
        </div>
      </div>
      <div class="row-date mono">{formatDate(item.createdAt)}</div>
    </a>
  {/each}
</div>
```

`<style>` に追加（`use:reveal` は Task 10 の action を import して使う: `import { reveal } from '$lib/actions/reveal';`）:

```css
.row-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.row-card {
  display: grid;
  grid-template-columns: 72px 1fr auto;
  gap: 18px;
  align-items: center;
  padding: 12px;
}
.row-thumb {
  width: 72px;
  height: 72px;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: var(--neu-inset);
  flex-shrink: 0;
}
.row-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.row-thumb-empty {
  width: 100%;
  height: 100%;
  background: var(--bg-sunk);
  display: grid;
  place-items: center;
  font-family: var(--f-display);
  font-size: 24px;
  opacity: 0.25;
  color: var(--fg);
}
.row-body {
  text-align: left;
  overflow: hidden;
}
.row-body h3 {
  margin: 0;
  font-family: var(--f-display);
  font-size: 17px;
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.row-sub {
  font-size: 11px;
  color: var(--fg-soft);
  letter-spacing: 0.05em;
  margin-top: 3px;
}
.row-date {
  font-size: 11px;
  color: var(--fg-soft);
  white-space: nowrap;
}
```

- [ ] **Step 2: 前後アイテム ID をサーバー load に追加**

`src/routes/items/[id]/+page.server.ts` — import に `and, gt, lt, asc, desc` と `sql` を追加し、`return` 直前に:

```ts
const publicFilter = locals.user ? undefined : eq(items.isPublic, 1);
const created = item.createdAt;
const [prevRows, nextRows] = await Promise.all([
  db.select({ id: items.id }).from(items)
    .where(publicFilter ? and(publicFilter, gt(items.createdAt, created)) : gt(items.createdAt, created))
    .orderBy(asc(items.createdAt)).limit(1),
  db.select({ id: items.id }).from(items)
    .where(publicFilter ? and(publicFilter, lt(items.createdAt, created)) : lt(items.createdAt, created))
    .orderBy(desc(items.createdAt)).limit(1),
]);
```

戻り値に `prevId: prevRows[0]?.id ?? null, nextId: nextRows[0]?.id ?? null,` を追加。
（prev = より新しい方 = 一覧で1つ前、next = より古い方。既存テスト `page.server.test.ts` があるため `npm test` で回帰確認すること）

- [ ] **Step 3: 前後ナビ UI とキーボード操作**

`src/routes/items/[id]/+page.svelte`:

1. import: `import { goto } from '$app/navigation';`（既に `invalidateAll` を import している行に追加）
2. キーハンドラ:

```ts
function onNavKeydown(e: KeyboardEvent) {
  if (editing || lightboxOpen) return;
  const t = e.target as HTMLElement;
  if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
  if (e.key === 'ArrowLeft' && data.prevId) goto(`/items/${data.prevId}`);
  if (e.key === 'ArrowRight' && data.nextId) goto(`/items/${data.nextId}`);
}
```

3. `<svelte:window onkeydown={onNavKeydown} />` を追加。
4. `.page-actions` の前（detail-page 冒頭）にナビ行を追加:

```svelte
<div class="detail-nav">
  <a href="/items" class="btn --ghost --sm">← Collection</a>
  <div class="detail-nav-arrows">
    {#if data.prevId}<a href="/items/{data.prevId}" class="btn --ghost --sm" aria-label="前のアイテム">←</a>{/if}
    {#if data.nextId}<a href="/items/{data.nextId}" class="btn --ghost --sm" aria-label="次のアイテム">→</a>{/if}
  </div>
</div>
```

`<style>` に追加:

```css
.detail-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.detail-nav-arrows {
  display: flex;
  gap: 6px;
}
```

- [ ] **Step 4: 検証**

Run: `npm run check && npm test`
Expected: エラーゼロ・既存の `[id]/page.server.test.ts` PASS（load の戻り値追加でモック不足が出たらテスト側の DB モックに `prevId/nextId` クエリ分の応答を追加する）。詳細ページで ← → キーとボタンで前後アイテムに移動できる。

- [ ] **Step 5: コミット**

```bash
git add src/routes/items/+page.svelte "src/routes/items/[id]/+page.server.ts" "src/routes/items/[id]/+page.svelte"
git commit -m "feat: 詳細ページに前後ナビを追加しリストビューをクラス整理

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 14: アクセシビリティ（focus-visible / aria-pressed / バッジ形状マーク）

**Files:**
- Modify: `src/app.css`（グローバル focus-visible、badge-mark）
- Modify: `src/routes/items/+page.svelte`（aria-pressed）
- Modify: `src/lib/components/ItemCard.svelte`（バッジマーク）

**Interfaces:** なし

- [ ] **Step 1: グローバル focus-visible スタイルを追加**（app.css の `/* --- base overrides --- */` セクションに）

```css
:where(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid var(--accent-amber);
  outline-offset: 2px;
  border-radius: 4px;
}
.btn:focus-visible,
.chip:focus-visible,
.seg button:focus-visible,
.fab:focus-visible,
.toggle-chip:focus-visible {
  border-radius: var(--r-pill);
  outline-offset: 1px;
}
.card:focus-visible {
  border-radius: var(--r);
}
```

- [ ] **Step 2: トグル群に aria-pressed を付与**

`src/routes/items/+page.svelte`:
- レイアウト切替 seg（grid/list）の各 button に `aria-pressed={layout === 'grid'}` / `aria-pressed={layout === 'list'}`
- 種別 seg: `aria-pressed={kindFilter === opt.key}`
- ソート seg: `aria-pressed={sort === opt.key}`
- タグ chip: `aria-pressed={activeTags.includes(tag.id)}`

- [ ] **Step 3: バッジに形状マークを追加**（色だけに頼らない区別）

`src/lib/components/ItemCard.svelte` のバッジを:

```svelte
<div class={'card-badge ' + (item.isHandmade === 1 ? '--handmade' : '--bought')}>
  <span class="badge-mark" class:--diamond={item.isHandmade === 1}></span>{kindLabel}
</div>
```

`src/app.css` の `.card-badge` 定義の後に追加:

```css
.badge-mark {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  margin-right: 5px;
  vertical-align: 1px;
}
.badge-mark.--diamond {
  border-radius: 1px;
  transform: rotate(45deg);
}
```

`src/routes/items/+page.svelte` の spotlight-tag と `src/routes/items/[id]/+page.svelte` の overlay-tag は現状のまま（テキストで Handmade/Collected を明示しているため）。

- [ ] **Step 4: 検証**

Run: `npm run check`
Expected: エラーゼロ。Tab キー巡回で全インタラクティブ要素に琥珀のフォーカスリングが見える。バッジに ◆/● マークが付く。

- [ ] **Step 5: コミット**

```bash
git add src/app.css src/routes/items/+page.svelte src/lib/components/ItemCard.svelte
git commit -m "feat: focus-visibleリング・aria-pressed・バッジ形状マークを追加

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 15: OGP・メタ情報

**Files:**
- Modify: `src/routes/+layout.svelte`（デフォルトメタ）
- Modify: `src/routes/items/+page.svelte`（トップ用メタ）
- Modify: `src/routes/items/[id]/+page.svelte`（アイテム用メタ）

**Interfaces:**
- Consumes: `[id]` ページの `coverPhoto`（既存 `$derived`）、items ページの `data.spotlight`

- [ ] **Step 1: レイアウトにデフォルトメタを追加**

`src/routes/+layout.svelte` の `<svelte:head>` に追加:

```svelte
<meta name="description" content="作ったものと、出会ったもの。ハンドメイドフィギュアとコレクションのカタログ — Haku's suitcase" />
<meta property="og:site_name" content="Haku's suitcase" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="apple-touch-icon" href="/favicon.png" />
```

- [ ] **Step 2: トップ（/items）のメタ**

`src/routes/items/+page.svelte` の `<svelte:head>` に追加:

```svelte
<meta property="og:title" content="Haku's suitcase" />
<meta property="og:description" content="ここは雨のあたらない、スーツケースの中。作ったものと、出会ったもの。" />
{#if data.spotlight}
  <meta property="og:image" content={data.spotlight.thumbUrl} />
{/if}
```

- [ ] **Step 3: アイテム詳細のメタ**

`src/routes/items/[id]/+page.svelte` の `<svelte:head>` に追加:

```svelte
<meta property="og:title" content="{displayName} — Haku's suitcase" />
<meta property="og:description" content={item.series ? `${item.series} · ${kindLabel}` : kindLabel} />
{#if coverPhoto}
  <meta property="og:image" content={coverPhoto.thumbUrl} />
{/if}
```

**既知の制約:** og:image の URL は R2 presigned URL のため有効期限がある。クローラは共有時点で取得するため実用上は機能するが、恒久対応（公開プロキシ経由の画像 URL）は本計画のスコープ外とし、コミットメッセージに記録する。

- [ ] **Step 4: 検証**

Run: `npm run check`
Expected: エラーゼロ。`curl -s http://localhost:5173/items | grep og:` で og タグが SSR 出力に含まれる。

- [ ] **Step 5: コミット**

```bash
git add src/routes/+layout.svelte src/routes/items/+page.svelte "src/routes/items/[id]/+page.svelte"
git commit -m "feat: OGP・meta description・apple-touch-iconを追加

注: og:imageはR2署名付きURLのため有効期限あり。恒久対応は別途検討。

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 16: アンビエント背景のスクロール視差

**Files:**
- Modify: `src/routes/+layout.svelte`（scrollY 連動）
- Modify: `src/app.css`（blob に transition 追加済みのため調整のみ）

**Interfaces:**
- Consumes: 既存の `.ambient .blob` / `.amb-ring` DOM 構造

- [ ] **Step 1: scrollY を blob/リングへ視差係数付きで適用**

`src/routes/+layout.svelte`:

```ts
let scrollY = $state(0);
let reducedMotion = $state(false);
onMount(() => {
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
});
```

（`onMount` を svelte から import 追加）

テンプレート:

```svelte
<svelte:window bind:scrollY />
```

ambient 内の要素に視差 style を付与（reduced-motion 時は 0）:

```svelte
<div class="blob b1" style="translate: 0 {reducedMotion ? 0 : scrollY * -0.06}px"></div>
<div class="blob b2" style="translate: 0 {reducedMotion ? 0 : scrollY * 0.04}px"></div>
<div class="blob b3" style="translate: 0 {reducedMotion ? 0 : scrollY * -0.03}px"></div>
```

`amb-ring` 2 つの svg には `style` に `translate: 0 {…}px` を追記（r1: `scrollY * 0.05`、r2: `scrollY * -0.04`。既存の `animation-duration` style と併記）。
※ `transform` は spin アニメーションが使用中のため、干渉しない `translate` プロパティを使う。

- [ ] **Step 2: `.ambient .blob` の `transition: transform 2s var(--ease);` を削除**（app.css 99 行目。スクロール追従が2秒遅延するため）

- [ ] **Step 3: 検証**

Run: `npm run check`
Expected: エラーゼロ。スクロールすると背景の blob と六角形がわずかに異速で流れ、奥行きが出る。回転アニメーションは維持される。

- [ ] **Step 4: コミット**

```bash
git add src/routes/+layout.svelte src/app.css
git commit -m "feat: アンビエント背景にスクロール視差を追加

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## 最終検証（全タスク完了後）

- [ ] `npm run check && npm test && npm run build` がすべて成功
- [ ] dev サーバーで以下をライト/ダーク両モードで目視確認:
  - `/items`: ヒーロー明朝表示・琥珀アクセント・チルト・スケルトン・リビール・グレイン
  - `/items/[id]`: 原寸画像・ライトボックス・前後ナビ・View Transition
  - `/about`・`/privacy`・存在しない URL（エラーページ）
  - 320px 幅でのはみ出しなし
  - キーボードのみでの操作（Tab / ← →）
- [ ] `prefers-reduced-motion: reduce`（DevTools Rendering でエミュレート）で全アニメーションが停止すること
