# 設計: `/p/[id]` ルート削除 & カバー写真変更機能

**日付:** 2026-04-24

---

## 概要

### 課題1: `/p/[id]` ルートの削除

`/items/[id]` が未ログインでも公開アイテムを閲覧できるようになったため、`/p/[id]` の専用公開ルートと詳細ページ内のリンクは冗長。完全に削除する。

### 課題2: カバー写真変更機能

編集モードでどの写真がカバー（一覧ページのサムネ）かが分からず、変更もできない。カバー写真の視覚的識別と変更機能を追加する。

---

## 設計

### セクション1: `/p/[id]` ルート削除

**削除するファイル:**
- `src/routes/p/[id]/+page.server.ts`
- `src/routes/p/[id]/+page.svelte`

**UI変更:** `src/routes/items/[id]/+page.svelte` から以下のブロックを削除:

```svelte
{#if item.isPublic}
  <div style="margin-top:8px">
    <a href="/p/{item.id}" style="font-family:var(--f-mono); font-size:10px; letter-spacing:0.1em; color:var(--accent-haze); text-decoration:none">
      PUBLIC · /p/{item.id}
    </a>
  </div>
{/if}
```

---

### セクション2: カバー写真変更機能

#### API: `PATCH /api/photos/[id]`

`src/routes/api/photos/[id]/+server.ts` に PATCH ハンドラを追加する。

```
- 認証必須（locals.user なければ 401）
- 対象写真を DB から取得（なければ 404）
- 同アイテムの全写真の isCover を 0 にリセット
- 対象写真の isCover を 1 に設定
- json({ ok: true }) を返す
```

#### 編集パネルの状態型変更

`editPhotos` の型を以下に変更（`isCover` を追加）:

```typescript
let editPhotos = $state<Array<{ id: string; thumbUrl: string; isCover: number }>>([]);
```

`startEdit()` でも `isCover` を含めて初期化:

```typescript
editPhotos = item.photos.map((p: any) => ({ id: p.id, thumbUrl: p.thumbUrl, isCover: p.isCover }));
```

#### `setCover()` 関数

```typescript
async function setCover(photoId: string) {
  try {
    const res = await fetch(`/api/photos/${photoId}`, { method: 'PATCH' });
    if (!res.ok) throw new Error(`カバー変更失敗: ${res.status}`);
    editPhotos = editPhotos.map((p) => ({ ...p, isCover: p.id === photoId ? 1 : 0 }));
  } catch (e) {
    toast.error('カバー写真の変更に失敗しました');
    console.error(e);
  }
}
```

#### 編集パネル UI

- 各写真サムネ全体をクリック → `setCover(photo.id)` を呼び出し
- `isCover === 1` の写真の左上に「COVER」バッジを表示
- 削除ボタン（`×`）は右上に引き続き表示（クリックが `setCover` と競合しないよう `stopPropagation` を使用）

---

## 変更ファイル一覧

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `src/routes/p/[id]/+page.server.ts` | 削除 | `/p/[id]` ルート廃止 |
| `src/routes/p/[id]/+page.svelte` | 削除 | `/p/[id]` ルート廃止 |
| `src/routes/items/[id]/+page.svelte` | 修正 | PUBLIC リンク削除・カバー変更 UI 追加 |
| `src/routes/api/photos/[id]/+server.ts` | 修正 | PATCH ハンドラ追加 |
