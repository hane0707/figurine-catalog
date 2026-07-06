# `/p/[id]` 削除 & カバー写真変更機能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/p/[id]` 公開ルートを完全削除し、編集モードでカバー写真を変更できるようにする

**Architecture:** (1) `/p/[id]` ルートファイルと詳細ページ内 PUBLIC リンクを削除。(2) `PATCH /api/photos/[id]` エンドポイントを追加してカバー設定を永続化。(3) 編集パネルの写真グリッドで COVER バッジ表示とクリックによるカバー変更を実装する。

**Tech Stack:** SvelteKit (Svelte 5 runes), TypeScript, Drizzle ORM, Cloudflare Workers, Vitest

---

## ファイル構成

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `src/routes/p/[id]/+page.server.ts` | 削除 | `/p/[id]` ルート廃止 |
| `src/routes/p/[id]/+page.svelte` | 削除 | `/p/[id]` ルート廃止 |
| `src/routes/items/[id]/+page.svelte` | 修正 | PUBLIC リンク削除・カバー変更 UI |
| `src/routes/api/photos/[id]/+server.ts` | 修正 | PATCH ハンドラ追加 |
| `src/routes/api/photos/[id]/server.test.ts` | 新規 | PATCH ハンドラのテスト |

---

## Task 1: `/p/[id]` ルート削除

**Files:**
- Delete: `src/routes/p/[id]/+page.server.ts`
- Delete: `src/routes/p/[id]/+page.svelte`
- Modify: `src/routes/items/[id]/+page.svelte`

- [ ] **Step 1: p/[id] のファイルを削除する**

```bash
cd /home/haku/projects/figurine-catalog && git rm src/routes/p/[id]/+page.server.ts src/routes/p/[id]/+page.svelte
```

- [ ] **Step 2: 詳細ページの PUBLIC リンクブロックを削除する**

`src/routes/items/[id]/+page.svelte` の以下のブロック（表示モードの `{#if item.isPublic}` ブロック）を削除する:

```svelte
          {#if item.isPublic}
            <div style="margin-top:8px">
              <a href="/p/{item.id}" style="font-family:var(--f-mono); font-size:10px; letter-spacing:0.1em; color:var(--accent-haze); text-decoration:none">
                PUBLIC · /p/{item.id}
              </a>
            </div>
          {/if}
```

- [ ] **Step 3: コミット**

```bash
cd /home/haku/projects/figurine-catalog && git add src/routes/items/[id]/+page.svelte && git commit -m "feat: /p/[id] ルートを削除し PUBLIC リンクを除去"
```

---

## Task 2: PATCH `/api/photos/[id]` — テスト先行

**Files:**
- Create: `src/routes/api/photos/[id]/server.test.ts`

- [ ] **Step 1: テストファイルを作成する**

