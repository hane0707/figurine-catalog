# 設計書: シャード型作品一覧（Mirror Shards 移植）

日付: 2026-08-01
参考: `docs/mirror-shards.html`（鏡片一覧モック）
対象ブランチ: feature/ui-refinement からの派生を想定

## 目的

作品一覧の Collection セクションを、モック「鏡片一覧 — SHARD INDEX」の表現に作り直す。
不定形クリップの鏡片カード（厚み・稜線・グリント・ホバーシーン）、散逸配置、浮遊、
ポインタチルト、ちり光（前景 depth-fx）、紙のグレインを採用する。

## 決定事項（ユーザー確認済み）

| 論点 | 決定 |
|---|---|
| スコープ | Collection セクション全体。世界観に寄せられる箇所は追加提案可 |
| 配色 | モックの配色は使わず、既存デザイントークン（紫アクセント・ライト/ダーク両対応）に翻訳 |
| 演出 | シャード本体＋浮遊・チルト・散逸配置・ちり光・グレインすべて採用 |
| 表示切替 | シャード↔リストの切替を維持（リスト表示は現状のまま） |
| 実装方式 | 幾何計算を純 TS モジュールに分離し、Svelte で宣言的に SVG 描画 |
| 空状態文言 | 「この分類の欠片はまだ拾われていません。」へ変更（承認済み） |

## 構成

### 新規ファイル

- **`src/lib/shards/geometry.ts`** — 純関数の幾何モジュール（DOM 非依存）。
  - `hashSeed(id: string): number` — FNV-1a で item.id から決定論的 seed を導出。
    同じ作品は再訪しても常に同じ形・傾き・浮遊周期になる。
  - `rng(seed)` — モックと同じ線形合同法の擬似乱数。
  - クリップ形状 6 種（0–1 座標の polygon 文字列と、100×120 単位箱の頂点配列の両方）。
  - `edgeExposure(edge)` — 共有光源ベクトルに対する辺の受光度（0–1）。
  - `buildSlab(polyIdx, seed)` — 厚みパネル。辺ごとの四辺形（隣接パネルと頂点を共有し
    連結した帯になる）、グラデーション色（hue スイープ）、写真の回転映り込み用
    transform を**データとして**返す。
  - `buildEdges(polyIdx)` — 前面稜線。辺ごとの座標・色・太さ・不透明度。
  - `glintPos(polyIdx)` — 形状の第一頂点から導くグリント座標。
  - `scatterParams(seed)` — 散逸配置（--dx/--dy/--rot）と浮遊（--dur/--del）。
  - `buildDust(seed, count)` — ちり光の粒の座標・サイズ・点滅パラメータ。
- **`src/lib/components/ShardCard.svelte`** — カード 1 枚。構造は
  glow（静的ぼかし影）→ bob → stage/tilt → shard-stack（slab SVG ＋ shard）→ meta。
  shard 内は photo / tint / grain / edgeline / glint / sheen の層。
  props: `item`, `isOwner`, `index`（enter アニメの stagger 用）。
  `{@html}` は使わず `#each` で SVG 要素を描画。グラデーション・クリップの ID は
  `item.id` ベースで一意化。ポインタチルトはカード内で自己完結
  （`pointer: fine` かつ非 reduced-motion のみ。タッチ固定表示バグの既修正と同じガード）。
- **`src/lib/components/ShardDefs.svelte`** — 共有 SVG defs。clipPath ×6 と
  grain フィルタ（feTurbulence）。一覧ページに 1 回だけ設置。
- **`src/lib/components/DustField.svelte`** — ちり光。固定 seed で決定論生成、
  `position: fixed` ＋ `pointer-events: none` ＋ `aria-hidden="true"`。常時 ON
  （モックの比較トグルは持ち込まない）。

### 変更ファイル

- **`src/routes/items/+page.svelte`**
  - グリッド表示を ShardCard によるシャード表示に置換。
  - シャードは固定 5:6 比のため、JS 列分割（columns/columnCount/resize リスナー）を
    撤去し、CSS の `repeat(auto-fill, minmax(240px, 1fr))` グリッドに簡素化。
  - スケルトンもシャード枠（clip-path 適用のプレースホルダ）に更新し、
    列数依存をなくす。
  - ShardDefs / DustField を設置。
  - 空状態文言を「この分類の欠片はまだ拾われていません。」に変更。
  - リスト表示・検索・種別・タグ・ソート・無限スクロール・URL 同期は現状維持。
