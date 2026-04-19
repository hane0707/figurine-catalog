# キャンセル・クリーンアップ機能 設計書

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** アイテム登録ウィザードにキャンセル機能を追加し、写真ゼロのアイテムがDBに残らない構造にする

**Architecture:** アイテム作成をDB操作なしで後ろ倒しにし、最初の写真アップロード成功後に初めてDBへ書き込む。キャンセルボタンはアイテム作成済みの場合のみDELETE APIを呼んでR2とDBを一括削除する。

**Tech Stack:** SvelteKit 2 + Svelte 5 runes / Cloudflare Pages + D1 + R2 / Drizzle ORM

---

## 変更の全体像

影響するファイル：

- `src/routes/items/new/+page.svelte` — ウィザードのメインロジック
- `src/lib/components/PhotoUploader.svelte` — アップロードとエラー分類
- `src/routes/api/items/+server.ts` — POST ハンドラにオプション id を追加

---

## 1. アイテム作成タイミングの後ろ倒し

### 現在の問題

`ensureItem()` は「写真を選ぶ」ボタンを押した時点でDBにアイテムを作成する。写真をアップロードせずに離脱すると写真ゼロのアイテムが残る。

### 変更後の流れ

```
ページ読み込み
  → クライアントで itemId = generateId() を生成（DB操作なし）
  → ユーザーがファイルを選択
  → presign API 呼び出し（itemId を渡すだけ、DB操作なし）
  → R2 へアップロード
  → 成功（初回のみ）: POST /api/items { id: itemId, name: null }
  → 成功（毎回）: POST /api/photos/:photoId { itemId, r2KeyOrig, r2KeyThumb }
```

- `ensureItem()` 関数と `createItemPromise` は削除する
- `itemCreated = $state(false)` フラグを追加し、初回アップロード成功後に `true` にセット
- `showPhotoUploader` フラグは不要になるため削除し、常に PhotoUploader を表示する

### API 変更: POST /api/items

```ts
// リクエストボディ
{ id?: string; name: string | null }

// 処理
const id = body.id ?? generateId();
await db.insert(items).values({ id, name: body.name ?? null, ... });
return json({ id });
```

既存の `generateId()` をサーバー側でも使う。クライアントが id を指定した場合はそれを採用し、指定がなければサーバーで生成する（既存の挙動と後方互換）。

---

## 2. キャンセルボタン

### 配置

全ステップのプログレスバー下部に「✕ キャンセル」ボタンを常時表示する。

### 挙動

| 状態 | 挙動 |
|------|------|
| `itemCreated === false`（写真ゼロ） | 確認なしで `goto('/items')` |
| `itemCreated === true`（写真あり） | 確認ダイアログ「アップロード済みのデータを削除して中断しますか？」→ 確認後 `DELETE /api/items/:id` → `goto('/items')` |

既存の `DELETE /api/items/:id` はR2オブジェクトとDBレコードをまとめて削除する実装になっているため、API変更は不要。

---

## 3. エラー分類と処理

### システム障害系エラー（全ファイルに影響する可能性）

以下の条件に該当する場合はシステム障害と判定する：

- `TypeError`（ネットワーク断、`ERR_FAILED` など）
- HTTP 403（認証・署名エラー）
- HTTP 5xx（R2サーバーエラー）

**挙動：**
- `onSystemError` コールバックを PhotoUploader から親に通知する
- 親コンポーネントはトーストでエラーを表示する（例:「アップロードに失敗しました。設定を確認してください」）
- ウィザードはそのまま留まる（自動遷移なし）
- `itemCreated === false` の場合、DBに何も作成されていないためクリーンアップ不要

### ファイル固有エラー

以下の条件に該当する場合はファイル固有と判定する：

- HTTP 413（ファイルサイズ超過）
- ファイルサイズが **20MB** を超える（クライアントでアップロード前にチェック）

**挙動：**
- そのファイルをスキップし、トーストで通知する（例:「ファイルが大きすぎます（上限20MB）」）
- 他のファイルの処理は続行する
- ウィザードはそのまま留まる

非対応拡張子は `<input accept="image/jpeg,image/png,image/webp">` で制限済みのため、通常このパスには到達しない。

### PhotoUploader の props 変更

```ts
{
  itemId: string;           // 親から渡す（クライアント生成UUID）
  itemCreated: boolean;     // 初回作成済みかどうか
  onUploaded: (photo: {...}, isFirst: boolean) => void;  // isFirst=true のとき親がアイテムを作成する
  onSystemError: () => void; // システム障害系エラー通知
}
```

アイテムの作成処理（`POST /api/items`）は PhotoUploader ではなく親コンポーネントで行う。PhotoUploader は `isFirst: boolean` を `onUploaded` コールバックで渡し、親が判断する。

---

## 4. saveAndFinish の変更

`itemId` はページ読み込み時に生成済みのため、`saveAndFinish` 内での `ensureItem()` 呼び出しは不要になる。ただし `itemCreated === false`（写真なしで完了ボタンを押した場合）のときは `POST /api/items` を呼んでからPATCHする。

---

## 5. 変更しないもの

- `DELETE /api/items/:id` — 変更なし（R2+DB一括削除は実装済み）
- `POST /api/photos/presign` — 変更なし
- `POST /api/photos/:id` — 変更なし
- 編集画面（`/items/:id`）— 変更なし
- `getPresignedGetUrl` などR2ユーティリティ — 変更なし
