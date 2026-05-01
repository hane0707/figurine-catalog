# 入力バリデーション実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zod を導入してフロント・API 両層に入力バリデーションを追加し、不正値の登録と攻撃者による悪用を防ぐ。

**Architecture:** `$lib/validation/schemas.ts` に Zod スキーマを一元定義し、API・フロント両方で共用する。API は失敗時に汎用エラーのみ返す。フロントは on-blur でインラインエラーを表示する。

**Tech Stack:** Zod, SvelteKit, Vitest

---

## ファイル構成

| ファイル | 役割 |
|---|---|
| `src/lib/validation/schemas.ts` | Zod スキーマ定義（全フィールド制約） |
| `src/lib/validation/errors.ts` | API 用汎用エラーヘルパー |
| `src/lib/validation/schemas.test.ts` | スキーマ単体テスト |
| `src/routes/api/items/+server.ts` | POST/GET にスキーマ検証を追加 |
| `src/routes/api/items/[id]/+server.ts` | PATCH に全フィールド検証を追加 |
| `src/routes/api/tags/+server.ts` | POST に name 文字数検証を追加 |
| `src/routes/api/materials/+server.ts` | POST に name 文字数検証を追加 |
| `src/routes/api/photos/[id]/+server.ts` | POST に itemId 形式・sortOrder 範囲を追加 |
| `src/routes/items/new/+page.svelte` | on-blur インラインエラー追加 |
| `src/routes/items/[id]/+page.svelte` | on-blur インラインエラー追加 |

---

## Task 1: Zod をインストールする

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Zod をインストール**

```bash
npm install zod
```

Expected: `package.json` の `dependencies` に `"zod": "^3.x.x"` が追加される。

- [ ] **Step 2: インストール確認**

```bash
node -e "import('zod').then(z => console.log(z.z.string().parse('ok')))"
```

Expected: `ok` が出力される。

- [ ] **Step 3: コミット**

```bash
git add package.json package-lock.json
git commit -m "chore: zod を追加"
```

---

## Task 2: Zod スキーマを定義する

**Files:**
- Create: `src/lib/validation/schemas.ts`
- Create: `src/lib/validation/schemas.test.ts`

- [ ] **Step 1: スキーマのテストを書く**

`src/lib/validation/schemas.test.ts` を作成:

