# メイソンリーグリッド デザイン仕様

## 概要

アイテム一覧（`/items`）のグリッドレイアウトを、CSSの `columns` プロパティを使ったメイソンリーレイアウトに変更する。スマホでは2列、タブレットでは3列、デスクトップでは4列。カード画像は固定アスペクト比（3/4）をやめ、元画像の自然な比率で表示する。

## 変更スコープ

変更ファイルは `src/app.css` のみ。

## レイアウト構造

| 画面幅 | 列数 | column-gap |
|--------|------|------------|
| ≤720px（スマホ） | 2列 | 12px |
| 721〜1100px（タブレット） | 3列 | 16px |
| >1100px（デスクトップ） | 4列 | 24px |

`.items-grid` を `display: grid` から CSS `columns` に切り替える。

```css
.items-grid {
  columns: 4;
  column-gap: 24px;
}
@media (max-width: 1100px) {
  .items-grid { columns: 3; column-gap: 16px; }
}
@media (max-width: 720px) {
  .items-grid { columns: 2; column-gap: 12px; }
}
```

## カード間の縦間隔

`.card` に `margin-bottom` を追加：

```css
.card {
  margin-bottom: 24px; /* デフォルト（タブレット・デスクトップ） */
}
@media (max-width: 720px) {
  .card { margin-bottom: 16px; }
}
```

## カード

- `.card` に `break-inside: avoid` を追加し、カードが列をまたいで分断されないようにする
- 縦の間隔は `margin-bottom: 16px`（スマホ）/ `24px`（デスクトップ）で対応

## 画像

- `.card-img` から `aspect-ratio: 3/4` を削除
- `.card-img img` を `width: 100%; height: auto; display: block;` に変更（自然アスペクト比で表示）
- `object-fit: cover` は不要になるため削除
- 画像なし（プレースホルダー）の場合は `min-height: 160px` でつぶれを防ぐ

## 影響範囲

- **リストビュー（list モード）**: `display: flex; flex-direction: column` で独立しているため変更なし
- **「新しいアイテムを登録」ボタン（`.card.--empty`）**: `break-inside: avoid` により列分断なし、影響なし
- **レイアウトシフト**: 画像読み込みまでカードサイズが変わる可能性があるが、許容する

## 非対応

- `grid-template-rows: masonry`（CSS Grid実験的機能）はChrome非対応のため採用しない
- 画像の縦横比メタデータのDB保存は行わない（スケルトン表示等も対象外）
