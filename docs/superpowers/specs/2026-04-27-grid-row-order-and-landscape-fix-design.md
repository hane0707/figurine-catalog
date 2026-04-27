# グリッド行優先順序と横長画像余白修正 デザイン仕様

## 概要

2つの課題をまとめて対応する。

1. **並び順の修正**: アイテムグリッドの表示順を列優先（CSS columns の挙動）から行優先（左→右→次の行）に変更する
2. **横長画像の余白解消**: `min-height: 160px` が横長画像カードに生じさせる余白を取り除く

## 変更スコープ

- `src/routes/items/+page.svelte` — グリッドテンプレートをSvelte管理カラムに変更
- `src/app.css` — `.items-grid` と `.card` 関連ルールを更新
- `src/lib/components/ItemCard.svelte` — プレースホルダー div の高さ指定を変更

---

## セクション1: 並び順の変更

### 問題

CSS `columns` はアイテムを列優先で配置する（items[0,1,2] → col1、items[3,4,5] → col2）。
ユーザーが期待するのは行優先（items[0] → col1, items[1] → col2, items[2] → col1, ...）。

### 設計

**Svelte管理カラム方式**を採用する。

**`+page.svelte` の変更:**

```svelte
let columnCount = $state(4);

let columns = $derived(
  Array.from({ length: columnCount }, (_, col) =>
    items.filter((_, i) => i % columnCount === col)
  )
);
```

リサイズ監視は **既存の `onMount` に統合**する（別の `onMount` を追加しない）。
既存の `onMount` のクリーンアップ関数に `removeEventListener` を追加:

```svelte
onMount(() => {
  // --- 既存コード（animation RAF, fetchItems, IntersectionObserver）---

  const updateColumns = () => {
    columnCount = window.innerWidth <= 720 ? 2
                : window.innerWidth <= 1100 ? 3
                : 4;
  };
  updateColumns();
  window.addEventListener('resize', updateColumns);

  // 既存のクリーンアップに追記
  return () => {
    cancelAnimationFrame(rafId);
    observer.disconnect();
    window.removeEventListener('resize', updateColumns);
  };
});
```

テンプレートのグリッド部分を以下に変更:

```svelte
{#if layout === 'grid'}
  <div class="items-grid rise rise-d4">
    {#each columns as column, colIdx (colIdx)}
      <div class="items-column">
        {#each column as item (item.id)}
          <ItemCard {item} isOwner={!!data.user} />
        {/each}
      </div>
    {/each}
  </div>
```

**`app.css` の変更:**

`.items-grid` を CSS columns から flex に変更:

```css
.items-grid {
  display: flex; gap: 24px; align-items: flex-start;
}
@media (max-width: 1100px) {
  .items-grid { gap: 16px; }
}
@media (max-width: 720px) {
  .items-grid { gap: 12px; }
}
```

`.items-column` を追加:

```css
.items-column {
  flex: 1; display: flex; flex-direction: column; gap: 24px;
}
@media (max-width: 1100px) {
  .items-column { gap: 16px; }
}
@media (max-width: 720px) {
  .items-column { gap: 12px; }
}
```

以下を削除:
- `.card` の `break-inside: avoid`（CSS columns不要になるため）
- `.items-grid .card { margin-bottom: 24px; }` と対応するモバイルmedia query（`.items-column` の `gap` で代替）

### 動作

| 画面幅 | 列数 | gap |
|--------|------|-----|
| ≤720px | 2列 | 12px |
| 721〜1100px | 3列 | 16px |
| >1100px | 4列 | 24px |

ウィンドウリサイズ時は `columnCount` が更新され、`columns` が自動再計算される。
無限スクロールで追加されたアイテムも `items` の更新で `columns` に自動反映される。

---

## セクション2: 横長画像の余白解消

### 問題

`.card-img` の `min-height: 160px` により、横長画像（例: 16:9, 幅220px → 高さ約124px）でも
コンテナが160pxに引き上げられ、下に~36pxの余白が生じる。

`min-height: 160px` はプレースホルダー表示（✦アイコン）がつぶれないために追加されたが、
画像ありカードにも影響している。

### 設計

**`app.css`**: `.card-img` から `min-height: 160px` を削除。

**`ItemCard.svelte`**: プレースホルダー div のスタイルを `height: 100%` から `min-height: 160px` に変更。

```svelte
<!-- 変更前 -->
<div style="width:100%; height:100%; display:grid; place-items:center; font-family:var(--f-display); font-size:40px; opacity:0.2; color:var(--fg)">✦</div>

<!-- 変更後 -->
<div style="width:100%; min-height:160px; display:grid; place-items:center; font-family:var(--f-display); font-size:40px; opacity:0.2; color:var(--fg)">✦</div>
```

### 動作

- 画像ありカード: `img` の自然な高さがそのままカード画像部の高さになる（余白ゼロ）
- 画像なしカード: プレースホルダー div の `min-height: 160px` で最小高さを確保

---

## 非対応

- `grid-template-rows: masonry`（Chrome未対応のため採用しない）
- 画像の縦横比メタデータのDB保存（スケルトン表示等は対象外）
- list ビューへの変更なし