```typescript
import { describe, it, expect } from 'vitest';
import {
  itemWriteSchema,
  purchaseInfoSchema,
  handmadeInfoBaseSchema,
  handmadeInfoSchema,
  tagNameSchema,
  materialNameSchema,
  clientIdSchema,
  paginationSchema,
  photoPostSchema,
} from './schemas';

const ID = 'abc123';

describe('clientIdSchema', () => {
  it('有効な英数字ハイフンアンダースコアを受け入れる', () => {
    expect(clientIdSchema.safeParse('abc-123_XYZ').success).toBe(true);
  });
  it('空文字を拒否する', () => {
    expect(clientIdSchema.safeParse('').success).toBe(false);
  });
  it('36文字超えを拒否する', () => {
    expect(clientIdSchema.safeParse('a'.repeat(37)).success).toBe(false);
  });
  it('スラッシュを拒否する', () => {
    expect(clientIdSchema.safeParse('abc/def').success).toBe(false);
  });
});

describe('tagNameSchema', () => {
  it('1〜50文字を受け入れる', () => {
    expect(tagNameSchema.safeParse('タグ').success).toBe(true);
    expect(tagNameSchema.safeParse('a'.repeat(50)).success).toBe(true);
  });
  it('空文字を拒否する', () => {
    expect(tagNameSchema.safeParse('').success).toBe(false);
  });
  it('51文字を拒否する', () => {
    expect(tagNameSchema.safeParse('a'.repeat(51)).success).toBe(false);
  });
});

describe('purchaseInfoSchema', () => {
  it('null フィールドを許可する', () => {
    expect(purchaseInfoSchema.safeParse({
      storeName: null, eventName: null, purchaseDate: null,
      purchasePrice: null, maker: null, artistName: null,
    }).success).toBe(true);
  });
  it('purchasePrice が負数は拒否する', () => {
    expect(purchaseInfoSchema.safeParse({ purchasePrice: -1 }).success).toBe(false);
  });
  it('purchasePrice が 100000001 は拒否する', () => {
    expect(purchaseInfoSchema.safeParse({ purchasePrice: 100_000_001 }).success).toBe(false);
  });
  it('purchaseDate が不正フォーマットは拒否する', () => {
    expect(purchaseInfoSchema.safeParse({ purchaseDate: '2024/01/01' }).success).toBe(false);
  });
  it('purchaseDate が YYYY-MM-DD 形式は受け入れる', () => {
    expect(purchaseInfoSchema.safeParse({ purchaseDate: '2024-01-15' }).success).toBe(true);
  });
  it('storeName が 101 文字は拒否する', () => {
    expect(purchaseInfoSchema.safeParse({ storeName: 'a'.repeat(101) }).success).toBe(false);
  });
});

describe('handmadeInfoSchema', () => {
  it('productionEnd が productionStart より前は拒否する', () => {
    expect(handmadeInfoSchema.safeParse({
      productionStart: '2024-06-01',
      productionEnd: '2024-05-31',
    }).success).toBe(false);
  });
  it('productionEnd が productionStart と同日は許可する', () => {
    expect(handmadeInfoSchema.safeParse({
      productionStart: '2024-06-01',
      productionEnd: '2024-06-01',
    }).success).toBe(true);
  });
  it('productionEnd のみ入力は許可する', () => {
    expect(handmadeInfoSchema.safeParse({
      productionStart: null,
      productionEnd: '2024-06-01',
    }).success).toBe(true);
  });
  it('quote が 501 文字は拒否する', () => {
    expect(handmadeInfoSchema.safeParse({ quote: 'a'.repeat(501) }).success).toBe(false);
  });
  it('notes が 2001 文字は拒否する', () => {
    expect(handmadeInfoSchema.safeParse({ notes: 'a'.repeat(2001) }).success).toBe(false);
  });
});

describe('itemWriteSchema', () => {
  it('tagIds が 51 件は拒否する', () => {
    expect(itemWriteSchema.safeParse({ tagIds: Array(51).fill(ID) }).success).toBe(false);
  });
  it('isHandmade が 2 は拒否する', () => {
    expect(itemWriteSchema.safeParse({ isHandmade: 2 }).success).toBe(false);
  });
  it('name が 101 文字は拒否する', () => {
    expect(itemWriteSchema.safeParse({ name: 'a'.repeat(101) }).success).toBe(false);
  });
});

describe('paginationSchema', () => {
  it('offset が負数は拒否する', () => {
    expect(paginationSchema.safeParse({ offset: -1 }).success).toBe(false);
  });
  it('limit が 0 は拒否する', () => {
    expect(paginationSchema.safeParse({ limit: 0 }).success).toBe(false);
  });
});

describe('photoPostSchema', () => {
  it('sortOrder が負数は拒否する', () => {
    expect(photoPostSchema.safeParse({
      itemId: ID, r2KeyOrig: 'items/x/orig_y.jpg', r2KeyThumb: 'items/x/thumb_y.webp', sortOrder: -1,
    }).success).toBe(false);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npm test -- schemas.test
```

Expected: FAIL（schemas.ts が存在しない）

- [ ] **Step 3: スキーマを実装する**

`src/lib/validation/schemas.ts` を作成:

