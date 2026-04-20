# 編集画面の3つの修正 — 設計仕様

**日付:** 2026-04-20  
**対象ファイル:** `src/routes/items/[id]/+page.svelte`, `src/routes/items/[id]/+page.server.ts`

---

## 背景・問題

`/items/[id]` の詳細・編集ページに以下の3つの問題がある。

1. **タグが編集できない** — 編集モードにタグ操作UIがなく、タグは閲覧のみ。
2. **制作情報/購入情報が編集中も表示される** — 表示ブロックが `{#if editing}...{:else}...{/if}` の外に書かれているため、編集フォームと表示が同時に出てしまい紛らわしい。
3. **制作情報の編集に素材ピッカーが欠落** — 新規登録ウィザードには素材 `TagPicker` があるが、編集フォームには含まれていない。

---

## スコープ

- `src/routes/items/[id]/+page.svelte` の修正（編集フォーム・表示レイアウト）
- `src/routes/items/[id]/+page.server.ts` の修正（タグ・素材データの追加ロード）
- `src/routes/api/items/[id]/+server.ts` の修正（`tagIds` / `materialIds` の PATCH 対応確認・必要に応じて追加）

スコープ外: UI デザインの変更、写真管理、公開設定ロジック。

---

## 設計

### 1. `+page.server.ts` — データ追加

`new/+page.server.ts` と同様に `allTags` と `materials`（all / frequent）を返すよう拡張する。

```ts
const [allTags, allMaterials] = await Promise.all([
  db.select().from(tags).orderBy(tags.name),
  db.select().from(materials),
]);
const frequent = allMaterials.filter((m) => m.isPreset).slice(0, 6);
return {
  item: { ...item, photos: photosWithUrls },
  allTags,
  materials: { all: allMaterials, frequent },
};
```

### 2. 表示ブロックを `{:else}` 内に集約

現在、購入情報・制作情報・タグの表示ブロックが `{#if editing}...{/if}` の後ろ（常に表示）になっている。これらをすべて `{:else}` ブロック内に移動する。

**修正前の構造:**
```
{#if editing}
  ...編集フォーム（購入情報・制作情報フォーム含む）...
{:else}
  名前・シリーズ・公開リンク・手放し済みバッジのみ
{/if}

<!-- 常に表示されてしまっている -->
購入情報表示ブロック
制作情報表示ブロック
タグ表示ブロック
全写真グリッド
```

**修正後の構造:**
```
{#if editing}
  ...編集フォーム（購入情報・制作情報・タグ・公開設定すべて含む）...
{:else}
  名前・シリーズ・公開リンク・手放し済みバッジ
  購入情報表示ブロック
  制作情報表示ブロック
  タグ表示ブロック
{/if}

<!-- 常に表示（編集中も見たい可能性あり） -->
全写真グリッド
```

> 全写真グリッドは編集中も表示したままにする（写真を参照しながら編集する可能性があるため）。

### 3. 編集フォームにタグ `TagPicker` を追加

**追加ステート:**
```ts
let editTags = $state<{ id: string; name: string }[]>([]);
```

**`startEdit()` に追加:**
```ts
editTags = item.itemTags?.map((t: any) => t.tag) ?? [];
```

**`saveEdit()` の body に追加:**
```ts
body.tagIds = editTags.map((t) => t.id);
```

**フォーム末尾（手放しチェックの後）に追加:**
```svelte
<div class="border rounded-xl p-3 space-y-2">
  <p class="text-sm font-medium text-muted-foreground">タグ</p>
  <TagPicker
    bind:selected={editTags}
    suggestions={data.allTags}
    frequent={[]}
    placeholder="タグを追加..."
    onCreate={createTag}
  />
</div>
```

`createTag` 関数は新規登録ページと同様に `/api/tags` へ POST する。

### 4. 制作情報フォームに素材 `TagPicker` を追加

**追加ステート:**
```ts
let editMaterials = $state<{ id: string; name: string }[]>([]);
```

**`startEdit()` に追加:**
```ts
editMaterials = item.itemMaterials?.map((m: any) => m.material) ?? [];
```

**`saveEdit()` の `handmadeInfo` ブロックに追加:**
```ts
body.materialIds = editMaterials.map((m) => m.id);
```

**制作情報フォーム（`editIsHandmade === 1` ブロック）内、日付フィールドの後に追加:**
```svelte
<div>
  <p class="text-xs text-muted-foreground mb-1">使用素材</p>
  <TagPicker
    bind:selected={editMaterials}
    suggestions={data.materials.all}
    frequent={data.materials.frequent}
    placeholder="素材を追加..."
    onCreate={createMaterial}
  />
</div>
```

`createMaterial` 関数は新規登録ページと同様に `/api/materials` へ POST する。

### 5. API サーバー (`+server.ts`) の確認

`/api/items/[id]` の PATCH ハンドラーが `tagIds` / `materialIds` を受け付けているか確認し、対応していなければ追加する。

---

## データフロー

```
[id]/+page.server.ts
  └── load() → { item, allTags, materials: { all, frequent } }

[id]/+page.svelte (編集モード)
  ├── TagPicker(tags) → editTags → body.tagIds → PATCH /api/items/[id]
  └── TagPicker(materials) → editMaterials → body.materialIds → PATCH /api/items/[id]
```

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|---|---|
| `src/routes/items/[id]/+page.server.ts` | `allTags`, `materials` を追加ロード |
| `src/routes/items/[id]/+page.svelte` | 表示ブロック移動、タグ編集追加、素材編集追加 |
| `src/routes/api/items/[id]/+server.ts` | `tagIds` / `materialIds` PATCH 対応確認・追加 |

---

## 完了条件

- [ ] 編集モード中、購入情報・制作情報・タグの表示ブロックが非表示になる
- [ ] 編集モードでタグを追加・削除でき、保存後に反映される
- [ ] 自作品の編集モードで素材を追加・削除でき、保存後に反映される
- [ ] 既存の購入情報・制作情報・公開設定の編集は引き続き動作する
