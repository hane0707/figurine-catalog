# 編集画面の3つの修正 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/items/[id]` 編集画面でタグ・素材が編集できるようにし、表示/編集の二重表示を解消する。

**Architecture:** `+page.server.ts` にタグ・素材データを追加ロードし、`+page.svelte` の表示ブロックを `{:else}` 内に集約したうえで、編集フォームに TagPicker（タグ・素材）を追加する。API (`+server.ts`) はすでに `tagIds`/`materialIds` をサポートしているため変更不要。

**Tech Stack:** SvelteKit, Svelte 5 (runes), Drizzle ORM, Cloudflare D1, Vitest, @testing-library/svelte, jsdom

---

## 変更ファイル一覧

| ファイル | 内容 |
|---|---|
| `src/routes/items/[id]/+page.server.ts` | `allTags`, `materials` を追加ロード |
| `src/routes/items/[id]/+page.svelte` | 表示ブロック移動・タグ編集・素材編集追加 |
| `src/routes/items/[id]/+page.test.ts` | コンポーネントテスト（新規作成） |

---

### Task 1: `+page.server.ts` にタグ・素材データを追加

**Files:**
- Modify: `src/routes/items/[id]/+page.server.ts`

- [ ] **Step 1: テストファイルを作成し、失敗するテストを書く**

`src/routes/items/[id]/+page.test.ts` を新規作成する。

```ts
// src/routes/items/[id]/+page.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Page from './+page.svelte';

// SvelteKit の $app/navigation をモック
vi.mock('$app/navigation', () => ({
  invalidateAll: vi.fn().mockResolvedValue(undefined),
  goto: vi.fn().mockResolvedValue(undefined),
}));

// svelte-sonner をモック
vi.mock('svelte-sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// グローバル fetch をモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

// テスト用アイテムデータ（購入品）
const mockItem = {
  id: 'item-1',
  name: 'テストフィギュア',
  series: 'テストシリーズ',
  isHandmade: 0,
  isPublic: 0,
  purchaseInfoPublic: 0,
  handmadeInfoPublic: 0,
  status: 'owned',
  photos: [],
  purchaseInfo: { storeName: 'テスト店', eventName: null, purchaseDate: null, purchasePrice: null, maker: null, artistName: null },
  handmadeInfo: null,
  itemTags: [{ tag: { id: 'tag-1', name: '既存タグ' } }],
  itemMaterials: [],
};

// テスト用 data prop
const mockData = {
  item: mockItem,
  allTags: [
    { id: 'tag-1', name: '既存タグ' },
    { id: 'tag-2', name: '新しいタグ' },
  ],
  materials: {
    all: [{ id: 'mat-1', name: 'レジン', isPreset: 1 }],
    frequent: [{ id: 'mat-1', name: 'レジン', isPreset: 1 }],
  },
};

describe('編集画面: 表示/編集の二重表示', () => {
  it('非編集時は購入情報の表示ブロックが表示される', () => {
    render(Page, { data: mockData });
    expect(screen.getByText('購入情報')).toBeInTheDocument();
  });

  it('編集時は購入情報の表示ブロックが非表示になる', async () => {
    render(Page, { data: mockData });
    await fireEvent.click(screen.getByText('編集'));
    // 編集フォームの「購入情報」ラベル（p.text-sm.font-medium）は表示される
    // 表示用の h3「購入情報」は非表示になるべき
    const headings = screen.queryAllByRole('heading', { name: '購入情報' });
    expect(headings).toHaveLength(0);
  });
});

describe('編集画面: タグ編集', () => {
  it('非編集時はタグ編集UIが表示されない', () => {
    render(Page, { data: mockData });
    expect(screen.queryByPlaceholderText('タグを追加...')).not.toBeInTheDocument();
  });

  it('編集時はタグ編集UIが表示される', async () => {
    render(Page, { data: mockData });
    await fireEvent.click(screen.getByText('編集'));
    expect(screen.getByPlaceholderText('タグを追加...')).toBeInTheDocument();
  });

  it('編集開始時に既存タグが editTags に反映されている', async () => {
    render(Page, { data: mockData });
    await fireEvent.click(screen.getByText('編集'));
    // TagPicker の selected バッジに既存タグが表示される
    expect(screen.getByText(/既存タグ\s*✕/)).toBeInTheDocument();
  });
});

describe('編集画面: 素材編集（自作品）', () => {
  const handmadeData = {
    ...mockData,
    item: {
      ...mockItem,
      isHandmade: 1,
      purchaseInfo: null,
      handmadeInfo: { productionStart: null, productionEnd: null, notes: null },
      itemMaterials: [{ material: { id: 'mat-1', name: 'レジン' } }],
    },
  };

  it('非編集時は素材編集UIが表示されない', () => {
    render(Page, { data: handmadeData });
    expect(screen.queryByPlaceholderText('素材を追加...')).not.toBeInTheDocument();
  });

  it('自作品の編集時は素材編集UIが表示される', async () => {
    render(Page, { data: handmadeData });
    await fireEvent.click(screen.getByText('編集'));
    expect(screen.getByPlaceholderText('素材を追加...')).toBeInTheDocument();
  });

  it('編集開始時に既存素材が editMaterials に反映されている', async () => {
    render(Page, { data: handmadeData });
    await fireEvent.click(screen.getByText('編集'));
    expect(screen.getByText(/レジン\s*✕/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: テストを実行して失敗を確認する**

```bash
cd /home/haku/projects/figurine-catalog
npx vitest run src/routes/items/[id]/+page.test.ts 2>&1 | head -60
```

期待: テストが失敗する（`data.allTags` が存在しない等のエラー、またはタグ編集UIが見つからない）

- [ ] **Step 3: `+page.server.ts` を修正してタグ・素材データを追加ロード**

```ts
// src/routes/items/[id]/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb, items, tags, materials } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { getPresignedGetUrl } from '$lib/server/r2';