```typescript
import { z } from 'zod';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[a-zA-Z0-9_-]+$/;

export const clientIdSchema = z.string().regex(ID_RE).max(36);

export const tagNameSchema = z.string().min(1).max(50);
export const materialNameSchema = z.string().min(1).max(50);

export const purchaseInfoSchema = z.object({
  storeName:     z.string().max(100).nullable().optional(),
  eventName:     z.string().max(100).nullable().optional(),
  purchaseDate:  z.string().regex(DATE_RE).nullable().optional(),
  purchasePrice: z.number().int().min(0).max(100_000_000).nullable().optional(),
  maker:         z.string().max(100).nullable().optional(),
  artistName:    z.string().max(100).nullable().optional(),
});

export const handmadeInfoBaseSchema = z.object({
  productionStart: z.string().regex(DATE_RE).nullable().optional(),
  productionEnd:   z.string().regex(DATE_RE).nullable().optional(),
  quote: z.string().max(500).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

// refine を持つ ZodEffects は .shape を持たないため、フィールド単体検証には
// handmadeInfoBaseSchema.shape を使い、前後関係チェックにはこちらを使う
export const handmadeInfoSchema = handmadeInfoBaseSchema.refine(
  (d) => {
    if (d.productionStart && d.productionEnd) {
      return d.productionStart <= d.productionEnd;
    }
    return true;
  },
  { message: '終了日は開始日以降の日付を入力してください', path: ['productionEnd'] }
);

export const itemWriteSchema = z.object({
  name:                 z.string().max(100).nullable().optional(),
  series:               z.string().max(100).nullable().optional(),
  isHandmade:           z.union([z.literal(0), z.literal(1), z.null()]).optional(),
  isPublic:             z.union([z.literal(0), z.literal(1)]).optional(),
  purchaseInfoPublic:   z.union([z.literal(0), z.literal(1)]).optional(),
  handmadeInfoPublic:   z.union([z.literal(0), z.literal(1)]).optional(),
  status:               z.enum(['owned', 'parted']).optional(),
  purchaseInfo:         purchaseInfoSchema.nullable().optional(),
  handmadeInfo:         handmadeInfoSchema.nullable().optional(),
  tagIds:               z.array(z.string().regex(ID_RE)).max(50).optional(),
  materialIds:          z.array(z.string().regex(ID_RE)).max(50).optional(),
});

export const itemPostSchema = z.object({
  id:   clientIdSchema.optional(),
  name: z.string().max(100).nullable().optional(),
});

export const paginationSchema = z.object({
  limit:  z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export const photoPostSchema = z.object({
  itemId:    z.string().regex(ID_RE),
  r2KeyOrig: z.string(),
  r2KeyThumb: z.string(),
  sortOrder: z.number().int().min(0).optional(),
});
```

- [ ] **Step 4: テストがパスすることを確認**

```bash
npm test -- schemas.test
```

Expected: PASS（全テスト）

- [ ] **Step 5: コミット**

```bash
git add src/lib/validation/schemas.ts src/lib/validation/schemas.test.ts
git commit -m "feat: Zod バリデーションスキーマを追加"
```

---

## Task 3: API エラーヘルパーを作成する

**Files:**
- Create: `src/lib/validation/errors.ts`

- [ ] **Step 1: errors.ts を作成**

```typescript
// src/lib/validation/errors.ts
import { json } from '@sveltejs/kit';
import type { ZodError } from 'zod';

export function validationError(err: ZodError) {
  console.error('[validation]', err.flatten());
  return json({ code: 'VALIDATION_ERROR', message: '入力値が不正です' }, { status: 400 });
}
```

- [ ] **Step 2: コミット**

```bash
git add src/lib/validation/errors.ts
git commit -m "feat: API バリデーションエラーヘルパーを追加"
```

---

## Task 4: POST /api/items と GET /api/items にバリデーションを追加する

**Files:**
- Modify: `src/routes/api/items/+server.ts`

- [ ] **Step 1: POST/GET のバリデーションテストを追加する**

`src/routes/api/items/server.test.ts` を作成:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { POST, GET } from './+server';

vi.mock('$lib/server/db', () => ({
  getDb: vi.fn(() => ({
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => ({
                offset: vi.fn().mockResolvedValue([]),
              })),
            })),
          })),
        })),
      })),
    })),
  })),
  items: {},
  photos: {},
  itemTags: {},
  tags: {},
}));
vi.mock('$lib/server/r2', () => ({ getPresignedGetUrl: vi.fn().mockResolvedValue('') }));
vi.mock('$lib/utils/uuid', () => ({ generateId: vi.fn(() => 'generated-id') }));

