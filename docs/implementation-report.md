# フィギュアカタログ 実装報告書

> 作成日: 2026-04-17

---

## 概要

SvelteKit 2 + Cloudflare Pages/D1/R2 スタックでフィギュア・置物のコレクション管理Webアプリを実装した。22タスク、37コミット。テスト 5/5 パス。

---

## タスク一覧と実施内容

| # | タスク | 主な作業内容 |
|---|--------|------------|
| 1 | SvelteKitプロジェクト初期化 | `@sveltejs/adapter-cloudflare` 設定、`src/app.d.ts` で Cloudflare Platform 型定義 |
| 2 | Tailwind CSS + shadcn-svelte セットアップ | shadcn-svelte v1.2.7 (style: vega / color: zinc)、ModeWatcher による prefers-color-scheme 対応 |
| 3 | Drizzle スキーマ定義 | 8テーブル定義（items / photos / purchaseInfo / handmadeInfo / tags / itemTags / materials / itemMaterials）+ リレーション定義 |
| 4 | D1 マイグレーション生成・適用 | drizzle-kit generate → `migrations/0000_silent_roughhouse.sql`、17種の素材プリセット |
| 5 | DB クライアント初期化 | `src/lib/server/db/index.ts` — `getDb(d1)` ヘルパー |
| 6 | UUID ユーティリティ | `src/lib/utils/uuid.ts` — `crypto.randomUUID()` ラッパー |
| 7 | 画像リサイズユーティリティ | `src/lib/utils/image.ts` — Canvas API でクライアントサイドリサイズ → WebP 85% quality |
| 8 | R2 ヘルパー | `src/lib/server/r2.ts` — AWS SDK S3 互換で presigned PUT/GET URL 生成・オブジェクト削除 |
| 9 | アイテム作成・一覧 API | `GET /api/items`（検索・タグフィルタ・無限スクロール・thumbUrl付き）、`POST /api/items` |
| 10 | アイテム詳細・更新・削除 API | `GET/PATCH/DELETE /api/items/:id`、購入情報・制作情報・タグ・素材の upsert |
| 11 | 写真 presign + 登録・削除 API | `POST /api/photos/presign`、`POST/DELETE /api/photos/:id`、カバー写真自動設定 |
| 12 | タグ・素材 API | `GET/POST /api/tags`、`GET/POST /api/materials`（頻出6件 + 全件） |
| 13 | TagPicker コンポーネント | インクリメンタル検索・新規作成・トグル選択、Svelte 5 `$bindable()` |
| 14 | PhotoUploader コンポーネント | presign → クライアントリサイズ → 並列R2 PUT → DB登録、3回リトライ（指数バックオフ） |
| 15 | ItemCard コンポーネント | 3:4比カード、カバー写真、「名称未設定」フォールバック、手放し済みバッジ |
| 16 | コレクション一覧ページ（/items） | 無限スクロール（IntersectionObserver）、キーワード検索（デバウンス300ms）、タグフィルタ |
| 17 | クイック登録ウィザード（/items/new） | 5ステップウィザード（photo→basic→type→details→tags）、購入品/自作品分岐 |
| 18 | アイテム詳細・インライン編集（/items/:id） | 閲覧モード/編集モード切替、公開設定UI（isPublic・purchaseInfoPublic・handmadeInfoPublic）、削除 |
| 19 | 公開ページ（/p/:id） | 認証不要、isPublicチェック、purchaseInfoPublic/handmadeInfoPublicによる情報フィルタリング |
| 20 | 管理トップ・ルートページ | `/` と `/admin` をサーバーサイド302リダイレクト → `/items` |
| 21 | PWA 設定 | `static/manifest.webmanifest`、レイアウトへのメタタグ追加（theme-color / apple-mobile-web-app） |
| 22 | Cloudflare Pages デプロイ設定 | `wrangler.toml` 設定済み（database_id はユーザーが要更新）、手順は後述 |

---

## 試行錯誤・トラブルシューティング

### Svelte 4 → Svelte 5 runes変換
実装計画書は Svelte 4 記法で書かれていたが、プロジェクトは Svelte 5 を使用。全コンポーネント・ページで以下の変換が必要だった：

| Svelte 4 | Svelte 5 runes |
|----------|---------------|
| `export let data` | `let { data } = $props()` |
| `let x = value` | `let x = $state(value)` |
| `$: expr` | `let x = $derived(expr)` |
| `on:click={fn}` | `onclick={fn}` |
| `on:input`, `on:change` | `oninput`, `onchange` |

### `git add -A` が使えない
`.claude/` ディレクトリにシンボリックリンクが含まれており、`git add -A` が exit code 128 で失敗する。以降はファイル名を明示した `git add path/to/file` で対応。

### shadcn-svelte v1.2.7 のスタイル名変更
- `"default"` → `"vega"` （style）
- `"slate"` → `"zinc"` （color）

