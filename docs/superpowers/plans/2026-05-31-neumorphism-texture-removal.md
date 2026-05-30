# テクスチャ除去 & ニューモーフィズム強化 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PNG テクスチャオーバーレイを全 UI コンポーネントから除去し、シャドウ強化・グラデーション・エッジハイライトでニューモーフィズム UI を最大化する。

**Architecture:** HTML から `textured` クラスを削除 → CSS で `.textured::before` ブロックを削除 → `:root` の `--neu-*` / `--bg` 変数を強化 → `--surface-raised` グラデーション変数を追加してカード・stat・spotlight・filterbar に適用 → `.detail-img-panel::before` をグラデーションに置き換え。各タスクはビルドが通る状態で完結する。

**Tech Stack:** SvelteKit 2, CSS カスタムプロパティ (`src/app.css`)

---

## 変更ファイルマップ

| ファイル | 担当 |
|---|---|
| `src/lib/components/ItemCard.svelte` | `textured` クラス削除（1 箇所） |
| `src/routes/items/+page.svelte` | `textured` クラス削除（7 箇所） |
| `src/app.css` | `.textured::before` ブロック削除、`:root` 変数更新、グラデーション追加、detail-img-panel 置き換え |

---

### Task 1: HTML から `textured` クラスを削除

**Files:**
- Modify: `src/lib/components/ItemCard.svelte:21`
- Modify: `src/routes/items/+page.svelte:170,204,210,216,222,277,361`

- [ ] **Step 1: ItemCard.svelte の textured クラスを削除**

`src/lib/components/ItemCard.svelte` の 21 行目を変更：

```svelte
<!-- 変更前 -->
<a href="/items/{item.id}" class="card textured">

<!-- 変更後 -->
<a href="/items/{item.id}" class="card">
```

- [ ] **Step 2: items/+page.svelte の spotlight の textured クラスを削除**

170 行目：

```svelte
<!-- 変更前 -->
<div class="spotlight textured">

<!-- 変更後 -->
<div class="spotlight">
```

- [ ] **Step 3: items/+page.svelte の stat × 4 の textured クラスを削除**

204, 210, 216, 222 行目：

```svelte
<!-- 変更前 -->
<div class="stat textured">
<div class="stat --haze textured">
<div class="stat --line textured">
<div class="stat --diamond textured">

<!-- 変更後 -->
<div class="stat">
<div class="stat --haze">
<div class="stat --line">
<div class="stat --diamond">
```

- [ ] **Step 4: items/+page.svelte の filterbar の textured クラスを削除**

277 行目：

```svelte
<!-- 変更前 -->
<div class="filterbar textured rise rise-d2">

<!-- 変更後 -->
<div class="filterbar rise rise-d2">
```

- [ ] **Step 5: items/+page.svelte のアイテムカードの textured クラスを削除**

361 行目（ `class="card textured"` の部分）：

```svelte
<!-- 変更前 -->
class="card textured"

<!-- 変更後 -->
class="card"
```

- [ ] **Step 6: ビルドを確認**

```bash
npm run build
```

期待: エラーなしでビルド完了。

- [ ] **Step 7: コミット**

```bash
git add src/lib/components/ItemCard.svelte src/routes/items/+page.svelte
git commit -m "refactor: textured クラスを全コンポーネントから削除"
```

---

### Task 2: `.textured::before` CSS ブロックを削除

**Files:**
- Modify: `src/app.css:427-462`

- [ ] **Step 1: テクスチャ CSS ブロックを丸ごと削除**

`src/app.css` の以下のブロックを削除する（コメント行から末尾まで）：

```css
/* 削除対象: 以下 36 行を完全に削除 */
/* --- texture overlay --- */
.textured::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("/texture.png?v=1");
  background-size: var(--tx-size, 200px);
  background-repeat: repeat;
  background-position: var(--tx-pos, 0 0);
  opacity: 0.17;
  pointer-events: none;
}
.stat.--haze::before {
  --tx-pos: -300px -200px;
}
.stat.--line::before {
  --tx-pos: -500px -100px;
}
.stat.--diamond::before {
  --tx-pos: -150px -400px;
}
.card:nth-child(6n + 2)::before {
  --tx-pos: -150px -200px;
}
.card:nth-child(6n + 3)::before {
  --tx-pos: -300px -80px;
}
.card:nth-child(6n + 4)::before {
  --tx-pos: -100px -350px;
}
.card:nth-child(6n + 5)::before {
  --tx-pos: -250px -150px;
}
.card:nth-child(6n)::before {
  --tx-pos: -350px -300px;
}
```

削除後、`/* --- filter bar --- */` コメントが直前のブロックに続く形になる。

- [ ] **Step 2: ビルドを確認**

```bash
npm run build
```

期待: エラーなしでビルド完了。

- [ ] **Step 3: コミット**

```bash
git add src/app.css
git commit -m "refactor: .textured::before テクスチャ CSS ブロックを削除"
```

---

### Task 3: `:root` のシャドウ変数とベース色を更新

**Files:**
- Modify: `src/app.css:11,30-42`

- [ ] **Step 1: `--bg` を更新**

`src/app.css` の `:root` 内、`--bg` の行を変更：

```css
/* 変更前 */
--bg: oklch(0.983 0.007 285);

/* 変更後 */
--bg: oklch(0.96 0.012 285);
```

- [ ] **Step 2: `--neu-*` 変数を全て更新**

`:root` 内の `--neu-deep` ～ `--neu-inset-deep` を以下に置き換える：

