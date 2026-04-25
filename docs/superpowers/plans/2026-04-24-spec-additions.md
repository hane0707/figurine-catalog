# 仕様追加 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修正指示.md「## 仕様追加」の9項目（編集フォーム修正・ナビ改善・UI文言整理・新規ページ・ドキュメント）を実装する

**Architecture:** 既存の SvelteKit 5 + Cloudflare Workers D1 (Drizzle ORM) 構成に対して既存ファイルへの小規模変更（Task 1–5）と新規ルート追加（Task 7–8）を行う。タグのカード表示（Task 6）は items API にバッチ取得ロジックを追加して対応し N+1 を回避する。CSS の sticky nav は app.css の `.nav` を一箇所変更するだけで全ページに適用される。

**Tech Stack:** SvelteKit 5 (Svelte 5 runes), TypeScript, Drizzle ORM, Cloudflare D1 (SQLite), カスタム CSS variables (neumorphism)

---

## File Map

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `src/routes/items/[id]/+page.svelte` | 変更 | 公開チェック条件修正・「手放した」削除 |
| `src/routes/admin/+page.server.ts` | 変更 | ログアウト後リダイレクト先を `/items` に |
| `src/routes/admin/+page.svelte` | 変更 | 「一覧へ戻る」リンク追加 |
| `src/routes/items/+page.svelte` | 変更 | "Made · Met · Kept" テキスト3箇所削除 |
| `src/app.css` | 変更 | `.nav` に sticky + backdrop-filter 追加 |
| `src/routes/api/items/+server.ts` | 変更 | レスポンスにタグ配列をバッチ追加 |
| `src/lib/components/ItemCard.svelte` | 変更 | `tags` プロップ追加・チップ表示 |
| `src/routes/about/+page.svelte` | 新規 | About ページ |
| `src/routes/privacy/+page.svelte` | 新規 | Privacy Policy ページ |
| `docs/google-analytics.md` | 新規 | GA4 導入手順ドキュメント |

---

### Task 1: 編集フォームの公開サブチェック条件修正＋「手放した」削除

**Files:**
- Modify: `src/routes/items/[id]/+page.svelte` (lines 406–423)

- [ ] **Step 1: 公開設定セクションを置き換える**

`src/routes/items/[id]/+page.svelte` の以下のブロックを見つける:

```svelte
<label class="edit-check">
  <input type="checkbox" checked={editIsPublic === 1} onchange={(e) => (editIsPublic = e.currentTarget.checked ? 1 : 0)} />
  このアイテムを公開する
</label>
{#if editIsPublic === 1}
  <label class="edit-check" style="margin-left:16px; color:var(--fg-mute)">
    <input type="checkbox" checked={editPurchaseInfoPublic === 1} onchange={(e) => (editPurchaseInfoPublic = e.currentTarget.checked ? 1 : 0)} />
    購入情報も公開する
  </label>
  <label class="edit-check" style="margin-left:16px; color:var(--fg-mute)">
    <input type="checkbox" checked={editHandmadeInfoPublic === 1} onchange={(e) => (editHandmadeInfoPublic = e.currentTarget.checked ? 1 : 0)} />
    制作情報も公開する
  </label>
{/if}
<label class="edit-check" style="margin-top:6px; color:var(--fg-mute)">
  <input type="checkbox" checked={editStatus === 'parted'} onchange={(e) => (editStatus = e.currentTarget.checked ? 'parted' : 'owned')} />
  手放したアイテムとしてマーク
</label>
```

以下に置き換える（「手放した」ブロックは削除、サブチェックは種別依存に）:

```svelte
<label class="edit-check">
  <input type="checkbox" checked={editIsPublic === 1} onchange={(e) => (editIsPublic = e.currentTarget.checked ? 1 : 0)} />
  このアイテムを公開する
</label>
{#if editIsPublic === 1}
  {#if editIsHandmade === 0}
    <label class="edit-check" style="margin-left:16px; color:var(--fg-mute)">
      <input type="checkbox" checked={editPurchaseInfoPublic === 1} onchange={(e) => (editPurchaseInfoPublic = e.currentTarget.checked ? 1 : 0)} />
      購入情報も公開する
    </label>
  {:else if editIsHandmade === 1}
    <label class="edit-check" style="margin-left:16px; color:var(--fg-mute)">
      <input type="checkbox" checked={editHandmadeInfoPublic === 1} onchange={(e) => (editHandmadeInfoPublic = e.currentTarget.checked ? 1 : 0)} />
      制作情報も公開する
    </label>
  {/if}
{/if}
```

- [ ] **Step 2: 動作確認**

`npm run dev` でサーバー起動後、詳細ページで「編集」をクリックして以下を確認:
- 種別「購入品」+ 公開ON → 「購入情報も公開する」のみ表示
- 種別「自作品」+ 公開ON → 「制作情報も公開する」のみ表示
- 種別未選択 + 公開ON → サブチェックなし
- 「手放したアイテムとしてマーク」が表示されない

- [ ] **Step 3: コミット**

```bash
git add src/routes/items/[id]/+page.svelte
git commit -m "fix: 編集時の公開サブチェックを種別に応じて片方のみ表示し「手放した」チェックを削除"
```

---

### Task 2: ログアウト後のリダイレクト先を `/items` に変更

**Files:**
- Modify: `src/routes/admin/+page.server.ts` (line 21)

- [ ] **Step 1: `logout` アクションのリダイレクト先を変更**

`src/routes/admin/+page.server.ts` の `logout` アクションを以下に変更:

```ts
logout: ({ cookies }) => {
  cookies.delete('dev_logged_in', { path: '/' });
  throw redirect(302, '/items');
},
```

- [ ] **Step 2: 動作確認（dev モード時）**

1. `/admin` でログイン → `/items` へ遷移することを確認
2. 一覧ページのログアウトボタン（`form action="/admin?/logout"`）をクリック
3. `/items` へリダイレクトされることを確認

- [ ] **Step 3: コミット**

```bash
git add src/routes/admin/+page.server.ts
git commit -m "fix: ログアウト後のリダイレクト先を/itemsに変更"
```

---

### Task 3: ログイン画面に「一覧へ戻る」リンクを追加

**Files:**
- Modify: `src/routes/admin/+page.svelte`

- [ ] **Step 1: `<form>` の直後にリンクを追加**

`src/routes/admin/+page.svelte` の `</form>` 閉じタグの直後に追加:

```svelte
<form method="POST" action="?/login">
  <button
    type="submit"
    style="padding: 12px 32px; font-family: inherit; font-size: 12px; letter-spacing: 0.08em; cursor: pointer; border: 1px solid currentColor; background: transparent; color: var(--fg, #1a1a1a);"
  >
    ログインする
  </button>
</form>
<a
  href="/items"
  style="display: block; margin-top: 16px; font-size: 11px; letter-spacing: 0.08em; color: var(--fg-soft, #888); text-decoration: none;"
>
  ← 一覧へ戻る
</a>
```

- [ ] **Step 2: 動作確認**

1. `/admin` を開く（本番環境では自動リダイレクトするため dev モードで確認）
2. 「← 一覧へ戻る」が表示されること
3. クリックで `/items` に遷移すること

- [ ] **Step 3: コミット**

```bash
git add src/routes/admin/+page.svelte
git commit -m "feat: ログイン画面に一覧へ戻るリンクを追加"
```

---

### Task 4: 「Made · Met · Kept」テキストを3箇所削除

**Files:**
- Modify: `src/routes/items/+page.svelte` (lines 87, 106, 129)

- [ ] **Step 1: `<title>` を変更**

```svelte
<!-- before -->
<title>Haku's suitcase — Made · Met · Kept</title>
<!-- after -->
<title>Haku's suitcase</title>
```

