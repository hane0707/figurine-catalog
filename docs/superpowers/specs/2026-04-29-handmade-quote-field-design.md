# 自作品「台詞」フィールド — 設計スペック

**日付:** 2026-04-29  
**対象ブランチ:** main  
**ステータス:** 承認済み

---

## 概要

自作品（`isHandmade === 1`）専用の「台詞」フィールドを追加する。
アイテム詳細ページでは、Production セクションより上位に、ダブルクォートで囲んだ大きめのイタリック体ブロックとして表示する。

---

## 要件

- 自作品のみ対象（`isHandmade === 1`）
- 入力値がある場合のみ表示領域を確保する（未入力時は上に詰める）
- 表示時に「台詞」というラベルは出さない——値のみを表示する
- 表示位置は Production セクション（見出し含む）より上、タグリストの下
- 表示スタイル: 大きめフォント、イタリック体、`"..."` で囲む
- 公開設定: `handmadeInfoPublic` フラグに連動する
  - ログインユーザー: 常に表示
  - ゲスト: `isPublic === 1 && handmadeInfoPublic === 1` のときのみ表示

---

## データレイヤー

### schema.ts の変更

`handmadeInfo` テーブルに `quote TEXT` カラムを追加する。

```ts
// src/lib/server/db/schema.ts
export const handmadeInfo = sqliteTable('handmade_info', {
  itemId: text('item_id').primaryKey().references(() => items.id, { onDelete: 'cascade' }),
  productionStart: text('production_start'),
  productionEnd: text('production_end'),
  quote: text('quote'),   // 追加
  notes: text('notes'),
});
```

### ローカル D1 マイグレーション

```sql
ALTER TABLE handmade_info ADD COLUMN quote TEXT;
```

wrangler コマンドで実行:
```
npx wrangler d1 execute DB --local --command="ALTER TABLE handmade_info ADD COLUMN quote TEXT;"
```

---

## APIレイヤー

### PATCH `/api/items/[id]`

`handmadeInfo` の upsert 処理にて `quote` フィールドをホワイトリストに追加する。

```ts
await db.insert(handmadeInfo).values({
  itemId: params.id,
  productionStart: (hi.productionStart as string | null) ?? null,
  productionEnd:   (hi.productionEnd   as string | null) ?? null,
  quote:           (hi.quote           as string | null) ?? null,  // 追加
  notes:           (hi.notes           as string | null) ?? null,
});
```

---

## UIレイヤー

### 表示モード (`+page.svelte`)

タグリストと Production セクションの間に台詞ブロックを挿入する。

```svelte
{#if item.isHandmade === 1 && item.handmadeInfo?.quote &&
     (data.user || (item.isPublic && item.handmadeInfoPublic === 1))}
  <div class="quote-block">
    &ldquo;{item.handmadeInfo.quote}&rdquo;
  </div>
{/if}
```

**スタイル:**

```css
.quote-block {
  font-size: 1.2rem;
  font-style: italic;
  line-height: 1.65;
  color: var(--fg-mute);
}
```

### 編集モード (`+page.svelte`)

**state:**
```ts
let editQuote = $state('');
```

**`startEdit()` に追加:**
```ts
editQuote = item.handmadeInfo?.quote ?? '';
```

**フォーム（制作情報セクション内、Materials フィールドの上に配置）:**
```svelte
<div class="edit-field">
  <label>Quote</label>
  <textarea bind:value={editQuote} placeholder="台詞・印象的なセリフ" rows={2}></textarea>
</div>
```

**`saveEdit()` の `handmadeInfo` ペイロード:**
```ts
body.handmadeInfo = {
  productionStart: editProductionStart || null,
  productionEnd:   editProductionEnd   || null,
  quote:           editQuote           || null,  // 追加
  notes:           editNotes           || null,
};
```

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|---|---|
| `src/lib/server/db/schema.ts` | `handmadeInfo` に `quote` カラム追加 |
| `src/routes/api/items/[id]/+server.ts` | PATCH の handmadeInfo ホワイトリストに `quote` 追加 |
| `src/routes/items/[id]/+page.svelte` | 台詞ブロック表示・編集フィールド追加 |
| ローカル D1 | `ALTER TABLE` でカラム追加 |

---

## 非対象

- 購入品（`isHandmade === 0`）には台詞フィールドを追加しない
- アイテム一覧ページ（`ItemCard`）への表示は対象外
- 新規作成フロー（`/items/new`）は対象外（詳細ページ編集で入力可能）
