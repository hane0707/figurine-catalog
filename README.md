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

## ローカル開発

```bash
npm install

# Cloudflare Workers環境で起動（D1/R2バインディングあり）
npx wrangler dev
```

ブラウザで `http://localhost:8787` を開く。

### テスト

```bash
npm test
```

### 型チェック

```bash
npm run check
```

---

## データベース

```bash
# スキーマ変更後にマイグレーションファイル生成
npx drizzle-kit generate

# ローカルD1にマイグレーション適用
npx wrangler d1 migrations apply figurine-catalog-db --local

# 本番D1にマイグレーション適用
npx wrangler d1 migrations apply figurine-catalog-db --remote
```

---

## デプロイ

初回デプロイ前に以下が必要。詳細は [`docs/implementation-report.md`](docs/implementation-report.md) を参照。

1. `wrangler login` でCloudflareにログイン
2. D1データベースを作成し `wrangler.toml` の `database_id` を更新
3. R2バケットを作成
4. R2 APIキーを `wrangler secret put` で設定
5. Cloudflare Pages プロジェクトを作成（GitHub連携）
6. Cloudflare Access でアクセス制御を設定（`/items/*`, `/api/*` を保護）

```bash
# ビルド
npm run build

# 本番D1にマイグレーション適用
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
