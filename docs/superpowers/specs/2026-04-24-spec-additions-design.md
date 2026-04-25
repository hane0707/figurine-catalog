# 仕様追加 設計ドキュメント

**Date:** 2026-04-24  
**Project:** figurine-catalog  
**Branch:** main

---

## 概要

`docs/修正指示.md` の「## 仕様追加」セクションに記載された9項目を実装する。  
大別すると「編集フォーム修正」「ナビゲーション改善」「UI文言整理」「新規ページ追加」「ドキュメント整備」の5グループ。

---

## グループ A: 編集フォーム修正

### A-1. 公開情報サブチェックをどちらか一方のみ表示

**対象:** `src/routes/items/[id]/+page.svelte`

**現状:** `editIsPublic === 1` のとき「購入情報も公開する」「制作情報も公開する」が常に両方表示される。

**変更後の動作:**
- `editIsPublic === 1` かつ `editIsHandmade === 0` → 「購入情報も公開する」のみ表示
- `editIsPublic === 1` かつ `editIsHandmade === 1` → 「制作情報も公開する」のみ表示
- `editIsPublic === 1` かつ `editIsHandmade === null` → どちらも非表示

**実装:** 既存の `{#if editIsPublic === 1}` ブロック内に `{#if editIsHandmade === 0}` / `{:else if editIsHandmade === 1}` の分岐を追加。

### A-2. 「手放したアイテムとしてマーク」チェックを削除

**対象:** `src/routes/items/[id]/+page.svelte`

**変更:** 「手放したアイテムとしてマーク」の `<label>` ブロックを丸ごと削除。  
`editStatus` のステートおよび `saveEdit` での送信フィールドはそのまま残す（データは保持、UI からのみ除去）。

---

## グループ B: ナビゲーション改善

### B-1. ログアウト後 `/items` へ遷移

**対象:** `src/routes/admin/+page.server.ts`

**変更:** `logout` アクション内のリダイレクト先を `/admin` → `/items` に変更。

```ts
// before
throw redirect(302, '/admin');
// after
throw redirect(302, '/items');
```

### B-2. ログイン画面に「一覧へ戻る」ボタン追加

**対象:** `src/routes/admin/+page.svelte`

**変更:** ログインボタンの下に `/items` へのリンクを追加。既存スタイルに合わせてテキストのみのリンクまたは `--ghost` スタイルのボタンとする。

### B-3. navバーをスクロール固定＋半透明

**対象:** `src/app.css`

**変更内容:**
```css
.nav {
  position: sticky;
  top: 0;
  z-index: 100;
  /* コンテナのパディングを相殺して背景を端まで伸ばす */
  margin-left: -40px;
  margin-right: -40px;
  padding-left: 40px;
  padding-right: 40px;
  /* 半透明フロスト効果 */
  background: rgba(240, 237, 248, 0.82);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
```

モバイル（max-width: 720px）では `margin` / `padding` を `16px` に揃える。

---

## グループ C: UI 文言整理

### C-1. 「Made · Met · Kept」テキスト削除

**対象:** `src/routes/items/+page.svelte`

削除箇所（3箇所）:
1. `<title>` の `— Made · Met · Kept` 部分 → `Haku's suitcase` のみ
2. `<div class="brand-sub">Made · Met · Kept</div>` → 要素ごと削除
3. ヒーローセクションの `<div class="eyebrow" ...>Made · Met · Kept</div>` → 要素ごと削除

---

## グループ D: 新規ページ

### D-1. 一覧カードにタグ表示

**対象:** `src/routes/api/items/+server.ts`、`src/lib/components/ItemCard.svelte`

**変更内容:**
1. `/api/items` レスポンスにタグ配列を含める（`itemTags: [{ id, name }]`）
2. `ItemCard` に `tags?: { id: string; name: string }[]` プロップを追加
3. カード下部にタグを小さなチップとして表示（最大3件 + オーバーフロー時は `+N` 表示）

**表示位置:** カード内の `.card-meta` の上。

### D-2. About ページ

**対象:** `src/routes/about/+page.svelte`（新規作成）

**内容:**

> 作ったものも、出会ったものも、ここに置いておきます。
>
> リバース:1999の芸術品を二次創作として立体化した作品をはじめ、各地で出会ったお気に入りのフィギュアや購入品まで——私 [haku] が手にしたものたちを、このスーツケースにまとめています。
>
> ここにいる間は、神秘学家アルカニスト界で稀有な才能を持つタイムキーパーのスーツケースと同様、雨を気にせずにお過ごしいただけます。どうぞお好きなお部屋でくつろぎながらご鑑賞ください。
>
> ---
>
> アルカニスト・人間の方関係なく、またリバース:1999をご存じない方もお楽しみいただけます。
>
> なお、リバース:1999に関連する二次創作作品については、当サイトは非公式のファンサイトであり、原作・版権元とは一切関係ありません。

スタイル: 他ページのデザイン（`ambient` 装飾・`display` フォント）に合わせたシンプルなレイアウト。

### D-3. Privacy Policy ページ

**対象:** `src/routes/privacy/+page.svelte`（新規作成）

**内容:** `https://haku-works.web.app/privacy-policy` の既存文を流用し、以下を追記・修正:
- 「一次創作品（オリジナル造形作品）」も対象に含まれる旨を冒頭に追記
- 二次創作ファンサイトである旨の注記を維持

> **注:** Privacy Policy 原文は実装時に手動で確認・コピーすること（フェッチ不可のため）。

**ナビゲーション:** About・Privacy Policy へのリンクは各ページのフッターに追加（nav バーには追加しない）。

---

## グループ E: ドキュメント整備

### E-1. Google Analytics 導入手順

**対象:** `docs/google-analytics.md`（新規作成）

**内容:**
1. GA4 プロパティ作成手順
2. Measurement ID の取得
3. `+layout.svelte` への `gtag` スニペット埋め込み方法
4. Cloudflare Workers / Pages での注意点（`__SvelteKit_base` ルーティングとの干渉なし確認）
5. 動作確認方法（GA4 リアルタイムレポート）

---

## 実装順序

1. グループ A（編集フォーム修正）— 既存ページのみ、影響範囲小
2. グループ B-1, B-2（ログアウト・ログイン画面）— 既存ページのみ
3. グループ C-1（文言削除）— 既存ページのみ
4. グループ B-3（sticky nav）— CSS のみ、全ページ影響あるため後半
5. グループ D-1（カードにタグ表示）— API + コンポーネント変更
6. グループ D-2, D-3（About / Privacy Policy）— 新規ルート
7. グループ E-1（GA ドキュメント）— コードなし

---

## 非対象

- `editStatus`（`parted` / `owned`）の DB カラム・API は変更しない
- ルートページ（`/`）は変更しない（既存の SvelteKit プレースホルダーのまま）
