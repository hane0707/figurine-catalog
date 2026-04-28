# About リンク（hero-meta inline）実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/items` ページの `hero-meta` エリアに About ページへの控えめなインラインリンクを追加する。

**Architecture:** `src/routes/items/+page.svelte` の mono stats テキスト span 内に `<a>` タグを埋め込み、ファイル末尾に `<style>` ブロックを追加してホバー効果を定義する。新規ファイル・コンポーネントは不要。

**Tech Stack:** SvelteKit 5 (Svelte 5 runes), CSS custom properties (`--dur`, `--ease`, `--fg`, `--fg-soft`)

---

### Task 1: HTML を修正して About リンクを追加する

**Files:**
- Modify: `src/routes/items/+page.svelte:186-191`

現在の hero-meta ブロック（約186〜191行目）：

```html
<div class="hero-meta">
  <span class="eyebrow">Now showing</span>
  <span class="mono" style="font-size:11px; color:var(--fg-soft)">
    {data.stats.total} items · {data.stats.handmade} handmade
  </span>
</div>
```

- [ ] **Step 1: mono span にリンクを追加する**

`src/routes/items/+page.svelte` の上記箇所を以下に変更する：

```html
<div class="hero-meta">
  <span class="eyebrow">Now showing</span>
  <span class="mono" style="font-size:11px; color:var(--fg-soft)">
    {data.stats.total} items · {data.stats.handmade} handmade · <a href="/about" class="hero-about-link">このサイトについて →</a>
  </span>
</div>
```

- [ ] **Step 2: ファイル末尾に `<style>` ブロックを追加する**

`src/routes/items/+page.svelte` の末尾（現在 469行目の `{/if}` の後）に追記する：

```svelte
<style>
  .hero-about-link {
    color: inherit;
    text-decoration: none;
    transition: color var(--dur) var(--ease);
  }
  .hero-about-link:hover {
    color: var(--fg);
  }
</style>
```

- [ ] **Step 3: ブラウザで動作確認する**

開発サーバーを起動して `/items` にアクセスし、以下を確認する：

1. `hero-meta` エリアに「42 items · 12 handmade · このサイトについて →」のように表示される
2. 通常時はリンクが stats テキストと同じ `fg-soft` 色で馴染んでいる
3. ホバー時に色が明るい `fg` に変化する（アンダーラインなし）
4. リンクをクリックすると `/about` へ遷移する

```bash
npm run dev
```

- [ ] **Step 4: コミットする**

```bash
git add src/routes/items/+page.svelte
git commit -m "feat: hero-metaにAboutページへの控えめなインラインリンクを追加"
```