```typescript
// src/routes/api/photos/[id]/server.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH } from './+server';

const mockPhotoRows = vi.fn();
const mockWhere = vi.fn().mockResolvedValue(undefined);

vi.mock('$lib/server/db', () => ({
  getDb: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: mockPhotoRows,
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: mockWhere,
      })),
    })),
  })),
  photos: {},
}));

const ctx = (locals: Record<string, unknown> = { user: { email: 'test@example.com' } }) => ({
  params: { id: 'photo-1' },
  platform: { env: { DB: {} } },
  locals,
  request: new Request('http://localhost'),
});

describe('PATCH /api/photos/[id]: カバー写真設定', () => {
  beforeEach(() => vi.clearAllMocks());

  it('未ログイン → 401', async () => {
    await expect(PATCH(ctx({}) as any)).rejects.toMatchObject({ status: 401 });
  });

  it('写真が存在しない → 404', async () => {
    mockPhotoRows.mockResolvedValue([]);
    await expect(PATCH(ctx() as any)).rejects.toMatchObject({ status: 404 });
  });

  it('ログイン済み + 写真存在 → ok: true', async () => {
    mockPhotoRows.mockResolvedValue([{ id: 'photo-1', itemId: 'item-1', isCover: 0 }]);
    const res = await PATCH(ctx() as any);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: テストを実行して FAIL を確認する**

```bash
cd /home/haku/projects/figurine-catalog && npx vitest run src/routes/api/photos/[id]/server.test.ts
```

期待: 3テスト全て FAIL（PATCH エクスポートが存在しないため）

---

## Task 3: PATCH `/api/photos/[id]` 実装

**Files:**
- Modify: `src/routes/api/photos/[id]/+server.ts`

- [ ] **Step 1: PATCH ハンドラを追加する**

`src/routes/api/photos/[id]/+server.ts` の末尾（`export const DELETE` の後）に以下を追加:

```typescript
export const PATCH: RequestHandler = async ({ params, platform, locals }) => {
  if (!locals.user) throw error(401, 'Unauthorized');
  const db = getDb(platform!.env.DB);

  const [photo] = await db.select().from(photos).where(eq(photos.id, params.id));
  if (!photo) throw error(404, '写真が見つかりません');

  await db.update(photos).set({ isCover: 0 }).where(eq(photos.itemId, photo.itemId));
  await db.update(photos).set({ isCover: 1 }).where(eq(photos.id, params.id));

  return json({ ok: true });
};
```

- [ ] **Step 2: テストを実行して全件 PASS を確認する**

```bash
cd /home/haku/projects/figurine-catalog && npx vitest run src/routes/api/photos/[id]/server.test.ts
```

期待: 3テスト全て PASS

- [ ] **Step 3: コミット**

```bash
cd /home/haku/projects/figurine-catalog && git add src/routes/api/photos/[id]/+server.ts src/routes/api/photos/[id]/server.test.ts && git commit -m "feat: PATCH /api/photos/[id] でカバー写真設定エンドポイントを追加"
```

---

## Task 4: 編集パネルのカバー写真変更 UI

**Files:**
- Modify: `src/routes/items/[id]/+page.svelte`

- [ ] **Step 1: `editPhotos` の型を変更し、`startEdit()` の初期化を更新する**

`src/routes/items/[id]/+page.svelte` を読み、以下の変更を適用する。

`let editPhotos = $state<Array<{ id: string; thumbUrl: string }>>([]);` を:

```typescript
  let editPhotos = $state<Array<{ id: string; thumbUrl: string; isCover: number }>>([]);
```

`startEdit()` 内の `editPhotos = item.photos.map(...)` を:

```typescript
    editPhotos = item.photos.map((p: any) => ({ id: p.id, thumbUrl: p.thumbUrl, isCover: p.isCover }));
```

- [ ] **Step 2: `setCover()` 関数を追加する**

`deleteEditPhoto` 関数の直後に以下を追加:

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

- [ ] **Step 3: 写真グリッドの UI を更新する**

編集パネル内の `{#each editPhotos as photo (photo.id)}` ブロックを以下で置き換える:

```svelte
                {#each editPhotos as photo (photo.id)}
                  <button
                    type="button"
                    onclick={() => setCover(photo.id)}
                    style="position:relative; aspect-ratio:1; border-radius:var(--radius-sm); overflow:hidden; box-shadow:var(--neu-soft); background:none; border:{photo.isCover ? '2px solid var(--accent-haze)' : '2px solid transparent'}; padding:0; cursor:pointer; display:block; width:100%"
                  >
                    <img src={photo.thumbUrl} alt="" style="width:100%; height:100%; object-fit:cover; display:block" />
                    {#if photo.isCover}
                      <div style="position:absolute; top:4px; left:4px; background:var(--accent-haze); color:#fff; font-family:var(--f-mono); font-size:9px; letter-spacing:0.08em; padding:2px 5px; border-radius:3px; pointer-events:none">COVER</div>
                    {/if}
                    <button
                      type="button"
                      onclick={(e) => { e.stopPropagation(); deleteEditPhoto(photo.id); }}
                      style="position:absolute; top:4px; right:4px; width:20px; height:20px; border-radius:50%; background:rgba(0,0,0,0.6); color:#fff; border:none; cursor:pointer; display:grid; place-items:center; font-size:12px; line-height:1; padding:0"
                    >×</button>
                  </button>
                {/each}
```

- [ ] **Step 4: 全テストを実行して PASS を確認する**

```bash
cd /home/haku/projects/figurine-catalog && npx vitest run
```

期待: 全テスト PASS

- [ ] **Step 5: コミット**

```bash
cd /home/haku/projects/figurine-catalog && git add src/routes/items/[id]/+page.svelte && git commit -m "feat: 編集モードでカバー写真の視覚的識別と変更機能を追加"
```