const makeRequest = (body: unknown) =>
  new Request('http://localhost/api/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const platform = { env: { DB: {} } };
const locals = { user: { email: 'test@example.com' } };

describe('POST /api/items バリデーション', () => {
  it('name が 101 文字 → 400', async () => {
    const res = await POST({ request: makeRequest({ name: 'a'.repeat(101) }), platform, locals } as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('id に スラッシュ → 400', async () => {
    const res = await POST({ request: makeRequest({ id: 'bad/id' }), platform, locals } as any);
    expect(res.status).toBe(400);
  });

  it('正常なリクエスト → 201', async () => {
    const res = await POST({ request: makeRequest({ name: 'フィギュア' }), platform, locals } as any);
    expect(res.status).toBe(201);
  });
});

describe('GET /api/items バリデーション', () => {
  it('offset が負数 → 400', async () => {
    const url = new URL('http://localhost/api/items?offset=-1');
    const res = await GET({ url, platform, locals } as any);
    expect(res.status).toBe(400);
  });

  it('正常なリクエスト → 200', async () => {
    const url = new URL('http://localhost/api/items');
    const res = await GET({ url, platform, locals } as any);
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npm test -- api/items/server.test
```

Expected: FAIL

- [ ] **Step 3: +server.ts に検証を追加する**

`src/routes/api/items/+server.ts` の冒頭 import に追加:

```typescript
import { itemPostSchema, paginationSchema } from '$lib/validation/schemas';
import { validationError } from '$lib/validation/errors';
```

`POST` ハンドラの `const body = ...` の直後に追加:

```typescript
  const parsed = itemPostSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
```

`GET` ハンドラの `const limit = ...` の前に追加:

```typescript
  const rawOffset = Number(url.searchParams.get('offset') ?? 0);
  const rawLimit = Math.min(Number(url.searchParams.get('limit') ?? 30), 100);
  const paginationParsed = paginationSchema.safeParse({ offset: rawOffset, limit: rawLimit });
  if (!paginationParsed.success) return validationError(paginationParsed.error);
  const limit = rawLimit;
  const offset = rawOffset;
```

既存の `const limit = ...` と `const offset = ...` 行を削除する（上記で置き換え）。

- [ ] **Step 4: テストがパスすることを確認**

```bash
npm test -- api/items/server.test
```

Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/routes/api/items/+server.ts src/routes/api/items/server.test.ts
git commit -m "feat: POST/GET /api/items にバリデーションを追加"
```

---

## Task 5: PATCH /api/items/[id] にバリデーションを追加する

**Files:**
- Modify: `src/routes/api/items/[id]/+server.ts`

- [ ] **Step 1: PATCH バリデーションのテストを追加する**

`src/routes/api/items/[id]/server.test.ts` を作成:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { PATCH } from './+server';

vi.mock('$lib/server/db', () => ({
  getDb: vi.fn(() => ({
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })) })),
    delete: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
  })),
  items: {}, purchaseInfo: {}, handmadeInfo: {}, itemTags: {}, itemMaterials: {},
}));

const makeCtx = (body: unknown) => ({
  params: { id: 'item-1' },
  platform: { env: { DB: {} } },
  locals: { user: { email: 'test@example.com' } },
  request: new Request('http://localhost', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),
});

describe('PATCH /api/items/[id] バリデーション', () => {
  it('name が 101 文字 → 400', async () => {
    const res = await PATCH(makeCtx({ name: 'a'.repeat(101) }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('purchasePrice が負数 → 400', async () => {
    const res = await PATCH(makeCtx({ purchaseInfo: { purchasePrice: -1 } }) as any);
    expect(res.status).toBe(400);
  });

  it('productionEnd が productionStart より前 → 400', async () => {
    const res = await PATCH(makeCtx({
      handmadeInfo: { productionStart: '2024-06-01', productionEnd: '2024-05-31' },
    }) as any);
    expect(res.status).toBe(400);
  });

  it('isHandmade が 2 → 400', async () => {
    const res = await PATCH(makeCtx({ isHandmade: 2 }) as any);
    expect(res.status).toBe(400);
  });

  it('正常なリクエスト → ok: true', async () => {
    const res = await PATCH(makeCtx({ name: 'テスト' }) as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npm test -- api/items/\[id\]/server.test
```

Expected: FAIL

- [ ] **Step 3: PATCH ハンドラに検証を追加する**

`src/routes/api/items/[id]/+server.ts` の冒頭 import に追加:

```typescript
import { itemWriteSchema } from '$lib/validation/schemas';
import { validationError } from '$lib/validation/errors';
```

`PATCH` ハンドラの `const body = ...` の直後、`const now = ...` の前に追加:

```typescript
  const parsed = itemWriteSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
```

また、既存の個別チェック（`isPublic`, `status`, `tagIds`, `materialIds` の手動チェック）は Zod スキーマが代替するため削除する:

削除する行（4 箇所）:
```typescript
  // isPublic / status の入力バリデーション
  if ('isPublic' in body && ![0, 1].includes(body.isPublic as number)) {
    throw error(400, 'isPublic は 0 または 1 のみ有効です');
  }
  if ('status' in body && !['owned', 'parted'].includes(body.status as string)) {
    throw error(400, 'status は owned または parted のみ有効です');
  }
```

```typescript
    if (!Array.isArray(body.tagIds)) throw error(400, 'tagIds は配列である必要があります');
    if (body.tagIds.length > 50) throw error(400, 'タグ数の上限は 50 です');
```

```typescript
    if (!Array.isArray(body.materialIds)) throw error(400, 'materialIds は配列である必要があります');
    if (body.materialIds.length > 50) throw error(400, '素材数の上限は 50 です');
```

- [ ] **Step 4: テストがパスすることを確認**

```bash
npm test -- api/items/\[id\]/server.test
```

Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/routes/api/items/[id]/+server.ts src/routes/api/items/[id]/server.test.ts
git commit -m "feat: PATCH /api/items/[id] にバリデーションを追加"
```

---

## Task 6: /api/tags・/api/materials・/api/photos にバリデーションを追加する

**Files:**
- Modify: `src/routes/api/tags/+server.ts`
- Modify: `src/routes/api/materials/+server.ts`
- Modify: `src/routes/api/photos/[id]/+server.ts`

- [ ] **Step 1: tags のバリデーションを追加**

`src/routes/api/tags/+server.ts` の冒頭 import に追加:

```typescript
import { tagNameSchema } from '$lib/validation/schemas';
import { validationError } from '$lib/validation/errors';
```

`POST` ハンドラの `const normalized = name.trim();` の後の空チェックを置き換える:

```typescript
  // 既存: if (!normalized) return json({ error: 'タグ名が空です' }, { status: 400 });
  // 置き換え後:
  const nameResult = tagNameSchema.safeParse(normalized);
  if (!nameResult.success) return validationError(nameResult.error);
```

- [ ] **Step 2: materials のバリデーションを追加**

`src/routes/api/materials/+server.ts` の冒頭 import に追加:

```typescript
import { materialNameSchema } from '$lib/validation/schemas';
import { validationError } from '$lib/validation/errors';
```

`POST` ハンドラの空チェックを置き換える:

```typescript
  // 既存: if (!normalized) return json({ error: '素材名が空です' }, { status: 400 });
  // 置き換え後:
  const nameResult = materialNameSchema.safeParse(normalized);
  if (!nameResult.success) return validationError(nameResult.error);
```

- [ ] **Step 3: photos/[id] のバリデーションを追加**

`src/routes/api/photos/[id]/+server.ts` の冒頭 import に追加:

```typescript
import { photoPostSchema } from '$lib/validation/schemas';
import { validationError } from '$lib/validation/errors';
```

`POST` ハンドラの `const { itemId, r2KeyOrig, r2KeyThumb, sortOrder } = body;` の前に追加:

```typescript
  const parsed = photoPostSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
```

- [ ] **Step 4: 全テストがパスすることを確認**

```bash
npm test
```

Expected: PASS（既存テストを含む全テスト）

- [ ] **Step 5: コミット**

```bash
git add src/routes/api/tags/+server.ts src/routes/api/materials/+server.ts src/routes/api/photos/[id]/+server.ts
git commit -m "feat: tags/materials/photos API にバリデーションを追加"
```

---

## Task 7: 新規登録ウィザードにインラインバリデーションを追加する

**Files:**
- Modify: `src/routes/items/new/+page.svelte`

- [ ] **Step 1: エラー状態とバリデーション関数を追加する**

`<script lang="ts">` ブロックの既存 import 行の後に追加:

```typescript
  import { itemWriteSchema, purchaseInfoSchema, handmadeInfoBaseSchema, handmadeInfoSchema, tagNameSchema } from '$lib/validation/schemas';

  // フィールドエラー状態
  let nameError = $state('');
  let seriesError = $state('');
  let storeNameError = $state('');
  let eventNameError = $state('');
  let purchaseDateError = $state('');
  let purchasePriceError = $state('');
  let makerError = $state('');
  let artistNameError = $state('');
  let productionStartError = $state('');
  let productionEndError = $state('');
  let quoteError = $state('');
  let notesError = $state('');

  function validateField<T>(schema: import('zod').ZodType<T>, value: T): string {
    const r = schema.safeParse(value);
    return r.success ? '' : (r.error.errors[0]?.message ?? '入力値が不正です');
  }

  function validateName() { nameError = validateField(itemWriteSchema.shape.name, name || null); }
  function validateSeries() { seriesError = validateField(itemWriteSchema.shape.series, series || null); }
  function validateStoreName() { storeNameError = validateField(purchaseInfoSchema.shape.storeName, storeName || null); }
  function validateEventName() { eventNameError = validateField(purchaseInfoSchema.shape.eventName, eventName || null); }
  function validatePurchaseDate() { purchaseDateError = validateField(purchaseInfoSchema.shape.purchaseDate, purchaseDate || null); }
  function validatePurchasePrice() {
    const v = purchasePrice ? Number(purchasePrice) : null;
    purchasePriceError = validateField(purchaseInfoSchema.shape.purchasePrice, v);
  }
  function validateMaker() { makerError = validateField(purchaseInfoSchema.shape.maker, maker || null); }
  function validateArtistName() { artistNameError = validateField(purchaseInfoSchema.shape.artistName, artistName || null); }
  function validateProductionStart() { productionStartError = validateField(handmadeInfoBaseSchema.shape.productionStart, productionStart || null); }
  function validateProductionEnd() {
    const r = handmadeInfoSchema.safeParse({
      productionStart: productionStart || null,
      productionEnd: productionEnd || null,
    });
    productionEndError = r.success ? '' : (r.error.errors.find(e => e.path[0] === 'productionEnd')?.message ?? '');
  }
  function validateQuote() { quoteError = validateField(handmadeInfoBaseSchema.shape.quote, quote || null); }
  function validateNotes() { notesError = validateField(handmadeInfoBaseSchema.shape.notes, notes || null); }

  function hasErrors(): boolean {
    return !![nameError, seriesError, storeNameError, eventNameError, purchaseDateError,
      purchasePriceError, makerError, artistNameError, productionStartError,
      productionEndError, quoteError, notesError].find(Boolean);
  }
```

- [ ] **Step 2: saveAndFinish に最終ゲートを追加する**

`saveAndFinish` 関数の冒頭 `if (isSaving) return;` の次の行に追加:

```typescript
    // フロント最終バリデーション
    validateName(); validateSeries();
    if (isHandmade === 0) {
      validateStoreName(); validateEventName(); validatePurchaseDate();
      validatePurchasePrice(); validateMaker(); validateArtistName();
    } else if (isHandmade === 1) {
      validateProductionStart(); validateProductionEnd(); validateQuote(); validateNotes();
    }
    if (hasErrors()) return;
```

- [ ] **Step 3: フィールドに on-blur とエラー表示を追加する**

**basic ステップの name フィールド** を以下に置き換え:

```svelte
        <div class="field">
          <label>Name</label>
          <input type="text" bind:value={name} placeholder="アイテム名（スキップ可）" onblur={validateName} />
          {#if nameError}<p class="field-error">{nameError}</p>{/if}
        </div>
        <div class="field">
          <label>Series</label>
          <input type="text" bind:value={series} placeholder="シリーズ名（スキップ可）" onblur={validateSeries} />
          {#if seriesError}<p class="field-error">{seriesError}</p>{/if}
        </div>
```

**details ステップ（購入品）** の各フィールドに `onblur` とエラー表示を追加:

```svelte
        <div class="field">
          <label>Store</label>
          <input type="text" bind:value={storeName} placeholder="店舗名 / ECサイト名" onblur={validateStoreName} />
          {#if storeNameError}<p class="field-error">{storeNameError}</p>{/if}
        </div>
        <div class="field">
          <label>Event</label>
          <input type="text" bind:value={eventName} placeholder="イベント名（例: ワンフェス2024夏）" onblur={validateEventName} />
          {#if eventNameError}<p class="field-error">{eventNameError}</p>{/if}
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px">
          <div class="field">
            <label>Date</label>
            <input bind:value={purchaseDate} type="date" onblur={validatePurchaseDate} />
            {#if purchaseDateError}<p class="field-error">{purchaseDateError}</p>{/if}
          </div>
          <div class="field">
            <label>Price ¥</label>
            <input bind:value={purchasePrice} type="number" min="0" max="100000000" placeholder="金額" onblur={validatePurchasePrice} />
            {#if purchasePriceError}<p class="field-error">{purchasePriceError}</p>{/if}
          </div>
        </div>
        <div class="field">
          <label>Maker</label>
          <input type="text" bind:value={maker} placeholder="メーカー名" onblur={validateMaker} />
          {#if makerError}<p class="field-error">{makerError}</p>{/if}
        </div>
        <div class="field">
          <label>Artist</label>
          <input type="text" bind:value={artistName} placeholder="作家名・原型師名" onblur={validateArtistName} />
          {#if artistNameError}<p class="field-error">{artistNameError}</p>{/if}
        </div>
```

**details ステップ（自作品）** の各フィールドに追加:

```svelte
        <div class="field">
          <label>Quote</label>
          <textarea bind:value={quote} placeholder="台詞・印象的なセリフ（スキップ可）" rows={2} onblur={validateQuote}></textarea>
          {#if quoteError}<p class="field-error">{quoteError}</p>{/if}
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px">
          <div class="field">
            <label>Started</label>
            <input bind:value={productionStart} type="date" onblur={validateProductionStart} />
            {#if productionStartError}<p class="field-error">{productionStartError}</p>{/if}
          </div>
          <div class="field">
            <label>Finished</label>
            <input bind:value={productionEnd} type="date" onblur={validateProductionEnd} />
            {#if productionEndError}<p class="field-error">{productionEndError}</p>{/if}
          </div>
        </div>
        <!-- 素材 TagPicker は変更なし -->
        <div class="field">
          <label>Notes</label>
          <textarea bind:value={notes} placeholder="制作メモ・塗装記録（自由記述）" rows={4} onblur={validateNotes}></textarea>
          {#if notesError}<p class="field-error">{notesError}</p>{/if}
        </div>
```

- [ ] **Step 4: field-error スタイルを app.css に追加する**

`src/app.css` の末尾に追加:

```css
.field-error {
  color: var(--error, #ef4444);
  font-size: 0.75rem;
  margin-top: 2px;
}
```

- [ ] **Step 5: 動作確認（手動）**

```bash
npm run dev
```

1. `/items/new` を開く
2. Name に 101 文字を入力してフォーカスを外す → エラー表示確認
3. 自作品を選び Started に `2024-06-01`、Finished に `2024-05-31` を入力して blur → エラー表示確認
4. 購入品の Price に `-100` を入力して blur → エラー表示確認
5. 全エラーが出た状態で「完了」を押す → 保存されないことを確認

- [ ] **Step 6: コミット**

```bash
git add src/routes/items/new/+page.svelte src/app.css
git commit -m "feat: 新規登録ウィザードにインラインバリデーションを追加"
```

---

## Task 8: 編集ページにインラインバリデーションを追加する

**Files:**
- Modify: `src/routes/items/[id]/+page.svelte`

- [ ] **Step 1: エラー状態とバリデーション関数を追加する**

`<script lang="ts">` ブロックの既存 import 行の後に追加（Task 7 と同じ構造）:

```typescript
  import { itemWriteSchema, purchaseInfoSchema, handmadeInfoBaseSchema, handmadeInfoSchema } from '$lib/validation/schemas';

  let editNameError = $state('');
  let editSeriesError = $state('');
  let editStoreNameError = $state('');
  let editEventNameError = $state('');
  let editPurchaseDateError = $state('');
  let editPurchasePriceError = $state('');
  let editMakerError = $state('');
  let editArtistNameError = $state('');
  let editProductionStartError = $state('');
  let editProductionEndError = $state('');
  let editQuoteError = $state('');
  let editNotesError = $state('');

  function validateEditField<T>(schema: import('zod').ZodType<T>, value: T): string {
    const r = schema.safeParse(value);
    return r.success ? '' : (r.error.errors[0]?.message ?? '入力値が不正です');
  }

  function validateEditName() { editNameError = validateEditField(itemWriteSchema.shape.name, editName || null); }
  function validateEditSeries() { editSeriesError = validateEditField(itemWriteSchema.shape.series, editSeries || null); }
  function validateEditStoreName() { editStoreNameError = validateEditField(purchaseInfoSchema.shape.storeName, editStoreName || null); }
  function validateEditEventName() { editEventNameError = validateEditField(purchaseInfoSchema.shape.eventName, editEventName || null); }
  function validateEditPurchaseDate() { editPurchaseDateError = validateEditField(purchaseInfoSchema.shape.purchaseDate, editPurchaseDate || null); }
  function validateEditPurchasePrice() {
    const v = editPurchasePrice ? Number(editPurchasePrice) : null;
    editPurchasePriceError = validateEditField(purchaseInfoSchema.shape.purchasePrice, v);
  }
  function validateEditMaker() { editMakerError = validateEditField(purchaseInfoSchema.shape.maker, editMaker || null); }
  function validateEditArtistName() { editArtistNameError = validateEditField(purchaseInfoSchema.shape.artistName, editArtistName || null); }
  function validateEditProductionStart() { editProductionStartError = validateEditField(handmadeInfoBaseSchema.shape.productionStart, editProductionStart || null); }
  function validateEditProductionEnd() {
    const r = handmadeInfoSchema.safeParse({
      productionStart: editProductionStart || null,
      productionEnd: editProductionEnd || null,
    });
    editProductionEndError = r.success ? '' : (r.error.errors.find(e => e.path[0] === 'productionEnd')?.message ?? '');
  }
  function validateEditQuote() { editQuoteError = validateEditField(handmadeInfoBaseSchema.shape.quote, editQuote || null); }
  function validateEditNotes() { editNotesError = validateEditField(handmadeInfoBaseSchema.shape.notes, editNotes || null); }

  function hasEditErrors(): boolean {
    return !![editNameError, editSeriesError, editStoreNameError, editEventNameError,
      editPurchaseDateError, editPurchasePriceError, editMakerError, editArtistNameError,
      editProductionStartError, editProductionEndError, editQuoteError, editNotesError].find(Boolean);
  }
```

- [ ] **Step 2: saveEdit に最終ゲートを追加する**

`saveEdit` 関数の `saving = true;` の次の行に追加:

```typescript
    validateEditName(); validateEditSeries();
    if (editIsHandmade === 0) {
      validateEditStoreName(); validateEditEventName(); validateEditPurchaseDate();
      validateEditPurchasePrice(); validateEditMaker(); validateEditArtistName();
    } else if (editIsHandmade === 1) {
      validateEditProductionStart(); validateEditProductionEnd(); validateEditQuote(); validateEditNotes();
    }
    if (hasEditErrors()) { saving = false; return; }
```

- [ ] **Step 3: 編集フォームのフィールドに on-blur とエラー表示を追加する**

編集フォームの該当フィールドに `onblur` ハンドラとエラー表示を追加する。パターンは Task 7 と同一。例:

```svelte
<input type="text" bind:value={editName} onblur={validateEditName} />
{#if editNameError}<p class="field-error">{editNameError}</p>{/if}
```

全フィールド（`editSeries`, `editStoreName`, `editEventName`, `editPurchaseDate`, `editPurchasePrice`, `editMaker`, `editArtistName`, `editProductionStart`, `editProductionEnd`, `editQuote`, `editNotes`）に同様に追加する。

- [ ] **Step 4: 動作確認（手動）**

```bash
npm run dev
```

1. `/items/[id]` を開いて編集モードに入る
2. Name を 101 文字にして blur → エラー表示確認
3. Finished を Started より前の日付にして blur → エラー表示確認
4. エラーが出た状態で保存ボタンを押す → 保存されないことを確認

- [ ] **Step 5: 全テストがパスすることを確認**

```bash
npm test
```

Expected: PASS

- [ ] **Step 6: コミット**

```bash
git add src/routes/items/[id]/+page.svelte
git commit -m "feat: 編集ページにインラインバリデーションを追加"
```
