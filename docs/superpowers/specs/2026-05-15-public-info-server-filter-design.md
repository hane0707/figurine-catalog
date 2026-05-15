# 設計書: purchaseInfo / handmadeInfo のサーバーサイドフィルタリング

Date: 2026-05-15

## 概要

アイテム詳細ページ (`/items/[id]`) において、未ログインユーザーへ `purchaseInfo` / `handmadeInfo` の生データが返ってしまっている問題を修正する。現状はUIレベルで表示を制御しているが、SSR HTMLのページソースに機密データが含まれる。`+page.server.ts` の `load` 関数内でフラグを参照し、サーバー側で null 化する。

## 現状

- `items.purchaseInfoPublic` (integer 0/1): 購入情報の公開フラグ
- `items.handmadeInfoPublic` (integer 0/1): 制作情報の公開フラグ
- `+page.server.ts`: フラグに関わらず常に `purchaseInfo` / `handmadeInfo` を返す
- `+page.svelte`: `quote` のみ `handmadeInfoPublic` で表示制御、他フィールドはノーガード

## 設計

### フィルタリングロジック（`+page.server.ts`）

```
isOwner = !!locals.user

purchaseInfo を返す条件: isOwner OR purchaseInfoPublic === 1
handmadeInfo を返す条件: isOwner OR handmadeInfoPublic === 1
```

`load` 関数内でDBフェッチ後、返却前に以下を適用：

```ts
const isOwner = !!locals.user;
return {
  item: {
    ...item,
    photos: photosWithUrls,
    purchaseInfo: (isOwner || item.purchaseInfoPublic === 1) ? item.purchaseInfo : null,
    handmadeInfo: (isOwner || item.handmadeInfoPublic === 1) ? item.handmadeInfo : null,
  },
  allTags,
  materials: { all: allMaterials, frequent },
};
```

### UIの整理（`+page.svelte`）

サーバー側でフィルタ済みのため、UIの `handmadeInfoPublic` チェックは冗長になる。

変更前（324行目付近）：
```svelte
{#if item.isHandmade === 1 && item.handmadeInfo?.quote &&
     (data.user || (item.isPublic === 1 && item.handmadeInfoPublic === 1))}
```

変更後：
```svelte
{#if item.isHandmade === 1 && item.handmadeInfo?.quote}
```

`purchaseInfo` / `handmadeInfo` の表示ブロックは既に `item.purchaseInfo` / `item.handmadeInfo` が null かどうかで制御されているため追加変更不要。

### テスト（`page.server.test.ts`）

既存テストに以下を追加：

1. 未ログイン + `purchaseInfoPublic === 0` → `item.purchaseInfo` が null
2. 未ログイン + `purchaseInfoPublic === 1` → `item.purchaseInfo` が返る
3. 未ログイン + `handmadeInfoPublic === 0` → `item.handmadeInfo` が null
4. 未ログイン + `handmadeInfoPublic === 1` → `item.handmadeInfo` が返る
5. ログイン済み + `purchaseInfoPublic === 0` → `item.purchaseInfo` が返る（オーナーは常に見える）
6. ログイン済み + `handmadeInfoPublic === 0` → `item.handmadeInfo` が返る

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/routes/items/[id]/+page.server.ts` | load 内でフィルタロジック追加 |
| `src/routes/items/[id]/+page.svelte` | quote ブロックの冗長チェック削除 |
| `src/routes/items/[id]/page.server.test.ts` | フィルタリングのテストケース追加 |

## スコープ外

- `/api/items/[id]` (PATCH/DELETE) は認証必須ガード済みのため対応不要
- リスト API (`/api/items`) は `purchaseInfo`/`handmadeInfo` を返していないため対応不要