- [ ] **Step 2: nav の `brand-sub` を削除**

```svelte
<!-- before -->
<div>
  <div class="brand-name">Haku's suitcase</div>
  <div class="brand-sub">Made · Met · Kept</div>
</div>
<!-- after -->
<div class="brand-name">Haku's suitcase</div>
```

- [ ] **Step 3: ヒーローセクションの eyebrow を削除**

```svelte
<!-- before -->
<div class="eyebrow" style="margin-bottom: 20px">Made · Met · Kept</div>
<h1 class="display hero-title">
<!-- after -->
<h1 class="display hero-title">
```

- [ ] **Step 4: 動作確認**

1. `/items` を開く
2. ブラウザタブが「Haku's suitcase」のみ表示
3. nav の brand に「Made · Met · Kept」がない
4. ヒーローセクションに「Made · Met · Kept」がない

- [ ] **Step 5: コミット**

```bash
git add src/routes/items/+page.svelte
git commit -m "feat: 「Made · Met · Kept」テキストを一覧ページから削除"
```

---

### Task 5: navバーをスクロール固定＋半透明に変更

**Files:**
- Modify: `src/app.css` (lines 106–109)

- [ ] **Step 1: `.nav` に sticky + backdrop-filter を追加**

`src/app.css` の `.nav` ルール（`display: flex; align-items: center;` で始まるブロック）を以下に置き換える:

```css
.nav {
  display: flex; align-items: center;
  justify-content: space-between; margin-bottom: 56px;
  position: sticky; top: 0; z-index: 100;
  margin-left: -40px; margin-right: -40px;
  padding-left: 40px; padding-right: 40px;
  padding-top: 12px; padding-bottom: 12px;
  background: rgba(240, 237, 248, 0.82);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
```

`@media (max-width: 720px)` ブロック内（`.app { padding: 20px 16px 140px; }` の行の近く）に以下を追加:

```css
@media (max-width: 720px) {
  .nav {
    margin-left: -16px; margin-right: -16px;
    padding-left: 16px; padding-right: 16px;
  }
}
```

> **補足:** `.app`（padding: 32px **40px**）と `.detail-page`（padding: 32px **40px**）は水平 padding が同じなので同じ負マージン値を使用する。

- [ ] **Step 2: 動作確認**

1. `/items` を開いてスクロール → nav が上部に固定されること
2. nav 背景が半透明でコンテンツが透けて見えること
3. `/items/[id]` の詳細ページでも同様に動作すること
4. モバイル幅（720px 以下）でレイアウトが崩れないこと

- [ ] **Step 3: コミット**

```bash
git add src/app.css
git commit -m "feat: navバーをスクロール時も固定される半透明スタイルに変更"
```

---

### Task 6: 一覧カードにタグを表示

**Files:**
- Modify: `src/routes/api/items/+server.ts`
- Modify: `src/lib/components/ItemCard.svelte`

- [ ] **Step 1: items API に `tags` のインポートを追加し、バッチ取得ロジックを追加**

`src/routes/api/items/+server.ts` の import 行を変更:

```ts
// before
import { items, photos, itemTags } from '$lib/server/db/schema';
// after
import { items, photos, itemTags, tags } from '$lib/server/db/schema';
```

同ファイルの末尾付近（`itemsWithUrls` 構築の後、`return` の前）を以下に置き換える:

```ts
  // 変更前の return 文を含む最後の2行:
  // return json({ items: itemsWithUrls, offset, limit });
  // ↓ 以下に置き換える

  const itemIds = rows.map((r) => r.id);
  const tagRows = itemIds.length > 0
    ? await db
        .select({ itemId: itemTags.itemId, tagId: tags.id, tagName: tags.name })
        .from(itemTags)
        .innerJoin(tags, eq(itemTags.tagId, tags.id))
        .where(inArray(itemTags.itemId, itemIds))
    : [];

  const tagsByItemId = new Map<string, { id: string; name: string }[]>();
  for (const r of tagRows) {
    if (!tagsByItemId.has(r.itemId)) tagsByItemId.set(r.itemId, []);
    tagsByItemId.get(r.itemId)!.push({ id: r.tagId, name: r.tagName });
  }

  const itemsWithTags = itemsWithUrls.map((item) => ({
    ...item,
    tags: tagsByItemId.get(item.id) ?? [],
  }));

  return json({ items: itemsWithTags, offset, limit });
```

