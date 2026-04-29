# 自作品「台詞」フィールド実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 自作品専用の「台詞」フィールドを追加し、アイテム詳細ページの Production セクション上部に大きなイタリック引用文として表示する。

**Architecture:** `handmadeInfo` テーブルに `quote` カラムを追加し、既存の handmadeInfo save/load フローに乗せる。表示は `handmadeInfoPublic` フラグに連動。編集フォームに `Quote` テキストエリアを追加し、詳細ページ表示モードでは Production セクションより上に独立した引用ブロックとして描画する。

**Tech Stack:** SvelteKit 5 (runes)、Drizzle ORM、Cloudflare D1（ローカル wrangler）

---

## ファイルマップ

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `src/lib/server/db/schema.ts` | 修正 | `handmadeInfo` に `quote` カラム追加 |
| `src/routes/api/items/[id]/+server.ts` | 修正 | PATCH の handmadeInfo ホワイトリストに `quote` 追加 |
| `src/routes/items/[id]/+page.svelte` | 修正 | 台詞ブロック表示・編集フィールド追加 |
| ローカル D1 | マイグレーション | `ALTER TABLE handmade_info ADD COLUMN quote TEXT;` |

---

### Task 1: スキーマ更新とローカル DB マイグレーション

**Files:**
- Modify: `src/lib/server/db/schema.ts`

- [ ] **Step 1: `handmadeInfo` テーブルに `quote` カラムを追加する**

`src/lib/server/db/schema.ts` の `handmadeInfo` を以下に変更:

```ts
export const handmadeInfo = sqliteTable('handmade_info', {
  itemId: text('item_id').primaryKey().references(() => items.id, { onDelete: 'cascade' }),
  productionStart: text('production_start'),
  productionEnd: text('production_end'),
  quote: text('quote'),
  notes: text('notes'),
});
```

- [ ] **Step 2: ローカル D1 にカラムを追加する**

```bash
npx wrangler d1 execute DB --local --command="ALTER TABLE handmade_info ADD COLUMN quote TEXT;"
```

期待される出力:
```
🌀 Mapping SQL input into an actionable change
🌀 Let's get to work
✅ Applied 1 migration
```

（wrangler バージョンによって出力は異なるが、エラーがなければ OK）

- [ ] **Step 3: コミット**

```bash
git add src/lib/server/db/schema.ts
git commit -m "feat: handmadeInfoテーブルにquoteカラムを追加"
```

---

### Task 2: API — PATCH ハンドラーに `quote` を追加

**Files:**
- Modify: `src/routes/api/items/[id]/+server.ts`

- [ ] **Step 1: handmadeInfo の insert に `quote` フィールドを追加する**

`src/routes/api/items/[id]/+server.ts` の `handmadeInfo` insert 部分（現在 65〜76行目付近）を以下に変更:

```ts
  if (body.handmadeInfo !== undefined) {
    await db.delete(handmadeInfo).where(eq(handmadeInfo.itemId, params.id));
    if (body.handmadeInfo) {
      const hi = body.handmadeInfo as Record<string, unknown>;
      await db.insert(handmadeInfo).values({
        itemId: params.id,
        productionStart: (hi.productionStart as string | null) ?? null,
        productionEnd:   (hi.productionEnd   as string | null) ?? null,
        quote:           (hi.quote           as string | null) ?? null,
        notes:           (hi.notes           as string | null) ?? null,
      });
    }
  }
```

- [ ] **Step 2: 開発サーバーを起動して型エラーがないことを確認する**

```bash
npm run dev
```

TypeScript エラーが出ないことを確認。ターミナルに `VITE` のポート表示が出れば OK。

- [ ] **Step 3: コミット**

```bash
git add src/routes/api/items/[id]/+server.ts
git commit -m "feat: PATCH handmadeInfoにquoteフィールドを追加"
```

---

### Task 3: UI — 編集モードに `Quote` フィールドを追加

**Files:**
- Modify: `src/routes/items/[id]/+page.svelte`