```css
/* 変更前 */
--neu-deep:
  10px 10px 30px oklch(0.85 0.014 285 / 0.5),
  -10px -10px 30px oklch(1 0 0 / 0.9);
--neu-mid:
  6px 6px 18px oklch(0.85 0.014 285 / 0.4), -6px -6px 18px oklch(1 0 0 / 0.85);
--neu-soft:
  3px 3px 8px oklch(0.85 0.014 285 / 0.3), -3px -3px 8px oklch(1 0 0 / 0.75);
--neu-inset:
  inset 3px 3px 6px oklch(0.85 0.014 285 / 0.45),
  inset -3px -3px 6px oklch(1 0 0 / 0.85);
--neu-inset-deep:
  inset 6px 6px 12px oklch(0.83 0.014 285 / 0.5),
  inset -6px -6px 12px oklch(1 0 0 / 0.85);

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

- [ ] **Step 3: ビルドを確認**

```bash
npm run build
```

期待: エラーなしでビルド完了。

- [ ] **Step 4: コミット**

```bash
git add src/app.css
git commit -m "style: --bg とニューモーフィズムシャドウ変数を強化"
```

---

### Task 4: `--surface-raised` 変数を追加しグラデーションを適用

**Files:**
- Modify: `src/app.css` — `:root`、`.card`、`.stat`、`.spotlight`、`.filterbar`、`.card:hover`

- [ ] **Step 1: `:root` に `--surface-raised` を追加**

`:root` ブロック内（`--neu-inset-deep` の直後）に追加：

```css
--surface-raised: linear-gradient(
    135deg,
    oklch(1 0 0 / 0.6) 0%,
    transparent 50%,
    oklch(0.9 0.01 285 / 0.15) 100%
  ),
  var(--surface);
```

- [ ] **Step 2: `.card` の background を更新し border-top を追加**

`.card` ブロック（`/* --- card --- */` 直下）の `background` 行を変更し、`border-top` を追加：

```css
/* 変更前 */
.card {
  background: var(--surface);
  border-radius: var(--r);
  padding: 14px;
  box-shadow: var(--neu-soft);
  ...
}

/* 変更後 */
.card {
  background: var(--surface-raised);
  border-radius: var(--r);
  border-top: 1px solid oklch(1 0 0 / 0.7);
  padding: 14px;
  box-shadow: var(--neu-soft);
  ...
}
```

- [ ] **Step 3: `.card:hover` の background を更新**

`.card:hover` ブロックに `background` を追加：

```css
/* 変更前 */
.card:hover {
  transform: translateY(-3px);
  box-shadow: var(--neu-mid);
}

/* 変更後 */
.card:hover {
  transform: translateY(-3px);
  box-shadow: var(--neu-mid);
  background: linear-gradient(
      135deg,
      oklch(1 0 0 / 0.75) 0%,
      transparent 45%,
      oklch(0.9 0.01 285 / 0.1) 100%
    ),
    var(--surface);
}
```

- [ ] **Step 4: `.stat` の background を更新し border-top を追加**

`.stat` ブロックの `background` 行を変更し、`border-top` を追加：

```css
/* 変更前 */
.stat {
  background: var(--surface);
  border-radius: var(--r);
  padding: 22px 24px;
  box-shadow: var(--neu-soft);
  position: relative;
  overflow: hidden;
}

/* 変更後 */
.stat {
  background: var(--surface-raised);
  border-radius: var(--r);
  border-top: 1px solid oklch(1 0 0 / 0.7);
  padding: 22px 24px;
  box-shadow: var(--neu-soft);
  position: relative;
  overflow: hidden;
}
```

- [ ] **Step 5: `.spotlight` の background を更新**

`.spotlight` ブロックの `background` 行を変更：

```css
/* 変更前 */
.spotlight {
  ...
  background: var(--surface);
  ...
}

/* 変更後 */
.spotlight {
  ...
  background: var(--surface-raised);
  ...
}
```

- [ ] **Step 6: `.filterbar` の background を更新**

`.filterbar` ブロックの `background` 行を変更：

```css
/* 変更前 */
.filterbar {
  background: var(--surface);
  ...
}

/* 変更後 */
.filterbar {
  background: var(--surface-raised);
  ...
}
```

- [ ] **Step 7: ビルドを確認**

```bash
npm run build
```

期待: エラーなしでビルド完了。

- [ ] **Step 8: コミット**

```bash
git add src/app.css
git commit -m "style: --surface-raised グラデーションをカード・stat・spotlight・filterbar に適用"
```

---

### Task 5: `.detail-img-panel::before` をグラデーションに置き換え

**Files:**
- Modify: `src/app.css:871-880`

- [ ] **Step 1: `.detail-img-panel::before` の内容を置き換え**

`src/app.css` の `.detail-img-panel::before` ブロックを以下に差し替える：

```css
/* 変更前 */
.detail-img-panel::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("/texture.png?v=1");
  background-size: 300px;
  background-repeat: repeat;
  opacity: 0.2;
  pointer-events: none;
}

/* 変更後 */
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
}
```

- [ ] **Step 2: ビルドを確認**

```bash
npm run build
```

期待: エラーなしでビルド完了。

- [ ] **Step 3: 開発サーバーで目視確認**

```bash
npm run dev
```

確認項目：
- `/items` — カードにテクスチャが表示されないこと
- `/items` — stat カードが立体的に見えること（シャドウ・グラデーション）
- `/items/[id]` — 詳細ページの画像パネルにテクスチャが表示されないこと
- カードにホバーすると浮き上がる感が確認できること
- `texture.png` が `static/` に存在したままであること（削除しない）

- [ ] **Step 4: コミット**

```bash
git add src/app.css
git commit -m "style: detail-img-panel のテクスチャをグラデーションオーバーレイに置き換え"
```