- [ ] **Step 2: `ItemCard.svelte` に `tags` プロップと表示を追加**

`src/lib/components/ItemCard.svelte` 全体を以下に置き換える:

```svelte
<!-- src/lib/components/ItemCard.svelte -->
<script lang="ts">
  let { item, isOwner = false }: {
    item: {
      id: string;
      name: string | null;
      series?: string | null;
      isHandmade?: number | null;
      thumbUrl: string | null;
      isPublic: number;
      status: string;
      createdAt?: string | null;
      tags?: { id: string; name: string }[];
    };
    isOwner?: boolean;
  } = $props();

  const kindLabel = item.isHandmade === 1 ? 'Handmade' : 'Collected';
</script>

<a href="/items/{item.id}" class="card">
  <div class="card-img">
    {#if item.thumbUrl}
      <img src={item.thumbUrl} alt={item.name ?? '名称未設定'} loading="lazy" />
    {:else}
      <div style="width:100%; height:100%; display:grid; place-items:center; font-family:var(--f-display); font-size:40px; opacity:0.2; color:var(--fg)">✦</div>
    {/if}
    {#if item.isHandmade !== undefined && item.isHandmade !== null}
      <div class={'card-badge ' + (item.isHandmade === 1 ? '--handmade' : '--bought')}>
        {kindLabel}
      </div>
    {/if}
    {#if isOwner && item.isPublic === 0}
      <div style="position:absolute; top:8px; right:8px; width:22px; height:22px; border-radius:50%; background:rgba(0,0,0,0.45); display:grid; place-items:center; color:#fff">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
    {/if}
  </div>
  <h3>{item.name ?? '名称未設定'}</h3>
  <p class="card-series">{item.series ?? '—'}</p>
  {#if item.tags && item.tags.length > 0}
    <div class="card-tags">
      {#each item.tags as tag (tag.id)}
        <span class="card-tag">{tag.name}</span>
      {/each}
    </div>
  {/if}
  <div class={'card-meta ' + (item.isHandmade === 1 ? '' : '--haze')}>
    <span>
      <span class="dot"></span>
      {item.isHandmade === 1 ? 'HANDMADE' : item.isHandmade === 0 ? 'COLLECTED' : 'ITEM'}
    </span>
    <span class="mono" style="font-size:10px">{item.createdAt?.slice(0, 10) ?? ''}</span>
  </div>
</a>

<style>
  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 8px;
  }
  .card-tag {
    font-family: var(--f-mono);
    font-size: 9px;
    letter-spacing: 0.06em;
    padding: 2px 8px;
    border-radius: var(--radius-pill);
    background: var(--bg-sunk);
    color: var(--fg-soft);
    box-shadow: var(--neu-inset);
  }
</style>
```

- [ ] **Step 3: 動作確認**

1. `npm run dev` で起動
2. `/items` を開く
3. タグが設定されているアイテムのカードにタグチップが表示されること
4. タグがないアイテムにはチップが表示されないこと
5. DevTools Network タブで `/api/items` レスポンスの各アイテムに `tags: [...]` が含まれること

- [ ] **Step 4: コミット**

```bash
git add src/routes/api/items/+server.ts src/lib/components/ItemCard.svelte
git commit -m "feat: 一覧カードにタグチップを表示"
```

---

### Task 7: About ページを作成

**Files:**
- Create: `src/routes/about/+page.svelte`

