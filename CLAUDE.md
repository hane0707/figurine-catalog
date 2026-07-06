# CLAUDE.md

フィギュア・置物コレクションを写真付きで管理する Web アプリ。個人開発。

**スタック:** SvelteKit 2 + Svelte 5（runes 構文: `$state` / `$derived` / `$effect` / `$props`、イベントは `onclick` 形式）/ Cloudflare Pages + D1 + R2 / Drizzle ORM / shadcn-svelte + Tailwind CSS 4 / Zod

## コマンド

```bash
npm run dev        # 開発サーバー（R2 認証情報が必要。初回セットアップは README 参照）
npm run build      # 本番ビルド
npm run check      # svelte-check（型チェック）
npm test           # vitest 一括実行
npx wrangler d1 migrations apply figurine-catalog-db --local   # ローカル D1 マイグレーション
```

## 検証の基準（ベースライン比較）

- `npm run check` には **既存の負債として 75 エラー / 28 警告** がある。合格基準は「**新規に増やさない**」こと。絶対数で判断しない。
- `npm test` は 102 件全 PASS が基準。
- サンドボックス内では dev サーバーを起動できない（`.dev.vars` 読み取り拒否 + D1/R2 バインディング）。動作確認は check / test のベースライン比較で行い、視覚確認はユーザーに依頼する。

## 構成

- `src/routes/` — ページと API（`items/`, `items/[id]/`, `items/new/`, `api/`, `about/`, `privacy/`, `admin/`）
- `src/lib/server/db/` — Drizzle スキーマ・DB アクセス（サーバー専用）
- `src/lib/components/ui/` — shadcn-svelte 生成コンポーネント（手を入れない）
- `src/app.css` — デザイントークン・グローバルスタイルの中心
- `migrations/` — D1 マイグレーション SQL
- `docs/superpowers/plans/`・`specs/` — 機能ごとの実装計画と設計書（履歴として保持）

## デザイン原則（ユーザー確定事項 — 勝手に「改善」しない）

- **アクセントは紫**（oklch 0.52 0.22 285）。トークン名 `--accent-amber` は歴史的経緯で琥珀を意味するが**実色は紫が正**。琥珀への変更提案は却下済み。
- **GlitchText のフル演出は毎回表示**。再訪時の短縮・省略は不可。ステイン（部分背景色の残留）とゆっくりした出現が意図されたデザイン。
- **モーションはゆったり**（カードホバー 600ms）。「情緒」重視。ただし演出は知覚できる強さが必要。
- **冗長なナビゲーションを置かない**（ヘッダーと重複する戻るボタン等は不可）。
- 色・アニメーション・演出の変更は、実装前に必ず提案として提示して承認を得る。

## 作業ルール

- コミットメッセージは日本語。
- `.dev.vars` は読み取り・表示禁止（シークレット）。
- CSS の `transition` はマージされない — 同詳細度セレクタの `transition: all` が後置ユーティリティの transition をソース順で上書きする。リビール系は animation 方式を使う（過去のハマりどころ）。
- 未解決のフォローアップは `docs/follow-ups.md` に集約してある。着手前に確認する。
