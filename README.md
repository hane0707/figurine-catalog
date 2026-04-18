# フィギュアカタログ

フィギュア・置物などのコレクションを写真付きで管理するWebアプリ。

**技術スタック:** SvelteKit 2 + Svelte 5 / Cloudflare Pages + D1 + R2 / Drizzle ORM / shadcn-svelte + Tailwind CSS 4

---

## 主な機能

- **クイック登録** — 写真1枚で即保存、後から詳細を追記
- **5ステップウィザード** — 写真 → 名前 → 購入品/自作品 → 詳細 → タグ
- **コレクション一覧** — グリッド表示・キーワード検索・タグフィルタ・無限スクロール
- **公開ページ** (`/p/:id`) — 認証不要で共有可能、公開範囲を細かく制御
- **PWA対応** — ホーム画面に追加してアプリのように使える

---

## ローカル開発の事前準備

初回のみ必要な手順です。

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. Cloudflare にログイン

```bash
npx wrangler login
# ブラウザが開くので許可する
```

### 3. D1 データベースを作成

```bash
npx wrangler d1 create figurine-catalog-db
```

出力に `database_id = "xxxx-xxxx-xxxx"` が表示されるので、`wrangler.toml` を更新：

```toml
# wrangler.toml
database_id = "ここに貼り付ける"
```

### 4. ローカル D1 にマイグレーション適用

```bash
npx wrangler d1 migrations apply figurine-catalog-db --local
```

### 5. R2 バケットを作成

```bash
npx wrangler r2 bucket create figurine-catalog-photos
```

### 6. R2 API トークンを取得

[Cloudflare ダッシュボード](https://dash.cloudflare.com/) → R2 → **Manage R2 API Tokens** → **Create API Token**

- Permissions: **Object Read & Write**
- Specify bucket: `figurine-catalog-photos`（または All buckets）

`Access Key ID` と `Secret Access Key` が表示されるのでメモしておく（再表示不可）。

### 7. シークレットファイルを作成

```bash
cp .dev.vars.example .dev.vars
```

`.dev.vars` を開いて実際の値を記入：

```bash
# .dev.vars
CLOUDFLARE_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # ダッシュボード右下に表示
R2_ACCESS_KEY_ID=（手順6で取得）
R2_SECRET_ACCESS_KEY=（手順6で取得）
R2_BUCKET_NAME=figurine-catalog-photos
R2_KEY_PREFIX=dev   # ← ローカルデータを本番と分離するプレフィックス
```

> **CLOUDFLARE_ACCOUNT_ID の確認場所:**
> ダッシュボード右サイドバー下部、または URL `https://dash.cloudflare.com/<ここがID>/...`

> **セキュリティ:** `.dev.vars` は `.gitignore` 済みのためコミットされません。
> Claude Code に読まれたくない場合は代わりにシェルで export する方法（下記参照）を使用してください。

#### シェルの export を使う方法（より安全）

```bash
export CLOUDFLARE_ACCOUNT_ID="xxxx"
export R2_ACCESS_KEY_ID="xxxx"
export R2_SECRET_ACCESS_KEY="xxxx"
export R2_BUCKET_NAME="figurine-catalog-photos"
export R2_KEY_PREFIX="dev"
npx wrangler dev
```

ターミナルを閉じると消えるため、ファイルに残りません。

---

## 開発サーバー起動

事前準備が完了したら：

```bash
npx wrangler dev
```

ブラウザで `http://localhost:8787` を開く。

> **ローカルのR2データについて:**
> `R2_KEY_PREFIX=dev` を設定することで、アップロードした写真は R2 バケット内の `dev/items/...` 以下に保存され、本番データ（`items/...`）と混在しません。

---

## テスト・型チェック

```bash
npm test          # テスト実行
npm run check     # 型チェック
```

---

## データベース

```bash
# スキーマ変更後にマイグレーションファイル生成
npx drizzle-kit generate

# ローカル D1 にマイグレーション適用
npx wrangler d1 migrations apply figurine-catalog-db --local

# 本番 D1 にマイグレーション適用
npx wrangler d1 migrations apply figurine-catalog-db --remote
```

---

## デプロイ（本番）

詳細な手順は [`docs/cloudflare-guide.md`](docs/cloudflare-guide.md) を参照。

1. `wrangler.toml` の `database_id` が正しく設定されているか確認
2. GitHub リポジトリを作成して push
3. Cloudflare Pages プロジェクトを作成（GitHub 連携）
4. Pages の Settings → Environment variables でシークレットを設定（暗号化）
5. Pages の Settings → Functions で D1・R2 バインディングを設定
6. 本番 D1 にマイグレーション適用
7. Cloudflare Access でアクセス制御を設定（`/items/*`, `/api/*` を保護）

```bash
# 本番 D1 にマイグレーション適用
npx wrangler d1 migrations apply figurine-catalog-db --remote
```

---

## ルーティング

| パス | 説明 | 認証 |
|------|------|------|
| `/items` | コレクション一覧 | 必要 |
| `/items/new` | 新規登録ウィザード | 必要 |
| `/items/:id` | アイテム詳細・編集 | 必要 |
| `/p/:id` | 公開ページ | 不要 |
| `/admin` | `/items` へリダイレクト | 必要 |

> 認証は Cloudflare Access（Google OAuth）でアプリの外側から制御。

---

## 注意事項

- `git add -A` は `.claude/` のシンボリックリンクでエラーになるため使用不可。`git add src/` などディレクトリ・ファイル指定で代替
- `updatedAt` は SQLite の `ON UPDATE` 非対応のため、PATCH時にアプリ層で手動セット
- `.dev.vars` は絶対にコミットしない（`.gitignore` 済み）