export const load: PageServerLoad = async ({ params, platform }) => {
  const db = getDb(platform!.env.DB);

  const [item, allTags, allMaterials] = await Promise.all([
    db.query.items.findFirst({
      where: eq(items.id, params.id),
      with: {
        photos: { orderBy: (p, { asc }) => [asc(p.sortOrder)] },
        purchaseInfo: true,
        handmadeInfo: true,
        itemTags: { with: { tag: true } },
        itemMaterials: { with: { material: true } },
      },
    }),
    db.select().from(tags).orderBy(tags.name),
    db.select().from(materials),
  ]);

  if (!item) throw error(404, 'アイテムが見つかりません');

  const photosWithUrls = await Promise.all(
    item.photos.map(async (p) => ({
      ...p,
      thumbUrl: await getPresignedGetUrl(platform!.env, p.r2KeyThumb),
      origUrl: await getPresignedGetUrl(platform!.env, p.r2KeyOrig),
    }))
  );

  const frequent = allMaterials.filter((m) => m.isPreset).slice(0, 6);

  return {
    item: { ...item, photos: photosWithUrls },
    allTags,
    materials: { all: allMaterials, frequent },
  };
};
```

- [ ] **Step 4: TypeScript 型チェックを実行する**

```bash
cd /home/haku/projects/figurine-catalog
npx tsc --noEmit 2>&1 | head -30
```

期待: エラーなし（もしくは `+page.svelte` で `data.allTags` が未参照のエラーのみ）

- [ ] **Step 5: コミット**

```bash
cd /home/haku/projects/figurine-catalog
git add src/routes/items/[id]/+page.server.ts src/routes/items/[id]/+page.test.ts
git commit -m "feat: 編集画面のserver.tsにタグ・素材データを追加ロードし、テストファイルを作成"
```

---

### Task 2: 表示ブロックを `{:else}` 内に集約する

**Files:**
- Modify: `src/routes/items/[id]/+page.svelte:210-268`

- [ ] **Step 1: Task 1 で作成したテストを実行して、表示/編集の二重表示テストが失敗することを確認する**

```bash
cd /home/haku/projects/figurine-catalog
npx vitest run src/routes/items/[id]/+page.test.ts --reporter=verbose 2>&1 | grep -A5 "二重表示"
```

期待: 「編集時は購入情報の表示ブロックが非表示になる」テストが FAIL

- [ ] **Step 2: `+page.svelte` のテンプレート構造を修正する**

現在 `{:else}` ブロックの閉じタグ（`{/if}`）の後ろにある購入情報・制作情報・タグの表示ブロックを `{:else}` 内に移動する。

`{:else}` ブロック（非編集時）を以下の内容に置き換える。`+page.svelte` の line 210〜 の `{:else}` から `{/if}` 手前を以下に差し替え、その後の常時表示ブロック（line 223〜256）を削除する。

```svelte
  {:else}
    <h1 class="text-2xl font-bold mb-1">{item.name ?? '名称未設定'}</h1>
    {#if item.series}<p class="text-muted-foreground mb-2">{item.series}</p>{/if}
    {#if item.isPublic}
      <div class="mb-2 text-sm">
        <a href="/p/{item.id}" class="text-blue-500 hover:underline">公開ページ: /p/{item.id}</a>
      </div>
    {/if}
    {#if item.status === 'parted'}
      <span class="inline-block text-xs border rounded-full px-3 py-1 mb-2 text-muted-foreground">手放し済み</span>
    {/if}

    <!-- 購入情報 -->
    {#if item.purchaseInfo && item.isHandmade === 0}
      <div class="border rounded-xl p-4 mb-4">
        <h3 class="font-semibold mb-2">購入情報</h3>
        {#if item.purchaseInfo.storeName}<p class="text-sm">店舗: {item.purchaseInfo.storeName}</p>{/if}
        {#if item.purchaseInfo.eventName}<p class="text-sm">イベント: {item.purchaseInfo.eventName}</p>{/if}
        {#if item.purchaseInfo.purchaseDate}<p class="text-sm">購入日: {item.purchaseInfo.purchaseDate}</p>{/if}
        {#if item.purchaseInfo.purchasePrice !== null}<p class="text-sm">金額: ¥{item.purchaseInfo.purchasePrice?.toLocaleString()}</p>{/if}
        {#if item.purchaseInfo.maker}<p class="text-sm">メーカー: {item.purchaseInfo.maker}</p>{/if}
        {#if item.purchaseInfo.artistName}<p class="text-sm">作家: {item.purchaseInfo.artistName}</p>{/if}
      </div>
    {/if}

    <!-- 制作情報 -->
    {#if item.handmadeInfo && item.isHandmade === 1}
      <div class="border rounded-xl p-4 mb-4">
        <h3 class="font-semibold mb-2">制作情報</h3>
        {#if item.handmadeInfo.productionStart}<p class="text-sm">開始: {item.handmadeInfo.productionStart}</p>{/if}
        {#if item.handmadeInfo.productionEnd}<p class="text-sm">完成: {item.handmadeInfo.productionEnd}</p>{/if}
        {#if item.itemMaterials?.length}
          <p class="text-sm mt-2">素材: {item.itemMaterials.map((m: any) => m.material.name).join(', ')}</p>
        {/if}
        {#if item.handmadeInfo.notes}<p class="text-sm mt-2 whitespace-pre-wrap">{item.handmadeInfo.notes}</p>{/if}
      </div>
    {/if}

    <!-- タグ -->
    {#if item.itemTags?.length}
      <div class="flex flex-wrap gap-2 mt-2">
        {#each item.itemTags as t}
          <span class="text-xs border rounded-full px-3 py-1">{(t as any).tag.name}</span>
        {/each}
      </div>
    {/if}
  {/if}
```

- [ ] **Step 3: テストを実行して表示/編集テストがパスすることを確認する**

```bash
cd /home/haku/projects/figurine-catalog
npx vitest run src/routes/items/[id]/+page.test.ts --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|✓|×)"
```

期待: 「表示/編集の二重表示」テスト 2件がパス

- [ ] **Step 4: コミット**

```bash
cd /home/haku/projects/figurine-catalog
git add src/routes/items/[id]/+page.svelte
git commit -m "fix: 購入情報・制作情報・タグの表示ブロックをelse内に移動し、編集中の二重表示を解消"
```

---

### Task 3: 編集フォームにタグ `TagPicker` を追加する

**Files:**
- Modify: `src/routes/items/[id]/+page.svelte`

- [ ] **Step 1: タグ編集テストが現在 FAIL していることを確認する**

```bash
cd /home/haku/projects/figurine-catalog
npx vitest run src/routes/items/[id]/+page.test.ts --reporter=verbose 2>&1 | grep -A3 "タグ編集"
```

期待: タグ編集の3件テストが FAIL（「タグを追加...」プレースホルダーが見つからない）

- [ ] **Step 2: `+page.svelte` にタグ編集用のステートと関数を追加する**

`<script lang="ts">` ブロック内に以下を追加する。

既存の import 行（`import { invalidateAll, goto } from '$app/navigation';`）の下に追加:

```ts
import TagPicker from '$lib/components/TagPicker.svelte';
```

既存の `let editNotes = $state('');` の下に追加:

```ts
let editTags = $state<{ id: string; name: string }[]>([]);
let editMaterials = $state<{ id: string; name: string }[]>([]);
```

既存の `startEdit()` 関数内、`editing = true;` の直前に追加:

```ts
editTags = item.itemTags?.map((t: any) => t.tag) ?? [];
editMaterials = item.itemMaterials?.map((m: any) => m.material) ?? [];
```

既存の `saveEdit()` 関数内、`body` オブジェクト定義の後（`if (editIsHandmade === 0)` の前）に追加:

```ts
body.tagIds = editTags.map((t) => t.id);
```

`createTag` 関数を追加（`saveEdit` 関数の後）:

```ts
async function createTag(tagName: string): Promise<{ id: string; name: string }> {
  const res = await fetch('/api/tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: tagName }),
  });
  if (!res.ok) throw new Error(`タグ作成失敗: ${res.status}`);
  return (await res.json()) as { id: string; name: string };
}

async function createMaterial(materialName: string): Promise<{ id: string; name: string }> {
  const res = await fetch('/api/materials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: materialName }),
  });
  if (!res.ok) throw new Error(`素材作成失敗: ${res.status}`);
  return (await res.json()) as { id: string; name: string };
}
```

- [ ] **Step 3: 編集フォームにタグ `TagPicker` を追加する**

`+page.svelte` の編集フォーム内、`<!-- 公開設定 -->` ブロックの直前（`{#if editing}` ブロック内の `手放したアイテムとしてマーク` チェックボックスの後）に追加:

```svelte
      <!-- タグ編集 -->
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

- [ ] **Step 4: タグ編集テストを実行してパスすることを確認する**

```bash
cd /home/haku/projects/figurine-catalog
npx vitest run src/routes/items/[id]/+page.test.ts --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|✓|×|タグ)"
```

期待: 「タグ編集」の3件テストがパス

- [ ] **Step 5: コミット**

```bash
cd /home/haku/projects/figurine-catalog
git add src/routes/items/[id]/+page.svelte
git commit -m "feat: 編集フォームにタグ編集用TagPickerを追加"
```

---

### Task 4: 制作情報フォームに素材 `TagPicker` を追加する

**Files:**
- Modify: `src/routes/items/[id]/+page.svelte`

- [ ] **Step 1: 素材編集テストが現在 FAIL していることを確認する**

```bash
cd /home/haku/projects/figurine-catalog
npx vitest run src/routes/items/[id]/+page.test.ts --reporter=verbose 2>&1 | grep -A3 "素材編集"
```

期待: 素材編集の3件テストが FAIL（「素材を追加...」プレースホルダーが見つからない）

- [ ] **Step 2: `saveEdit()` の `handmadeInfo` ブロックに `materialIds` を追加する**

`+page.svelte` の `saveEdit()` 関数内、`else if (editIsHandmade === 1)` ブロック内の `body.handmadeInfo = { ... };` の後に追加:

```ts
body.materialIds = editMaterials.map((m) => m.id);
```

- [ ] **Step 3: 制作情報フォームに素材 `TagPicker` を追加する**

`+page.svelte` の `{:else if editIsHandmade === 1}` ブロック内、日付フィールドの `<div class="flex gap-2">` の後に追加:

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

- [ ] **Step 4: 全テストを実行してすべてパスすることを確認する**

```bash
cd /home/haku/projects/figurine-catalog
npx vitest run src/routes/items/[id]/+page.test.ts --reporter=verbose 2>&1
```

期待: 全テスト（8件）が PASS

- [ ] **Step 5: プロジェクト全体のテストも確認する**

```bash
cd /home/haku/projects/figurine-catalog
npx vitest run 2>&1 | tail -20
```

期待: 既存テストを含む全件 PASS

- [ ] **Step 6: TypeScript 型チェック**

```bash
cd /home/haku/projects/figurine-catalog
npx tsc --noEmit 2>&1
```

期待: エラーなし

- [ ] **Step 7: コミット**

```bash
cd /home/haku/projects/figurine-catalog
git add src/routes/items/[id]/+page.svelte
git commit -m "feat: 自作品の編集フォームに素材編集用TagPickerを追加"
```

---

## 完了確認

全タスク完了後:
- [ ] 編集モード中、購入情報・制作情報・タグの表示ブロックが非表示になる
- [ ] 編集モードでタグを追加・削除でき、保存後に反映される
- [ ] 自作品の編集モードで素材を追加・削除でき、保存後に反映される
- [ ] 既存の購入情報・制作情報・公開設定の編集は引き続き動作する
- [ ] 全テスト PASS、TypeScript エラーなし