- [ ] **Step 1: `editQuote` state を追加する**

`+page.svelte` の script ブロック内、`editNotes` の宣言（30行目付近）の直後に追加:

```ts
let editNotes = $state('');
let editQuote = $state('');   // ← 追加
```

- [ ] **Step 2: `startEdit()` に `editQuote` の初期化を追加する**

`startEdit()` 内の `editNotes = ...` の行（51行目付近）の直後に追加:

```ts
    editNotes = item.handmadeInfo?.notes ?? '';
    editQuote = item.handmadeInfo?.quote ?? '';   // ← 追加
```

- [ ] **Step 3: `saveEdit()` の handmadeInfo ペイロードに `quote` を追加する**

`saveEdit()` 内の `body.handmadeInfo = { ... }` ブロック（80〜86行目付近）を以下に変更:

```ts
        body.handmadeInfo = {
          productionStart: editProductionStart || null,
          productionEnd:   editProductionEnd   || null,
          quote:           editQuote           || null,
          notes:           editNotes           || null,
        };
```

- [ ] **Step 4: 編集フォームに Quote テキストエリアを追加する**

`+page.svelte` の編集モード内、制作情報セクション（`{:else if editIsHandmade === 1}` ブロック、384行目付近）で、`Started / Finished` グリッドの直前に挿入:

```svelte
          {:else if editIsHandmade === 1}
            <div class="edit-section">
              <div class="edit-section-title">制作情報</div>
              <div class="edit-field">
                <label>Quote</label>
                <textarea bind:value={editQuote} placeholder="台詞・印象的なセリフ" rows={2}></textarea>
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px">
                <div class="edit-field"><label>Started</label><input type="date" bind:value={editProductionStart} /></div>
                <div class="edit-field"><label>Finished</label><input type="date" bind:value={editProductionEnd} /></div>
              </div>
```

- [ ] **Step 5: コミット**

```bash
git add src/routes/items/[id]/+page.svelte
git commit -m "feat: 編集モードにQuoteフィールドを追加"
```

---

### Task 4: UI — 詳細表示に台詞ブロックを追加

**Files:**
- Modify: `src/routes/items/[id]/+page.svelte`

- [ ] **Step 1: 台詞ブロックを表示モードに追加する**

`+page.svelte` の表示モード内、タグリストの `{/if}` の直後かつ購入情報セクション（`{#if item.isHandmade === 0 ...}`）の直前に挿入:

```svelte
        <!-- 台詞ブロック（自作品かつ quote あり、公開設定に連動） -->
        {#if item.isHandmade === 1 && item.handmadeInfo?.quote &&
             (data.user || (item.isPublic === 1 && item.handmadeInfoPublic === 1))}
          <div class="quote-block">
            &ldquo;{item.handmadeInfo.quote}&rdquo;
          </div>
        {/if}
```

- [ ] **Step 2: `.quote-block` スタイルを追加する**

`+page.svelte` の `<style>` ブロック内（`.page-actions` の定義の下）に追加:

```css
  .quote-block {
    font-size: 1.2rem;
    font-style: italic;
    line-height: 1.65;
    color: var(--fg-mute);
  }
```

- [ ] **Step 3: 開発サーバーで動作確認する**

1. `npm run dev` を起動（起動中なら再起動不要）
2. 自作品のアイテム詳細ページを開く
3. 編集ボタンを押して Quote フィールドにテキストを入力・保存する
4. 保存後、Production セクションの上に `"入力したテキスト"` がイタリック体・大きめフォントで表示されることを確認する
5. Quote フィールドを空にして保存し、台詞エリアが消えて Production セクションが上に詰まることを確認する
6. 購入品のアイテム詳細を開き、Quote フィールドが表示されないことを確認する

- [ ] **Step 4: コミット**

```bash
git add src/routes/items/[id]/+page.svelte
git commit -m "feat: 詳細ページに台詞引用ブロックを表示"
```
