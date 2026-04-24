# 設計: バグ・仕様不備修正

**日付:** 2026-04-24  
**対象:** `docs/修正指示.md` の「## バグ・仕様不備」全7項目

---

## 修正対象一覧

| # | 内容 | グループ |
|---|------|---------|
| 1 | 未ログインでもアイテム詳細ページを閲覧可能にする（編集・削除ボタン非表示） | 認証 |
| 2 | 未ログイン時に「新しいアイテムを登録」カードを非表示にする | 認証 |
| 3 | 詳細ページの編集・削除ボタンが2つずつ表示されている問題を修正 | UI |
| 4 | 詳細ページで複数画像をクリックで切り替えられるようにする | UI |
| 5 | 編集時にアイテム画像を追加・削除できるようにする | 機能 |
| 6 | 非公開アイテムを未ログインユーザーが閲覧できてしまう問題を修正 | 認証 |
| 7 | ログイン時に公開・非公開状態を一覧・詳細ページで視覚的に表示する | UI |

---

## グループ1: 認証制御（#1・#2・#6）

### #1 + #6: `/items/[id]` 認証ガード変更

**対象ファイル:** `src/routes/items/[id]/+page.server.ts`

現在9行目に `if (!locals.user) throw redirect(302, '/admin');` がある。これを削除し、アイテム取得後に以下のロジックに置き換える：

```
アイテムが存在しない              → error(404)
未ログイン + isPublic === 0      → error(404)  ※アイテムの存在を教えない
未ログイン + isPublic === 1      → 正常表示
ログイン済み                     → 常に正常表示
```

テンプレート側は既に `{#if data.user}` で編集・削除ボタンを制御しているため、追加の UI 変更不要。

### #6 追加: `/api/items` GET のフィルタリング

**対象ファイル:** `src/routes/api/items/+server.ts`

現状、GET エンドポイントは認証不要で全アイテムを返す。`locals.user` がない場合、WHERE 句に `eq(items.isPublic, 1)` を追加してプライベートアイテムをフィルタする。

```typescript
// locals.user がない場合のみ追加するフィルタ
const publicFilter = locals.user ? undefined : eq(items.isPublic, 1);
```

### #2: 「新しいアイテムを登録」カードの非表示

**対象ファイル:** `src/routes/items/+page.svelte`

グリッドの空カード（250〜255行目）を `{#if data.user}...{/if}` で囲む。`data.user` はレイアウトデータ経由で利用可能。FAB は既に同様に制御済み。

---

## グループ2: UI改善（#3・#4・#7）

### #3: ボタン重複削除

**対象ファイル:** `src/routes/items/[id]/+page.svelte`

編集・削除ボタンが以下2箇所に存在する：
- ナビバー（157〜168行目）— 上部固定、常に視認しやすい
- `sheet-actions` ブロック（257〜264行目）— 情報パネル下部

情報パネル下部の `sheet-actions` ブロック（257〜264行目）を削除する。ナビバーのボタンを残す。

### #4: 画像クリック切り替え

**対象ファイル:** `src/routes/items/[id]/+page.svelte`

`selectedPhoto` という `$state` 変数を追加する。`$effect` で `coverPhoto` の変化（ページリロード時など）に追従させる。

```typescript
// coverPhoto は photos が空のとき undefined になるため undefined も許容
let selectedPhoto = $state<(typeof item.photos)[number] | undefined>(undefined);
$effect(() => { selectedPhoto = coverPhoto; });
```

- メイン画像エリアは `selectedPhoto` の `thumbUrl` を表示するよう変更
- 右パネルのサムネイル（`otherPhotos`）をクリックすると `selectedPhoto` を更新
- 下部「All Photos」グリッドの各写真もクリック可能にする
- 永続化なし（非ログインを含む全ユーザーが操作可能な純粋 UI 変更）

### #7: 公開・非公開アイコン表示

**対象ファイル:** `src/lib/components/ItemCard.svelte`, `src/routes/items/+page.svelte`, `src/routes/items/[id]/+page.svelte`

**ItemCard への変更：**
- `isOwner?: boolean` プロップを追加
- `isOwner === true && item.isPublic === 0` のとき、カード画像エリアの右上に鍵アイコン（SVG）を表示

**一覧ページへの変更：**
- `ItemCard` に `isOwner={!!data.user}` を渡す

**詳細ページへの変更：**
- `{#if data.user && !item.isPublic}` のとき、タイトル横に同じ鍵アイコンを表示

鍵アイコン SVG（共通）:
```html
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
</svg>
```

---

## グループ3: 編集時の画像管理（#5）

### #5: 編集パネルへの画像追加・削除

**対象ファイル:** `src/routes/items/[id]/+page.svelte`

編集モードに入ると `editPhotos` 配列を `item.photos` で初期化する。

**状態:**
```typescript
let editPhotos = $state<Array<{ id: string; thumbUrl: string }>>([]);
```

`startEdit()` 内で初期化:
```typescript
editPhotos = item.photos.map(p => ({ id: p.id, thumbUrl: p.thumbUrl }));
```

**削除フロー:**
1. 各写真に `×` ボタンを表示
2. クリック → `DELETE /api/photos/[id]` を即時呼び出し
3. 成功 → `editPhotos` からその写真を除外
4. 失敗 → `toast.error` を表示（`editPhotos` は変更しない）

**追加フロー:**
1. 編集パネル内に `PhotoUploader` を配置（`itemId={item.id}`, `itemCreated={true}`）
2. `onUploaded` コールバック:
   - `POST /api/photos/[photo.id]` で DB に登録（`itemId`, `r2KeyOrig`, `r2KeyThumb` を送信）
   - 成功 → `editPhotos` にプレビュー用エントリを追加
3. `onSystemError` → `toast.error('アップロードに失敗しました')`

**UX 注意点:**
- 写真の追加・削除は「保存」ボタンとは独立した即時操作（既存の新規登録フローと同じ挙動）
- 「キャンセル」しても追加・削除した写真は元に戻らない
- `saveEdit()` 後の `invalidateAll()` で `item.photos` が最新化される

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/routes/items/[id]/+page.server.ts` | 認証ガードを `isPublic` 考慮に変更（#1・#6） |
| `src/routes/api/items/+server.ts` | GET に `isPublic` フィルタを追加（#6） |
| `src/routes/items/+page.svelte` | 登録カードを `{#if data.user}` で囲む（#2）、`ItemCard` に `isOwner` を渡す（#7） |
| `src/lib/components/ItemCard.svelte` | `isOwner` プロップと鍵アイコン追加（#7） |
| `src/routes/items/[id]/+page.svelte` | ボタン重複削除（#3）、画像切り替え（#4）、鍵アイコン（#7）、画像管理（#5） |
