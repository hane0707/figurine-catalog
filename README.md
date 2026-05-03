# フィギュアカタログ

フィギュア・置物などのコレクションを写真付きで管理するWebアプリ。

**技術スタック:** SvelteKit 2 + Svelte 5 / Cloudflare Pages + D1 + R2 / Drizzle ORM / shadcn-svelte + Tailwind CSS 4

---

## 主な機能

- **クイック登録** — 写真1枚で即保存、後から詳細を追記
- **5ステップウィザード** — 写真 → 名前 → 購入品/自作品 → 詳細 → タグ
- **コレクション一覧** — グリッド表示・キーワード検索・タグフィルタ・無限スクロール
- **PWA対応** — ホーム画面に追加してアプリのように使える

---

## ローカル開発の事前準備

初回のみ必要な手順です。

> **D1（データベース）はローカルで完結します。** `wrangler dev` が自動でローカル SQLite を作成するため、Cloudflare への D1 作成は不要です。
> **必要なのは R2 の認証情報のみ**（写真のアップロード・表示に使用）。

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. ローカル D1 にマイグレーション適用

```bash
# Cloudflare へのログイン・D1 作成は不要
# .wrangler/state/d1/ 以下にローカル SQLite が自動生成される
npx wrangler d1 migrations apply figurine-catalog-db --local
```

### 3. R2 バケットを作成

```bash
npx wrangler login   # ブラウザでCloudflareにログイン
npx wrangler r2 bucket create figurine-catalog-photos
```

> 既にバケットが存在する場合はスキップ。

### 4. R2 バケットに CORS ポリシーを設定

ブラウザから R2 に直接アップロードするため、CORS の許可が必要です。

```bash
cat > /tmp/cors.json << 'EOF'
{
  "rules": [
    {
      "allowed": {
        "origins": [
          "http://localhost:8788",
          "http://localhost:5173"
        ],
        "methods": ["PUT", "GET"],
        "headers": ["Content-Type", "x-amz-*", "x-id"]
      },
      "exposeHeaders": [],
      "maxAgeSeconds": 3600
    }
  ]
}
EOF
npx wrangler r2 bucket cors set figurine-catalog-photos --file /tmp/cors.json
```

> **本番デプロイ後:** `AllowedOrigins` に本番ドメイン（例：`https://figurine-catalog.pages.dev`）を追加して再適用すること。

### 5. R2 API トークンを取得

[Cloudflare ダッシュボード](https://dash.cloudflare.com/) → R2 → **Manage R2 API Tokens** → **Create API Token**

- Permissions: **Object Read & Write**
- Specify bucket: `figurine-catalog-photos`（または All buckets）

`Access Key ID` と `Secret Access Key` が表示されるのでメモしておく（再表示不可）。

### 6. シークレットファイルを作成

```bash
cp .dev.vars.example .dev.vars
```

`.dev.vars` を開いて実際の値を記入：

```bash
# .dev.vars
CLOUDFLARE_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # ダッシュボード右下に表示
R2_ACCESS_KEY_ID=（手順5で取得）
R2_SECRET_ACCESS_KEY=（手順5で取得）
R2_BUCKET_NAME=figurine-catalog-photos
R2_KEY_PREFIX=dev   # ← ローカルデータを本番と分離するプレフィックス
DEV_ADMIN_EMAIL=local@dev  # ← ローカル疑似認証用メール。セットされていると /admin でログインボタンが使えるようになる（デフォルトは未ログイン状態）
```

> **CLOUDFLARE_ACCOUNT_ID の確認場所:**
> ダッシュボード右サイドバー下部、または URL `https://dash.cloudflare.com/<ここがID>/...`

> **セキュリティ:** `.dev.vars` は `.gitignore` 済みのためコミットされません。また `.claudeignore` に追記済みのため Claude Code からも読み取られません。
>
> **注意:** シェルの `export` は `process.env` に入るため `platform.env`（Cloudflareバインディング）には反映されません。`wrangler pages dev` では `.dev.vars` への記入が唯一の方法です。

---

## 開発サーバー起動

用途に応じて2通りの方法があります。

### ① UIのみ確認（高速・HMRあり）

```bash
npm run dev
```

`http://localhost:5173` で起動。D1/R2バインディングは動作しないため、DBや写真機能は使えない。

### ② D1/R2バインディングあり（本番に近い環境）

```bash
npm run build
npx wrangler pages dev .svelte-kit/cloudflare
```

`http://localhost:8788` で起動。コード変更のたびに再ビルドが必要。

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

**全手順は [`docs/cloudflare-guide.md`](docs/cloudflare-guide.md) を参照。** 以下は概要のみ。

1. `wrangler.toml` の `database_id` が正しく設定されているか確認
2. GitHub リポジトリを作成して push
3. Cloudflare Pages プロジェクトを作成（GitHub 連携）
4. Pages の Settings → Environment variables でシークレットを設定（暗号化）
5. Pages の Settings → Functions で D1・R2 バインディングを設定
6. 本番 D1 にマイグレーション適用
7. Cloudflare Access でアクセス制御を設定
8. JWT 署名検証用の環境変数を設定（推奨）

---

## ルーティング

| パス | 説明 | 認証 |
|------|------|------|
| `/` | トップページ | 不要 |
| `/about` | このアプリについて | 不要 |
| `/privacy` | プライバシーポリシー | 不要 |
| `/items` | コレクション一覧 | 不要（閲覧のみ） |
| `/items/new` | 新規登録ウィザード | 必要 |
| `/items/:id` | アイテム詳細・編集・削除 | 必要 |
| `/admin` | devモード: ログインページ / 本番: `/items` へリダイレクト | devモードのみ不要 |
| `/api/items` POST | アイテム作成 | 必要 |
| `/api/items/:id` PATCH・DELETE | アイテム更新・削除 | 必要 |
| `/api/photos/presign` POST | 署名付きURL発行 | 必要 |
| `/api/photos/:id` DELETE・PATCH | 写真削除・カバー設定 | 必要 |
| `/api/tags` POST | タグ作成 | 必要 |
| `/api/materials` POST | 素材作成 | 必要 |

> **認証の仕組み:** `/items` は誰でも閲覧可能。`/items/new` および `/items/:id` は `locals.user` がない場合 `/admin` へリダイレクト。書き込み系 API はサーバー側で `locals.user` を確認し、未認証なら 401 を返す。`locals.user` は Cloudflare Access の `CF_Authorization` cookie（JWT）から設定される。ローカル開発時は `.dev.vars` の `DEV_ADMIN_EMAIL` がセットされた状態で `/admin` のログインボタンを押すと認証済み扱いになる（`dev_logged_in` クッキーで管理）。

---

## 注意事項

- `git add -A` は `.claude/` のシンボリックリンクでエラーになるため使用不可。`git add src/` などディレクトリ・ファイル指定で代替
- `updatedAt` は SQLite の `ON UPDATE` 非対応のため、PATCH時にアプリ層で手動セット
- `.dev.vars` は絶対にコミットしない（`.gitignore` 済み）
