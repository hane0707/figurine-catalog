# /items 一覧ページの公開化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** コレクション一覧（`/items`）を未認証ユーザーにも公開し、編集・登録操作のみ認証必須にする。

**Architecture:** `/items/+layout.server.ts` の blanket 認証ガードを削除し、`/items/new` と `/items/[id]` の各 `+page.server.ts` に個別のガードを追加する。`/items` 自体は誰でもアクセス可能になり、FAB などの操作UIは既存の `{#if data.user}` 制御がそのまま機能する。

**Tech Stack:** SvelteKit 5 / TypeScript / Cloudflare Workers / Vitest

---

### Task 1: layout 認証ガードの削除

**Files:**
- Delete: `src/routes/items/+layout.server.ts`
- Delete: `src/routes/items/layout.server.test.ts`

- [ ] **Step 1: レイアウトファイルとテストファイルを削除**

```bash
cd /home/haku/projects/figurine-catalog
rm src/routes/items/+layout.server.ts
rm src/routes/items/layout.server.test.ts
```

- [ ] **Step 2: テストが通ることを確認**

```bash
npm test
```

期待: 全テストパス（削除したテストファイルが消えていること）

- [ ] **Step 3: 型チェック**

```bash
npm run check
```

エラーなしで通ること。

- [ ] **Step 4: コミット**

```bash
git add -u src/routes/items/+layout.server.ts src/routes/items/layout.server.test.ts
git commit -m "認証: /itemsのblanket認証ガードを削除（一覧を公開化）"
```

---

### Task 2: /items/new に個別認証ガードを追加（TDD）

**Files:**
- Modify: `src/routes/items/new/+page.server.ts`
- Create: `src/routes/items/new/page.server.test.ts`

- [ ] **Step 1: テストを先に書く**

`src/routes/items/new/page.server.test.ts` を新規作成:

```ts
import { describe, it, expect } from 'vitest';
import { load } from './+page.server';

describe('/items/new load: 認証ガード', () => {
  it('locals.user がない場合は /admin へ 302 リダイレクト', () => {
    try {
      load({ locals: {}, platform: { env: {} } } as any);
      expect.fail('リダイレクトが throw されるべき');
    } catch (e: any) {
      expect(e.status).toBe(302);
      expect(e.location).toBe('/admin');
    }
  });
});
```

- [ ] **Step 2: テスト実行（失敗確認）**

```bash
npm test -- page.server.test
```

期待: 上記テストが FAIL（現在ガードなし、redirect が throw されない）

- [ ] **Step 3: 実装を変更**

`src/routes/items/new/+page.server.ts` を以下に置き換え:

```ts
// src/routes/items/new/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb, tags, materials } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals, platform }) => {
  if (!locals.user) throw redirect(302, '/admin');

  const db = getDb(platform!.env.DB);
  const [allTags, allMaterials] = await Promise.all([
    db.select().from(tags).orderBy(tags.name),
    db.select().from(materials),
  ]);
  const frequent = allMaterials.filter((m) => m.isPreset).slice(0, 6);
  return {
    allTags,
    materials: { all: allMaterials, frequent },
  };
};
```

- [ ] **Step 4: テストが通ることを確認**

```bash
npm test -- page.server.test
```

期待: PASS

- [ ] **Step 5: 型チェック**

```bash
npm run check
```

エラーなしで通ること。

- [ ] **Step 6: コミット**

```bash
git add src/routes/items/new/+page.server.ts src/routes/items/new/page.server.test.ts
git commit -m "認証: /items/newに認証ガードを追加"
```

---

### Task 3: /items/[id] に個別認証ガードを追加（TDD）

**Files:**
- Modify: `src/routes/items/[id]/+page.server.ts`
- Create: `src/routes/items/[id]/page.server.test.ts`

- [ ] **Step 1: テストを先に書く**

`src/routes/items/[id]/page.server.test.ts` を新規作成:

```ts
import { describe, it, expect } from 'vitest';
import { load } from './+page.server';

describe('/items/[id] load: 認証ガード', () => {
  it('locals.user がない場合は /admin へ 302 リダイレクト', () => {
    try {
      load({ locals: {}, params: { id: 'test-id' }, platform: { env: {} } } as any);
      expect.fail('リダイレクトが throw されるべき');
    } catch (e: any) {
      expect(e.status).toBe(302);
      expect(e.location).toBe('/admin');
    }
  });
});
```

- [ ] **Step 2: テスト実行（失敗確認）**

```bash
npm test -- "items/\[id\]/page.server.test"
```

期待: FAIL（現在ガードなし）

- [ ] **Step 3: 実装を変更**

`src/routes/items/[id]/+page.server.ts` の `load` 関数の先頭に認証ガードを追加:

```ts
// src/routes/items/[id]/+page.server.ts
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb, items, tags, materials } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { getPresignedGetUrl } from '$lib/server/r2';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
  if (!locals.user) throw redirect(302, '/admin');

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

- [ ] **Step 4: テストが通ることを確認**

```bash
npm test -- "items/\[id\]/page.server.test"
```

期待: PASS

- [ ] **Step 5: 全テスト確認**

```bash
npm test
```

期待: 全テストパス

- [ ] **Step 6: 型チェック**

```bash
npm run check
```

エラーなしで通ること。

- [ ] **Step 7: コミット**

```bash
git add src/routes/items/[id]/+page.server.ts src/routes/items/[id]/page.server.test.ts
git commit -m "認証: /items/[id]に認証ガードを追加"
```

---

### Task 4: docs/auth.md と README.md を更新

**Files:**
- Modify: `docs/auth.md`
- Modify: `README.md`

- [ ] **Step 1: docs/auth.md のルート表を更新**

`docs/auth.md` のルート別アクセス制御テーブルを以下に更新:

変更前:
```markdown
| `/items` | 必要 | 未認証なら `/admin` へリダイレクト |
| `/items/[id]` | 必要 | 同上 |
| `/items/new` | 必要 | 同上 |
```

変更後:
```markdown
| `/items` | 不要 | 誰でも閲覧可。FAB等の操作UIは `data.user` がある場合のみ表示 |
| `/items/[id]` | 必要 | 未認証なら `/admin` へリダイレクト |
| `/items/new` | 必要 | 未認証なら `/admin` へリダイレクト |
```

- [ ] **Step 2: README.md のルーティングテーブルを更新（208〜210行目付近）**

変更前:
```markdown
| `/items` | コレクション一覧 | 必要 |
```

変更後:
```markdown
| `/items` | コレクション一覧（閲覧は誰でも可） | 不要 |
```

- [ ] **Step 3: README.md の Cloudflare Access 保護パスを更新（183行目付近）**

変更前:
```markdown
- `https://your-domain.com/items`
- `https://your-domain.com/items/*`
```

変更後:
```markdown
- `https://your-domain.com/items/*`
```

（`/items` 単体は削除、`/items/*` は維持）

- [ ] **Step 4: コミット**

```bash
git add docs/auth.md README.md
git commit -m "docs: /items公開化に合わせて認証ドキュメントを更新"
```
