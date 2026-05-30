# テクスチャ除去 & ニューモーフィズム強化 — デザイン仕様

**日付:** 2026-05-31  
**対象ブランチ:** main  
**スコープ:** CSS (`src/app.css`) と Svelte テンプレート (`src/routes/items/+page.svelte`, `src/lib/components/ItemCard.svelte`)

---

## 背景と目的

現在、カード・stat・スポットライト・フィルターバーに `texture.png` を `::before` 擬似要素で重ねている。これが全体のニューモーフィズム的UIと質感の面で乖離を生んでいる。テクスチャを除去し、シャドウ強化・サーフェスグラデーション・エッジハイライトでニューモーフィズムらしさを最大化する。`texture.png` / `1texture.png` ファイル自体は削除しない。

---

## セクション1：テクスチャ削除

### CSS（`src/app.css`）

以下の規則ブロックを完全に削除する：

```css
/* 削除対象 A: line ~428–447 */
.textured::before { ... }
.stat.--haze::before { --tx-pos: ... }
.stat.--line::before { --tx-pos: ... }
.stat.--diamond::before { --tx-pos: ... }
.card:nth-child(6n + 2)::before { --tx-pos: ... }
/* ... 全 --tx-pos バリエーション */

/* 削除対象 B: .detail-img-panel::before の texture 行 (~line 871–880) */
.detail-img-panel::before {
  background-image: url("/texture.png?v=1");
  ...
}
```

`detail-img-panel::before` の `position: absolute; inset: 0; pointer-events: none;` 等は
グラデーションオーバーレイに転用するため規則ブロック自体は残し、中身を差し替える（セクション3参照）。

### HTML テンプレート

`textured` クラスを削除する箇所：

| ファイル | 要素 | 変更 |
|---|---|---|
| `items/+page.svelte` | `.spotlight.textured` | `textured` 削除 |
| `items/+page.svelte` | `.stat.textured` × 4 | `textured` 削除 |
| `items/+page.svelte` | `.filterbar.textured` | `textured` 削除 |
| `items/+page.svelte` | `.card.textured` (line ~361) | `textured` 削除 |
| `ItemCard.svelte` | `<a class="card textured">` (line 21) | `textured` 削除 |

---

## セクション2：シャドウ変数強化 & ベース色調整

### `:root` 変数変更（`src/app.css`）

#### ベース色

```css
/* 変更前 */
--bg: oklch(0.983 0.007 285);
--surface: oklch(1 0 0);

/* 変更後 */
--bg: oklch(0.96 0.012 285);   /* 背景を微妙に暗く・彩度上げ */
--surface: oklch(1 0 0);        /* そのまま維持 */
```

#### シャドウ変数

```css
/* 変更後 */
--neu-deep:
  12px 12px 36px oklch(0.82 0.016 285 / 0.65),
  -12px -12px 36px oklch(1 0 0 / 0.95);

--neu-mid:
  8px 8px 22px oklch(0.82 0.016 285 / 0.55),
  -8px -8px 22px oklch(1 0 0 / 0.92);

--neu-soft:
  5px 5px 12px oklch(0.82 0.016 285 / 0.42),
  -5px -5px 12px oklch(1 0 0 / 0.88);

--neu-inset:
  inset 4px 4px 8px oklch(0.82 0.016 285 / 0.55),
  inset -4px -4px 8px oklch(1 0 0 / 0.9);

--neu-inset-deep:
  inset 8px 8px 16px oklch(0.80 0.016 285 / 0.6),
  inset -8px -8px 16px oklch(1 0 0 / 0.92);
```

暗部の lightness を `0.85 → 0.82`、chroma を `0.014 → 0.016` に微調整することでシャドウのコントラストを高める。

---

## セクション3：サーフェスグラデーション & エッジハイライト

### サーフェスグラデーション

`.card`・`.stat`・`.spotlight`・`.filterbar` の `background` を単色から多層グラデーションに変更する。

```css
/* 共通グラデーション定義 (CSS 変数として定義) */
--surface-raised: linear-gradient(
  135deg,
  oklch(1 0 0 / 0.6) 0%,
  transparent 50%,
  oklch(0.9 0.01 285 / 0.15) 100%
), var(--surface);
```

適用先：

| セレクタ | 変更 |
|---|---|
| `.card` | `background: var(--surface)` → `background: var(--surface-raised)` |
| `.stat` | 同上 |
| `.spotlight` | 同上 |
| `.filterbar` | 同上 |
| `.detail-img-panel` | `::before` をグラデーションオーバーレイに転用 |

### エッジハイライト

カード・stat に上端ハイライトを追加：

```css
.card,
.stat {
  border-top: 1px solid oklch(1 0 0 / 0.7);
}
```

### ホバー状態の強化

```css
.card:hover {
  transform: translateY(-3px);
  box-shadow: var(--neu-mid);
  background: linear-gradient(
    135deg,
    oklch(1 0 0 / 0.75) 0%,
    transparent 45%,
    oklch(0.9 0.01 285 / 0.1) 100%
  ), var(--surface);
}
```

### `.detail-img-panel::before` の転用

テクスチャ URL を削除し、グラデーションオーバーレイとして再利用：

```css
.detail-img-panel::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    oklch(1 0 0 / 0.25) 0%,
    transparent 60%
  );
  pointer-events: none;
  z-index: 1;
}
```

---

## 変更ファイル一覧

| ファイル | 変更種別 |
|---|---|
| `src/app.css` | `:root` 変数変更、`.textured` 規則削除、グラデーション追加 |
| `src/routes/items/+page.svelte` | `textured` クラス削除（6箇所） |
| `src/lib/components/ItemCard.svelte` | `textured` クラス削除（1箇所） |

---

## 非変更事項

- `static/texture.png`・`static/1texture.png` はファイルとして残す
- ダークモード変数（`.dark`）は今回対象外
- アニメーション・レイアウト・タイポグラフィは変更しない