- [ ] **Step 1: `src/routes/about/+page.svelte` を作成**

```svelte
<svelte:head>
  <title>About — Haku's suitcase</title>
</svelte:head>

<div class="ambient" aria-hidden="true">
  <div class="blob b1"></div>
  <div class="blob b2"></div>
  <div class="blob b3"></div>
  <div class="amb-ring r1"></div>
  <div class="amb-ring r2"></div>
</div>

<div class="about-page">
  <nav class="nav" style="margin-bottom: 0">
    <a href="/items" class="btn --ghost" style="gap:6px; padding:8px 14px">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      <span style="font-family:var(--f-mono); font-size:11px; letter-spacing:0.1em">COLLECTION</span>
    </a>
  </nav>

  <div class="about-content">
    <div class="eyebrow" style="margin-bottom: 16px">About</div>
    <h1 class="display" style="font-size: clamp(32px, 5vw, 64px); margin-bottom: 32px; line-height: 1.1">
      Haku's suitcase
    </h1>

    <div class="about-body">
      <p>作ったものも、出会ったものも、ここに置いておきます。</p>
      <p>
        リバース:1999の芸術品を二次創作として立体化した作品をはじめ、各地で出会ったお気に入りのフィギュアや購入品まで——私 [haku] が手にしたものたちを、このスーツケースにまとめています。
      </p>
      <p>
        ここにいる間は、神秘学家アルカニスト界で稀有な才能を持つタイムキーパーのスーツケースと同様、雨を気にせずにお過ごしいただけます。どうぞお好きなお部屋でくつろぎながらご鑑賞ください。
      </p>
      <hr />
      <p>
        アルカニスト・人間の方関係なく、またリバース:1999をご存じない方もお楽しみいただけます。
      </p>
      <p>
        なお、リバース:1999に関連する二次創作作品については、当サイトは非公式のファンサイトであり、原作・版権元とは一切関係ありません。
      </p>
    </div>
  </div>

  <footer class="page-footer">
    <a href="/privacy">Privacy Policy</a>
    <span>·</span>
    <a href="/items">← Collection へ戻る</a>
  </footer>
</div>

<style>
  .about-page {
    position: relative; z-index: 1;
    max-width: 720px; margin: 0 auto;
    padding: 32px 40px 120px;
  }
  @media (max-width: 720px) {
    .about-page { padding: 20px 16px 100px; }
  }
  .about-content { margin-top: 48px; }
  .about-body {
    display: flex; flex-direction: column; gap: 16px;
    font-size: 15px; line-height: 1.8; color: var(--fg-mute);
  }
  .about-body p { margin: 0; }
  .about-body hr { border: none; border-top: 1px dashed var(--line); margin: 8px 0; }
  .page-footer {
    margin-top: 64px;
    display: flex; gap: 16px; align-items: center;
    font-family: var(--f-mono); font-size: 11px; letter-spacing: 0.08em; color: var(--fg-soft);
  }
  .page-footer a { color: inherit; text-decoration: none; }
  .page-footer a:hover { color: var(--fg); }
</style>
```

- [ ] **Step 2: 動作確認**

1. `/about` を開く
2. About コンテンツが全文表示されること
3. フッターの「Privacy Policy」リンクで `/privacy` へ遷移すること
4. 「← Collection へ戻る」で `/items` へ遷移すること
5. sticky nav がスクロール時に固定されること

- [ ] **Step 3: コミット**

```bash
git add src/routes/about/+page.svelte
git commit -m "feat: Aboutページを追加"
```

---

### Task 8: Privacy Policy ページを作成

**Files:**
- Create: `src/routes/privacy/+page.svelte`

- [ ] **Step 1: `src/routes/privacy/+page.svelte` を作成**

