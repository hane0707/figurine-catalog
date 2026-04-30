# 入力バリデーション設計

**日付:** 2026-04-30
**ステータス:** 承認済み

---

## 概要

フロントエンドとAPIの両層でZodスキーマによるバリデーションを実装する。攻撃者による不正値送信を防ぎつつ、ユーザーには即時のインラインフィードバックを提供する。

---

## 背景・動機

- `productionStart/End` の前後関係チェックが欠如しており、終了日が開始日より前の値を登録できる
- テキストフィールドに文字数上限がなく、DB・UIへの過大データ投入が可能
- `purchasePrice` に負数・過大値を受け付ける
- 列挙型フィールド（`isHandmade` 等）の検証が一部のみ
- クライアント生成 ID のフォーマット検証が POST /api/items に欠如
- フロントのみでなく API 層でも検証が必要（直接 API アクセスによる攻撃対策）

---

## アーキテクチャ

### スキーマ層

```
src/lib/validation/
  schemas.ts    ← Zod スキーマ（フロント・API 共用）
  errors.ts     ← API エラー文言（汎用化・攻撃者への情報漏洩防止）
```

スキーマはフロント・API の両方から import して使用する。スキーマ変更時は一箇所だけ修正すれば両層に反映される。

---

## フィールド制約一覧

### items テーブル

| フィールド | 型 | 制約 |
|---|---|---|
| `name` | string \| null | null 許可、最大 100 文字 |
| `series` | string \| null | null 許可、最大 100 文字 |
| `isHandmade` | 0 \| 1 \| null | 0, 1, null のみ |
| `isPublic` | 0 \| 1 | 0 または 1 のみ |
| `purchaseInfoPublic` | 0 \| 1 | 0 または 1 のみ |
| `handmadeInfoPublic` | 0 \| 1 | 0 または 1 のみ |
| `status` | string | 'owned' または 'parted' のみ |
| クライアント ID | string | `/^[a-zA-Z0-9_-]+$/`、最大 36 文字 |

### purchase_info テーブル

| フィールド | 型 | 制約 |
|---|---|---|
| `storeName` | string \| null | null 許可、最大 100 文字 |
| `eventName` | string \| null | null 許可、最大 100 文字 |
| `purchaseDate` | string \| null | null 許可、YYYY-MM-DD 形式 |
| `purchasePrice` | number \| null | null 許可、0 以上 100,000,000 以下の整数 |
| `maker` | string \| null | null 許可、最大 100 文字 |
| `artistName` | string \| null | null 許可、最大 100 文字 |

### handmade_info テーブル

| フィールド | 型 | 制約 |
|---|---|---|
| `productionStart` | string \| null | null 許可、YYYY-MM-DD 形式 |
| `productionEnd` | string \| null | null 許可、YYYY-MM-DD 形式 |
| `productionStart ≤ productionEnd` | — | 両方入力時のみ検証 |
| `quote` | string \| null | null 許可、最大 500 文字 |
| `notes` | string \| null | null 許可、最大 2,000 文字 |

### tags / materials テーブル

| フィールド | 型 | 制約 |
|---|---|---|
| `name` | string | 1 文字以上 50 文字以下、前後空白はtrimして評価 |

### 配列フィールド

| フィールド | 制約 |
|---|---|
| `tagIds` | 配列、最大 50 件、各要素は `/^[a-zA-Z0-9_-]+$/` |
| `materialIds` | 配列、最大 50 件、各要素は `/^[a-zA-Z0-9_-]+$/` |

### ページネーション

| フィールド | 制約 |
|---|---|
| `offset` | 0 以上の整数 |
| `limit` | 1 以上 100 以下（既存上限に加えて下限追加） |

---

## API 層の設計

### 汎用エラーレスポンス

攻撃者へのフィールド詳細漏洩を防ぐため、Zod の詳細エラーはサーバーログのみに出力し、レスポンスには含めない。

```typescript
// ✅ レスポンス: 汎用メッセージのみ
{ "code": "VALIDATION_ERROR", "message": "入力値が不正です" }

// ❌ やらない: フィールド名・詳細を外に出す
{ "error": "purchasePrice must be between 0 and 100000000" }
```

HTTP ステータスは `400` を返す。

### 対象エンドポイント

| エンドポイント | 追加するチェック |
|---|---|
| `POST /api/items` | name 文字数、clientId 形式 |
| `PATCH /api/items/[id]` | 全フィールド制約 + 日付前後関係 |
| `POST /api/tags` | name 文字数 |
| `POST /api/materials` | name 文字数 |
| `POST /api/photos/[id]` | itemId 形式、sortOrder 範囲（0 以上） |
| `GET /api/items` | offset 負数チェック |

### バリデーション実装パターン

各エンドポイントで共通のヘルパー関数を使用する:

```typescript
// $lib/validation/errors.ts
export function toApiError(result: z.SafeParseError<unknown>) {
  // サーバーログにのみ詳細を出力
  console.error('[validation]', result.error.flatten());
  // 外部には汎用メッセージのみ
  return error(400, JSON.stringify({ code: 'VALIDATION_ERROR', message: '入力値が不正です' }));
}
```

---

## フロントエンド層の設計

### バリデーションタイミング

| タイミング | 対象 |
|---|---|
| `on-blur`（フォーカス離脱） | フィールド単体の検証（主要ゲート） |
| `on-input`（入力中） | 文字数が上限に近い場合のカウント表示 |
| 保存ボタン押下時 | 全フィールドの一括検証（最終ゲート） |

### エラー表示

- 各フィールドの **直下** に `<p class="field-error">` で表示
- 保存ボタン押下時にエラーがあれば最初のエラーフィールドに自動スクロール
- API が `VALIDATION_ERROR` を返した場合はトーストで「保存できませんでした。入力内容を確認してください」を表示（詳細はインラインエラーで表示済みのため繰り返さない）
- API の 500 系・認証エラーは従来通りトーストのみ

### 日付前後関係の特別処理

`productionEnd` の on-blur 時に `productionStart` との比較を実施:

```
Finished は Started 以降の日付を入力してください
```

### 対象コンポーネント

| コンポーネント | 変更内容 |
|---|---|
| `src/routes/items/new/+page.svelte` | 詳細フィールドに on-blur バリデーション追加 |
| `src/routes/items/[id]/+page.svelte` | 編集フォームに同様のバリデーション追加 |

---

## スコープ外

- 写真ファイルサイズの制限（presign URL は Content-Length ヘッダーをサポートしない R2 の制約あり。別途設計が必要）
- XSS エスケープ（SvelteKit のテンプレートが自動エスケープするため対応不要）
- SQLインジェクション対策（Drizzle ORM の prepared statement で対応済み）

---

## ファイル変更一覧

**新規作成:**
- `src/lib/validation/schemas.ts`
- `src/lib/validation/errors.ts`

**変更:**
- `src/routes/api/items/+server.ts`
- `src/routes/api/items/[id]/+server.ts`
- `src/routes/api/tags/+server.ts`
- `src/routes/api/materials/+server.ts`
- `src/routes/api/photos/[id]/+server.ts`
- `src/routes/api/items/+server.ts`（GET の offset チェック）
- `src/routes/items/new/+page.svelte`
- `src/routes/items/[id]/+page.svelte`