### `git add -A` が使えない
`.claude/` ディレクトリにシンボリックリンクが含まれており、`git add -A` が失敗。ファイルを個別指定するか `git add src/` のようにディレクトリ指定で回避。

### Drizzle リレーション定義の漏れ
Task 10 (アイテム詳細API) で `db.query.items.findFirst({ with: {...} })` を使おうとした際、`relations()` 定義がないとエラーになることが判明。スキーマに8テーブル分のリレーションを追加した。

### PhotoUploader の itemId 制約
`PhotoUploader` コンポーネントは `itemId: string`（非null）が必須。ウィザードの photoステップでは先にアイテムを作成してから表示する必要があった。`showPhotoUploader = $state(false)` フラグで制御。

### Cloudflare Workers 内での self-request 不可
サーバーロード関数内から `/api/materials` を `fetch()` する実装は Cloudflare Workers では動作しない。DB を直接クエリするよう変更。

### タグ・素材がDBに保存されない（最終レビューで発見）
PATCH ハンドラが `tagIds`/`materialIds` を受け取っても無視していた。最終コードレビューで発見し、`itemTags`/`itemMaterials` への delete & insert を追加。

### mass assignment 脆弱性（最終レビューで発見）
`purchaseInfo`/`handmadeInfo` をそのまま `...spread` していたため、リクエストボディで任意のフィールドを上書きできる状態だった。各フィールドを明示的にホワイトリスト化して修正。

---

## 今後必要な作業

### 必須（デプロイ前に行うこと）

1. **GitHub リポジトリ作成・push**
   ```bash
   git remote add origin https://github.com/<YOUR_USERNAME>/figurine-catalog.git
   git push -u origin main
   ```

2. **Cloudflare D1 データベース作成**
   ```bash
   npx wrangler login
   npx wrangler d1 create figurine-catalog-db
   # 表示された database_id を wrangler.toml の REPLACE_AFTER_CREATION に記入
   ```

3. **wrangler.toml の database_id 更新**
   `wrangler.toml` の `database_id = "REPLACE_AFTER_CREATION"` を実際のIDに変更してコミット

4. **本番D1にマイグレーション適用**
   ```bash
   npx wrangler d1 migrations apply figurine-catalog-db --remote
   ```

5. **R2 バケット作成**
   ```bash
   npx wrangler r2 bucket create figurine-catalog-photos
   ```

6. **R2 API キーの取得と secret 設定**
   Cloudflare ダッシュボード → R2 → Manage R2 API Tokens → APIトークン作成
   ```bash
   npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
   npx wrangler secret put R2_ACCESS_KEY_ID
   npx wrangler secret put R2_SECRET_ACCESS_KEY
   ```

7. **Cloudflare Pages プロジェクト作成**
   Cloudflare ダッシュボード → Pages → Create a project → GitHub 連携
   - Build command: `npm run build`
   - Build output: `.svelte-kit/cloudflare`
   - D1 binding: `DB` → `figurine-catalog-db`
   - R2 binding: `R2` → `figurine-catalog-photos`
   - 環境変数: `R2_BUCKET_NAME`, `CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`

8. **Cloudflare Access 設定（認証）**
   Cloudflare Zero Trust → Access → Applications → Add
   - Protected paths: `/items/*`, `/admin/*`, `/api/*`
   - Policy: Email → 自分のメールアドレス
   - `/p/*` は保護しない（公開ページ）

### 将来的に欲しい機能

- 写真のドラッグ&ドロップ並び替え（`svelte-dnd-action` は既にインストール済み）
- アイテム詳細から購入情報・制作情報の編集（ウィザード呼び出し）
- タグフィルタの OR 絞り込み UI（API は対応済み、UI 未実装）
- 写真ギャラリービュー（複数写真を大きく見たい場合）
- PWA プッシュ通知 / オフライン対応（Service Worker）

---

## ファイルツリーと説明