```svelte
<svelte:head>
  <title>Privacy Policy — Haku's suitcase</title>
</svelte:head>

<div class="ambient" aria-hidden="true">
  <div class="blob b1"></div>
  <div class="blob b2"></div>
  <div class="blob b3"></div>
  <div class="amb-ring r1"></div>
  <div class="amb-ring r2"></div>
</div>

<div class="privacy-page">
  <nav class="nav" style="margin-bottom: 0">
    <a href="/items" class="btn --ghost" style="gap:6px; padding:8px 14px">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      <span style="font-family:var(--f-mono); font-size:11px; letter-spacing:0.1em">COLLECTION</span>
    </a>
  </nav>

  <div class="privacy-content">
    <div class="eyebrow" style="margin-bottom: 16px">Legal</div>
    <h1 class="display" style="font-size: clamp(28px, 4vw, 52px); margin-bottom: 40px; line-height: 1.1">
      Privacy Policy
    </h1>

    <div class="privacy-body">
      <section>
        <h2>アクセス解析ツールについて</h2>
        <p>
          当サイトでは、利用状況の分析にGoogle社が提供するGoogleアナリティクスを使用しています。Googleアナリティクスではトラフィックデータの収集のためにクッキー（Cookie）を使用しております。トラフィックデータは匿名で収集されており、個人を特定するものではありません。
        </p>
        <p>Googleアナリティクスによるデータ収集の仕組みや利用規約については以下をご覧ください。</p>
        <ul>
          <li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Googleポリシーと規約</a></li>
          <li><a href="https://marketingplatform.google.com/about/analytics/terms/jp/" target="_blank" rel="noopener">Googleアナリティクス利用規約</a></li>
        </ul>
      </section>

      <section>
        <h2>免責事項</h2>
        <p>
          当サイトは二次創作ファンサイト、および個人の創作・コレクション記録サイトであり、掲載されている二次創作作品に関わる原作・版権元とは一切関係ありません。当サイトで提供される情報を用いたことによっていかなる損失・損害が発生しても、一切の責任を負いません。
        </p>
        <p>
          当サイトからリンクなどによって他のサイトに移動された場合、移動先サイトで提供される情報、サービス等について一切の責任を負いません。
        </p>
      </section>

      <section>
        <h2>著作権について</h2>
        <p>
          当サイトに掲載した文章・画像等の著作物を無断転載することを禁止します。<br />
          リバース:1999からの引用部、および各作品からのインスパイアによる二次創作物に関わる著作権は原作・版権元に帰属します。
        </p>
        <p>
          一次創作品（オリジナル造形作品等）の著作権は制作者 [haku] に帰属します。
        </p>
      </section>

      <section>
        <h2>リンクポリシー</h2>
        <p>当サイトはリンクフリーです。</p>
      </section>

      <section>
        <h2>お問い合わせについて</h2>
        <p>
          現在当サイトではお問い合わせフォームを設けておりません。<br />
          お問い合わせの際は以下のメールアドレスへご連絡ください。
        </p>
        <p><a href="mailto:haku.craft1205@gmail.com">haku.craft1205@gmail.com</a></p>
      </section>
    </div>
  </div>

  <footer class="page-footer">
    <a href="/about">About</a>
    <span>·</span>
    <a href="/items">← Collection へ戻る</a>
  </footer>
</div>

<style>
  .privacy-page {
    position: relative; z-index: 1;
    max-width: 720px; margin: 0 auto;
    padding: 32px 40px 120px;
  }
  @media (max-width: 720px) {
    .privacy-page { padding: 20px 16px 100px; }
  }
  .privacy-content { margin-top: 48px; }
  .privacy-body {
    display: flex; flex-direction: column; gap: 40px;
    font-size: 14px; line-height: 1.8; color: var(--fg-mute);
  }
  .privacy-body section { display: flex; flex-direction: column; gap: 12px; }
  .privacy-body h2 {
    font-family: var(--f-display); font-size: 18px; font-weight: 400;
    letter-spacing: -0.01em; color: var(--fg); margin: 0;
  }
  .privacy-body p { margin: 0; }
  .privacy-body ul { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 4px; }
  .privacy-body a { color: var(--fg); }
  .privacy-body a:hover { opacity: 0.7; }
  .page-footer {
    margin-top: 64px;
    display: flex; gap: 16px; align-items: center;
    font-family: var(--f-mono); font-size: 11px; letter-spacing: 0.08em; color: var(--fg-soft);
  }
  .page-footer a { color: inherit; text-decoration: none; }
  .page-footer a:hover { color: var(--fg); }
</style>
```

