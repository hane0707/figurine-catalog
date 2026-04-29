# 新規登録ウィザード スタイル統一 — 設計スペック

**日付:** 2026-04-30  
**対象ブランチ:** main  
**ステータス:** 承認済み

---

## 概要

新規登録ウィザード（`/items/new`）と確認カード（`SummaryCard`）が Tailwind ユーティリティクラスで実装されており、編集ページのプロジェクト CSS デザインシステム（`.field`、`.type-card`、`.btn` 等）と視覚的に乖離している。これらを app.css 定義済みクラスおよび CSS 変数に統一する。

---

## 方針

- 新規コンポーネント・新規 CSS クラスは原則追加しない（YAGNI）
- app.css に既存のクラスを最大限活用する
- 構造は変えず、クラス名の置き換えのみを行う
- 外側のレイアウト用クラス（`max-w-md mx-auto p-4` 等）は維持する

---

## セクション 1: 新規登録ページ（`/items/new/+page.svelte`）

### 1-1. テキスト / 数値 / 日付入力

**変更前:**
```svelte
<input
  bind:value={name}
  class="w-full border rounded-lg px-3 py-2 bg-background text-foreground"
/>
```

**変更後:**
```svelte
<div class="field">
  <label>Name</label>
  <input bind:value={name} placeholder="アイテム名（スキップ可）" />
</div>
```

対象フィールド（全て `.field` ラッパー化）:
- Name / Series（basic ステップ）
- Store / Event / Date / Price / Maker / Artist（details - 購入品）
- Quote / Started / Finished（details - 自作品）

### 1-2. テキストエリア

**変更前:**
```svelte
<textarea class="w-full border rounded-lg px-3 py-2 bg-background text-foreground resize-none" rows={4}></textarea>
```

**変更後:**
```svelte
<div class="field">
  <label>Notes</label>
  <textarea bind:value={notes} placeholder="制作メモ・塗装記録（自由記述）" rows={4}></textarea>
</div>
```

### 1-3. 種別ピッカー（購入品 / 自作品）

**変更前:**
```svelte
<div class="space-y-3">
  <button class="w-full border rounded-xl p-4 text-left hover:bg-accent {isHandmade === 0 ? 'border-primary' : ''}">
    🛒 <strong>購入品</strong>...
  </button>
  <button class="w-full border rounded-xl p-4 text-left hover:bg-accent {isHandmade === 1 ? 'border-primary' : ''}">
    🎨 <strong>自作品</strong>...
  </button>
</div>
```

**変更後:**
```svelte
<div class="type-picker">
  <button class={'type-card --bought ' + (isHandmade === 0 ? '--active' : '')}
    onclick={() => { isHandmade = 0; step = 'details'; }}>
    <div class="mark"></div>
    <h4>購入品</h4>
    <p>店舗・EC・イベントで入手</p>
  </button>
  <button class={'type-card --handmade ' + (isHandmade === 1 ? '--active' : '')}
    onclick={() => { isHandmade = 1; step = 'details'; }}>
    <div class="mark"></div>
    <h4>自作品</h4>
    <p>造形・塗装・改造など</p>
  </button>
</div>
```

### 1-4. ナビゲーションボタン

**変更前:**
```svelte
<button class="flex-1 border rounded-lg py-2">← 戻る</button>
<button class="flex-1 bg-primary text-primary-foreground rounded-lg py-2">次へ →</button>
```

**変更後:**
```svelte
<button class="btn --ghost">← 戻る</button>
<button class="btn --primary">次へ →</button>
```

ボタン行のラッパーは `display:flex; gap:10px` をインラインスタイルで維持。

### 1-5. スキップボタン

「スキップ」も `.btn --ghost` に統一する。

### 1-6. プログレスバー・ヘッダー

プログレスバー（`flex gap-1 mb-3`）とヘッダー行（`flex items-center justify-between mb-3`）は純粋レイアウト用のため Tailwind のまま維持する。サマリバッジ行も同様。

---

## セクション 2: SummaryCard（`/src/lib/components/SummaryCard.svelte`）

### 2-1. カード外枠

**変更前:**
```svelte
<div class="border rounded-xl p-4 mb-4 bg-background text-sm">
```

**変更後:**
```svelte
<div style="background:var(--surface); box-shadow:var(--neu-soft); border-radius:var(--radius); padding:20px; margin-bottom:16px; font-size:13px">
```

### 2-2. セクション見出し（「📷 写真」「📋 基本情報」等）

**変更前:**
```svelte
<span class="text-xs text-muted-foreground">📷 写真</span>
```

**変更後:**
```svelte
<span class="eyebrow">📷 写真</span>
```

### 2-3. 編集ボタン

**変更前:**
```svelte
<button class="text-xs text-muted-foreground hover:text-primary transition-colors">← 編集</button>
```

**変更後:**
```svelte
<button style="font-size:11px; color:var(--fg-mute); background:none; border:none; cursor:pointer; font-family:var(--f-mono)">← 編集</button>
```

### 2-4. セクション区切り

**変更前:**
```svelte
<div class="border-b pb-3 mb-3">
```

**変更後:**
```svelte
<div style="border-bottom:1px solid var(--line); padding-bottom:12px; margin-bottom:12px">
```

### 2-5. dl / dt / dd グリッド

**変更前:**
```svelte
<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
```

**変更後:**
```svelte
<dl style="display:grid; grid-template-columns:auto 1fr; gap:3px 12px; font-size:12px; color:var(--fg-soft)">
```

dd の値テキストは `color:var(--fg)` に。

### 2-6. 写真グリッド

**変更前:**
```svelte
<div class="grid grid-cols-4 gap-1">
```

**変更後:**
```svelte
<div style="display:grid; grid-template-columns:repeat(4,1fr); gap:4px">
```

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|---|---|
| `src/routes/items/new/+page.svelte` | Tailwind → プロジェクト CSS クラス（`.field`、`.type-picker`、`.type-card`、`.btn`） |
| `src/lib/components/SummaryCard.svelte` | Tailwind → CSS 変数 inline style + `.eyebrow` |

---

## 非対象

- app.css への新規クラス追加は行わない
- 新規登録ページの機能・ロジックは変更しない
- SummaryCard の Props インターフェースは変更しない
- 編集ページ（`/items/[id]/+page.svelte`）は変更しない