```
figurine-catalog/
├── migrations/
│   └── 0000_silent_roughhouse.sql   # D1 スキーマ + 素材プリセット17種
├── src/
│   ├── app.css                      # グローバルスタイル（Tailwind 4 / shadcn CSS変数）
│   ├── app.d.ts                     # Cloudflare Platform 型定義（D1/R2/secrets）
│   ├── app.html                     # HTMLテンプレート
│   ├── lib/
│   │   ├── assets/
│   │   │   └── favicon.svg          # ファビコン（SVG）
│   │   ├── components/
│   │   │   ├── ItemCard.svelte      # アイテムカード（一覧グリッド用、3:4比）
│   │   │   ├── PhotoUploader.svelte # 写真アップロード（presign→リサイズ→R2→DB）
│   │   │   ├── TagPicker.svelte     # タグ/素材選択UI（検索・新規作成）
│   │   │   └── ui/                  # shadcn-svelte UIコンポーネント群
│   │   ├── server/
│   │   │   ├── db/
│   │   │   │   ├── index.ts         # getDb(d1) ヘルパー
│   │   │   │   ├── index.test.ts    # DBヘルパーテスト
│   │   │   │   └── schema.ts        # Drizzle スキーマ（8テーブル + リレーション）
│   │   │   ├── r2.ts                # R2 presigned URL / 削除ヘルパー
│   │   │   └── r2.test.ts           # R2ヘルパーテスト
│   │   └── utils/
│   │       ├── image.ts             # Canvas API リサイズ → WebP
│   │       ├── image.test.ts
│   │       ├── uuid.ts              # crypto.randomUUID() ラッパー
│   │       └── uuid.test.ts
│   └── routes/
│       ├── +layout.svelte           # グローバルレイアウト（ModeWatcher/Toaster/PWAメタ）
│       ├── +page.server.ts          # / → /items リダイレクト（302）
│       ├── +page.svelte             # ルートページ（空）
│       ├── admin/
│       │   └── +page.server.ts      # /admin → /items リダイレクト
│       ├── api/
│       │   ├── items/
│       │   │   ├── +server.ts       # GET（一覧・検索・タグフィルタ・thumbUrl）/ POST
│       │   │   └── [id]/
│       │   │       └── +server.ts   # GET / PATCH（情報・タグ・素材更新）/ DELETE（R2含む）
│       │   ├── materials/
│       │   │   └── +server.ts       # GET（頻出6件+全件）/ POST
│       │   ├── photos/
│       │   │   ├── [id]/
│       │   │   │   └── +server.ts   # POST（登録・カバー自動設定）/ DELETE
│       │   │   └── presign/
│       │   │       └── +server.ts   # POST（presigned PUT URL生成）
│       │   └── tags/
│       │       └── +server.ts       # GET / POST
│       ├── items/
│       │   ├── +page.server.ts      # タグ一覧をサーバーから取得
│       │   ├── +page.svelte         # コレクション一覧（無限スクロール・検索・タグフィルタ）
│       │   ├── [id]/
│       │   │   ├── +page.server.ts  # アイテム詳細取得（presigned URL付き）
│       │   │   └── +page.svelte     # 詳細・インライン編集・削除・公開設定
│       │   └── new/
│       │       ├── +page.server.ts  # タグ・素材一覧をサーバーから取得
│       │       └── +page.svelte     # 5ステップ登録ウィザード
│       └── p/
│           └── [id]/
│               ├── +page.server.ts  # 公開アイテム取得（非公開情報フィルタリング）
│               └── +page.svelte     # 公開ページ（認証不要・ログインUIなし）
├── static/
│   ├── favicon.svg                  # /favicon.svg として配信（manifest用）
│   ├── manifest.webmanifest         # PWA マニフェスト
│   └── robots.txt
├── docs/
│   ├── superpowers/
│   │   ├── specs/
│   │   │   └── 2026-04-15-figurine-catalog-design.md  # 設計仕様書
│   │   └── plans/
│   │       └── 2026-04-17-figurine-catalog.md         # 実装計画書
│   └── implementation-report.md    # 本ファイル
├── drizzle.config.ts                # Drizzle Kit 設定
├── svelte.config.js
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── wrangler.toml                    # Cloudflare Pages/D1/R2 設定
```

---

## よく使うコマンド一覧

### 開発

```bash
# 開発サーバー起動（Cloudflare Workers環境）
npx wrangler dev

# 型チェック
npm run check

# テスト実行
npm test

# テスト（ウォッチモード）
npm run test:watch
```

### データベース（Drizzle / D1）

```bash
# スキーマ変更後にマイグレーションファイル生成
npx drizzle-kit generate

# ローカルD1にマイグレーション適用
npx wrangler d1 migrations apply figurine-catalog-db --local

# 本番D1にマイグレーション適用
npx wrangler d1 migrations apply figurine-catalog-db --remote

# ローカルD1をSQLで直接操作
npx wrangler d1 execute figurine-catalog-db --local --command "SELECT * FROM items"

# D1 作成（初回のみ）
npx wrangler d1 create figurine-catalog-db
```

### Cloudflare

```bash
# ログイン
npx wrangler login

# R2 バケット作成
npx wrangler r2 bucket create figurine-catalog-photos

# シークレット設定
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY

# ビルド（Cloudflare Pages向け）
npm run build

# ビルドのプレビュー
npm run preview
```

### Git

```bash
# ファイル個別指定でステージング（git add -A は .claude/ シンボリックリンクでエラーになるため不可）
git add src/routes/items/+page.svelte src/routes/api/items/+server.ts

# ディレクトリ指定でまとめてステージング
git add src/ migrations/ static/
```

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | SvelteKit 2 + Svelte 5 (runes) |
| UIコンポーネント | shadcn-svelte v1.2.7 + Tailwind CSS 4 |
| ホスティング | Cloudflare Pages |
| データベース | Cloudflare D1 (SQLite) + Drizzle ORM |
| ストレージ | Cloudflare R2 (presigned URL方式) |
| 認証 | Cloudflare Access + Google OAuth（設定はCloudflare側） |
| テスト | Vitest + jsdom |
| パッケージ管理 | npm |
