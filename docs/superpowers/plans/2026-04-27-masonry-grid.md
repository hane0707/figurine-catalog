# メイソンリーグリッド 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** アイテム一覧ページのグリッドをCSSコラムスによるメイソンリーレイアウトに変更し、カード画像を自然なアスペクト比で表示する。

**Architecture:** `src/app.css` のみを変更する。`.items-grid` を `display: grid` から CSS `columns` に切り替え、`.card-img` の固定アスペクト比を削除して画像が自然比で表示されるようにする。

**Tech Stack:** CSS columns、SvelteKit（変更なし）

---

## ファイルマップ

| ファイル | 変更内容 |
|--------|----------|
| `src/app.css:281-283` | `.items-grid` を columns レイアウトに切り替え |
| `src/app.css:286-293` | `.card` に `break-inside: avoid` と `margin-bottom` を追加 |
| `src/app.css:295-301` | `.card-img` から `aspect-ratio: 3/4` を削除 |
| `src/app.css:299` | `.card-img img` を自然アスペクト比に変更 |

---

## Task 1: `.items-grid` を CSS columns に切り替え

**Files:**
- Modify: `src/app.css:281-283`

現在のコード:
```css
/* --- items grid --- */
.items-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 24px;
}
```

- [ ] **Step 1: `.items-grid` の CSS を置き換える**

`src/app.css` の `.items-grid` ブロックをそのまま以下に置き換える:

```css
/* --- items grid --- */
.items-grid {
  columns: 4; column-gap: 24px;
}
@media (max-width: 1100px) {
  .items-grid { columns: 3; column-gap: 16px; }
}
@media (max-width: 720px) {
  .items-grid { columns: 2; column-gap: 12px; }
}
```

- [ ] **Step 2: 開発サーバーを起動して列数を目視確認**

```bash
npm run dev
```

ブラウザで `http://localhost:5173/items` を開く。
- デスクトップ幅（>1100px）: 4列
- タブレット幅（720〜1100px）: 3列
- スマホ幅（≤720px）: 2列

になっていることを確認する。

- [ ] **Step 3: コミット**

```bash
git add src/app.css
git commit -m "feat: items-gridをCSS columnsメイソンリーに変更"
```

---

## Task 2: `.card` にメイソンリー対応プロパティを追加

**Files:**
- Modify: `src/app.css:286-293`（`.card` ブロック）

現在のコード:
```css
/* --- card --- */
.card {
  background: var(--surface); border-radius: var(--radius);
  padding: 14px; box-shadow: var(--neu-soft);
  transition: all var(--dur) var(--ease); cursor: pointer;
  text-align: left; display: flex; flex-direction: column;
  position: relative; text-decoration: none; color: inherit;
}
```

- [ ] **Step 1: `.card` に `break-inside` と `margin-bottom` を追加**

```css
/* --- card --- */
.card {
  background: var(--surface); border-radius: var(--radius);
  padding: 14px; box-shadow: var(--neu-soft);
  transition: all var(--dur) var(--ease); cursor: pointer;
  text-align: left; display: flex; flex-direction: column;
  position: relative; text-decoration: none; color: inherit;
  break-inside: avoid; margin-bottom: 24px;
}
@media (max-width: 720px) {
  .card { margin-bottom: 16px; }
}
```

`break-inside: avoid` はカードが列をまたいで分断されるのを防ぐ。`margin-bottom` はグリッドの `gap` の代わりに縦間隔を確保する。

- [ ] **Step 2: ブラウザでカードが列をまたいでいないことを確認**

`http://localhost:5173/items` で、各カードが必ず1列内に収まっていることを目視確認する。スマホ幅にリサイズして縦間隔が16pxになっていることも確認する（DevToolsで確認可）。

- [ ] **Step 3: コミット**

```bash
git add src/app.css
git commit -m "feat: cardにbreak-insideとmargin-bottomを追加"
```

---

## Task 3: カード画像を自然アスペクト比に変更

**Files:**
- Modify: `src/app.css:295-301`（`.card-img` と `.card-img img`）

現在のコード:
```css
.card-img {
  aspect-ratio: 3/4; border-radius: calc(var(--radius) - 6px);
  overflow: hidden; background: var(--bg-sunk);
  box-shadow: var(--neu-inset); position: relative; margin-bottom: 14px;
}
.card-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 600ms var(--ease); }
```

- [ ] **Step 1: `aspect-ratio` を削除し、画像を自然比に変更。プレースホルダーに `min-height` を追加**

```css
.card-img {
  border-radius: calc(var(--radius) - 6px);
  overflow: hidden; background: var(--bg-sunk);
  box-shadow: var(--neu-inset); position: relative; margin-bottom: 14px;
  min-height: 160px;
}
.card-img img { width: 100%; height: auto; display: block; transition: transform 600ms var(--ease); }
```

`min-height: 160px` は画像なし（プレースホルダー）のカードがつぶれないようにするため。`height: auto; display: block;` で画像を自然な縦横比で表示する。`object-fit: cover` は固定高さがないため不要。

- [ ] **Step 2: ブラウザで画像が自然比で表示されることを確認**

`http://localhost:5173/items` で:
- 縦長画像は縦長に、横長画像は横長に表示されること
- 画像なしカードが `min-height: 160px` でつぶれていないこと
- ホバー時の拡大アニメーション（`transform: scale(1.05)`）が引き続き動作すること

- [ ] **Step 3: コミット**

```bash
git add src/app.css
git commit -m "feat: カード画像のアスペクト比を自然比に変更"
```

---

## 完了チェック

- [ ] スマホ幅（≤720px）で2列メイソンリーが表示される
- [ ] タブレット幅（721〜1100px）で3列
- [ ] デスクトップ幅（>1100px）で4列
- [ ] カードが列をまたいで分断されない
- [ ] 画像が元の縦横比で表示される
- [ ] 画像なしカードがつぶれない
- [ ] リストビュー（list モード）が正常に動作する
- [ ] ホバーアニメーションが正常に動作する
- [ ] 「新しいアイテムを登録」ボタン（`.card.--empty`）が正常に表示される
