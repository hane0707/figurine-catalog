# /items 一覧ページの公開化 設計書

## 目的

コレクション一覧ページ（`/items`）を未認証ユーザーにも公開する。編集・登録操作は引き続き認証必須。

---

## 認証マップ（変更後）

| ルート | 認証 | 変更 |
|---|---|---|
| `/items` | 不要 | **変更あり**（認証必須 → 公開） |
| `/items/new` | 必要 | **変更あり**（layout 任せ → 個別ガード） |
| `/items/[id]` | 必要 | **変更あり**（layout 任せ → 個別ガード） |
| `/p/[id]` | 不要 | 変更なし |
| `GET /api/items` 等 | 不要 | 変更なし（既存） |
| `POST /api/items` 等 | 必要 | 変更なし（既存） |

---

## アーキテクチャ

### 変更前

```
/items/+layout.server.ts
  └─ locals.user がない → /admin へリダイレクト（全サブルートに適用）
```

### 変更後

```
/items/+layout.server.ts
  └─ ガードなし（ファイル削除）

/items/new/+page.server.ts
  └─ load の先頭: locals.user がない → /admin へリダイレクト

/items/[id]/+page.server.ts
  └─ load の先頭: locals.user がない → /admin へリダイレクト
```

`/items/+page.svelte` のUIは変更不要。FABと登録ボタンは既に `{#if data.user}` で制御されている。

---

## 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `src/routes/items/+layout.server.ts` | **削除** |
| `src/routes/items/new/+page.server.ts` | `load` の先頭に認証ガードを追加 |
| `src/routes/items/[id]/+page.server.ts` | `load` の先頭に認証ガードを追加 |
| `docs/auth.md` | ルート表を更新 |
| `README.md` | ルーティングテーブルと Cloudflare Access パス設定を更新 |

---

## 認証ガードのパターン（page.server.ts 共通）

```ts
export const load: PageServerLoad = async ({ locals, platform, ... }) => {
  if (!locals.user) throw redirect(302, '/admin');
  // ... 既存の処理
};
```

---

## Cloudflare Access ダッシュボード変更

保護パスから `/items` を削除し、`/items/*` のみ維持する。

変更前:
- `https://your-domain.com/items`
- `https://your-domain.com/items/*`
- `https://your-domain.com/api/*`
- `https://your-domain.com/admin`

変更後:
- `https://your-domain.com/items/*`
- `https://your-domain.com/api/*`
- `https://your-domain.com/admin`

---

## テスト方針

- `/items/+layout.server.ts` が削除されるため、既存テスト `layout.server.test.ts` も削除する
- `/items/new` と `/items/[id]` の page.server.test.ts に未認証リダイレクトのケースを追加する