- **`src/app.css`** — シャード用カスタムプロパティ群（field 背景・稜線色・
  グロー色・ちり光色など）をトークンとして追加し、`.dark` で上書き。
- **削除: `src/lib/components/ItemCard.svelte`** — 使用箇所は一覧グリッドのみのため
  ShardCard に置き換えて削除。

## カードのメタ情報マッピング

モックの「鏡の外側・左罫線」メタ形式に翻訳する。

| モック | 本実装 |
|---|---|
| cat 行 | `HANDMADE / 自作` または `COLLECTED / 購入`。非公開作品は同じ行に小さな錠アイコン |
| h2 タイトル | 作品名（既存 `--f-display`） |
| p 説明文 | シリーズ名（notes は表示しない） |
| time | 登録日（`formatDate`） |
| （なし） | タグチップを小さくメタ内に維持 |

- 写真上の `card-badge` オーバーレイは廃止しメタの cat 行に統合
  （矩形バッジは不定形クリップと視覚的に喧嘩するため）。
- `view-transition-name: item-img-{id}` は shard 内の写真要素に維持し、
  詳細ページへのビュー遷移を保つ。

## 配色翻訳

- 氷青アクセント（#b9c2ff）→ **紫**（`--accent-amber` = oklch 0.52 0.22 285。確定事項）。
- slab・稜線の hue スイープはモックの 198–348（cyan→magenta）を
  **紫中心の約 230–320（中心 285）** に再調整。
- ダークモード: モックに近い見え方（暗い field、銀灰の文字、紫の稜線・グリント）。
- ライトモード: 「明るい部屋の鏡片」。glow はニューモーフィズム影色に寄せ、
  tint・グリントは控えめの不透明度に落とす。
- ちり光: ダーク＝白の微光／ライト＝淡紫の微光（低 opacity）。

## モーション・パフォーマンス

- enter（stagger 出現・animation 方式）/ bob（6.5–11s のゆったり浮遊）/
  ポインタチルト（ホバー中のみ、transform のみ）/ ホバーシーン 1.1s / scale 1.03。
  「モーションはゆったり」原則に整合。
- モックのパフォーマンス設計を踏襲する:
  - 静的フィルタ層（glow の blur・grain）とアニメ層（bob・tilt）を要素として分離し、
    フィルタの毎フレーム再ラスタライズを避ける。
  - `content-visibility: auto` ＋ `contain-intrinsic-size` で画面外カードの
    layout/paint を省略。散逸ずれ・浮遊・チルトがクリップされないよう
    パディングで余白を確保（左右は % 指定）。
  - IntersectionObserver で画面外の bob を `animation-play-state: paused` に。
  - sticky 要素に backdrop-filter を使わない。
- `prefers-reduced-motion: reduce` で bob・tilt・sheen・ちり光・enter を停止。
- リビール系は animation 方式（`transition: all` のソース順上書き問題を回避。
  CLAUDE.md 既知のハマりどころ）。

## 採用しないもの（YAGNI）

- モックの「散逸」ソートオプション（散逸**配置**で十分。API ソートと概念が衝突する）。
- 「N / M PIECES」件数表示(hero-meta の件数表示と重複)。
- 奥行き演出の比較トグル UI（比較用の道具であり本番機能ではない）。

## エラー・エッジケース

- 写真なし（thumbUrl null）: shard クリップ内に既存と同様の ✦ プレースホルダを
  沈み背景で表示。slab の写真映り込みは省略しグラデーションのみ。
- フィルタ結果 0 件: 空状態文言（上記）。
- 無限スクロール追加分: 追加カードにも enter stagger と IntersectionObserver を適用。
  seed は item.id 由来なので再フェッチ・追記でも形が揺れない。

## テスト・検証

- `src/lib/shards/geometry.test.ts`（vitest 新規）:
  - `hashSeed` の安定性（同入力同出力・異入力で分散）。
  - `rng` の決定論性。
  - `buildSlab` の隣接パネルが頂点を共有すること（帯の連結性）。
  - `edgeExposure` の値域（0–1）。
  - `scatterParams` / `buildDust` の決定論性と値域。
- 合格基準: `npm run check` はベースライン 75 エラー / 28 警告から**増やさない**。
  `npm test` は既存 102 件＋新規テスト全 PASS。
- 視覚確認はユーザーが dev サーバーで実施（サンドボックスでは起動不可）。
  確認観点: ライト/ダーク両テーマ、タッチ端末でのチルト無効、reduced-motion、
  無限スクロール後の表示、詳細ページへのビュー遷移。