- [ ] **Step 2: 動作確認**

1. `/privacy` を開く
2. 全セクション（アクセス解析・免責事項・著作権・リンクポリシー・お問い合わせ）が表示されること
3. 外部リンク（Google ポリシー等）が `target="_blank"` で開くこと
4. フッターの「About」リンクで `/about` へ、「← Collection へ戻る」で `/items` へ遷移すること

- [ ] **Step 3: コミット**

```bash
git add src/routes/privacy/+page.svelte
git commit -m "feat: Privacy Policyページを追加"
```

---

### Task 9: Google Analytics 4 導入手順ドキュメントを作成

**Files:**
- Create: `docs/google-analytics.md`

- [ ] **Step 1: `docs/google-analytics.md` を作成**

```markdown
# Google Analytics 4 導入手順

## 1. GA4 プロパティの作成

1. [Google Analytics](https://analytics.google.com/) にアクセスしログイン
2. 「管理」→「プロパティを作成」をクリック
3. プロパティ名: `haku-figurine-catalog`（任意）、タイムゾーン: 日本、通貨: 日本円
4. 「次へ」→ ビジネス詳細を入力 →「作成」
5. データストリームで「ウェブ」を選択し、サイトの URL を入力
6. 「測定 ID」（形式: `G-XXXXXXXXXX`）をコピーする

---

## 2. SvelteKit への組み込み

`src/routes/+layout.svelte` の `<svelte:head>` ブロクに以下を追加する。  
`G-XXXXXXXXXX` は手順1で取得した実際の Measurement ID に置き換える。

```html
<svelte:head>
  <!-- Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');
  </script>
</svelte:head>
```

> Measurement ID はソースに直接書いてよい（公開情報であり、シークレットキーではない）。

---

## 3. Cloudflare Pages での注意点

- Cloudflare の「Bot Fight Mode」が有効だと `gtag.js` のリクエストがブロックされる場合がある
- ダッシュボード → Security → Bots → Bot Fight Mode の状態を確認する
- ブロックされる場合は [Cloudflare Web Analytics](https://www.cloudflare.com/web-analytics/)（Cookie 不要のプライバシーファースト代替）も選択肢

---

## 4. 動作確認

1. `npm run build && npm run preview` でビルドを確認
2. Chrome DevTools → Network タブ → `gtag/js` が `200` で返ること
3. GA4 管理画面 → レポート → リアルタイムでアクセスが記録されること（反映まで数分かかる場合あり）

---

## 5. Privacy Policy との関係

`/privacy` ページの「アクセス解析ツールについて」セクションに GA4 の記載が既に含まれている。  
GA4 を有効化する際の追加対応は不要。
```

- [ ] **Step 2: コミット**

```bash
git add docs/google-analytics.md
git commit -m "docs: Google Analytics 4 導入手順を追加"
```

---

## 実装完了チェックリスト

- [ ] Task 1: 編集フォームの公開チェック条件修正・「手放した」削除
- [ ] Task 2: ログアウト後 `/items` リダイレクト
- [ ] Task 3: ログイン画面「一覧へ戻る」リンク
- [ ] Task 4: 「Made · Met · Kept」テキスト削除
- [ ] Task 5: sticky nav + 半透明
- [ ] Task 6: カードにタグチップ表示
- [ ] Task 7: About ページ
- [ ] Task 8: Privacy Policy ページ
- [ ] Task 9: Google Analytics ドキュメント
