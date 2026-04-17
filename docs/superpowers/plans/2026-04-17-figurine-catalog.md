# フィギュア・コレクション管理サイト 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SvelteKit × Cloudflare（Pages + Workers + D1 + R2）でフィギュアコレクション管理Webアプリを構築する

**Architecture:** SvelteKit の server routes が Cloudflare Workers として動作する。Drizzle ORM で D1（SQLite）のアイテムデータを型安全に管理し、R2 S3互換APIで生成した presigned URL を使いブラウザが写真を直接アップロードする。フロントエンドは shadcn-svelte（Tailwind CSS 4）で構築。Cloudflare Access によるパスベース認証（`/items/*`, `/admin/*`, `/api/*`）でオーナーのみ編集可能。

**Tech Stack:** SvelteKit 2, @sveltejs/adapter-cloudflare, Drizzle ORM + drizzle-kit, Cloudflare D1/R2/Access, shadcn-svelte, Tailwind CSS 4, @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner, svelte-dnd-action, @vite-pwa/sveltekit, Vitest

---

## ファイル構成

```
figurine-catalog/
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db/
│   │   │   │   ├── schema.ts          # Drizzle テーブル定義
│   │   │   │   └── index.ts           # DB クライアント初期化
│   │   │   └── r2.ts                  # R2 presigned URL 生成・削除
│   │   ├── components/
│   │   │   ├── TagPicker.svelte       # 汎用タグピッカー（タグ・素材共用）
│   │   │   ├── PhotoUploader.svelte   # 写真アップロード + リサイズ
│   │   │   ├── PhotoSortable.svelte   # 写真ドラッグ&ドロップ並び替え
│   │   │   └── ItemCard.svelte        # グリッドカードコンポーネント
│   │   └── utils/
│   │       ├── image.ts               # クライアントサイド画像リサイズ
│   │       └── uuid.ts                # UUID 生成
│   ├── routes/
│   │   ├── +layout.svelte             # ルートレイアウト（テーマ・PWA）
│   │   ├── +page.svelte               # トップページ → /items へリダイレクト
│   │   ├── p/[id]/
│   │   │   └── +page.svelte           # 公開アイテムページ（認証不要）
│   │   │   └── +page.server.ts
│   │   ├── items/
│   │   │   ├── +page.svelte           # コレクション一覧（認証必須）
│   │   │   ├── +page.server.ts
│   │   │   ├── new/
│   │   │   │   ├── +page.svelte       # クイック登録 + ウィザード
│   │   │   │   └── +page.server.ts
│   │   │   └── [id]/
│   │   │       ├── +page.svelte       # アイテム詳細・インライン編集
│   │   │       └── +page.server.ts
│   │   ├── admin/
│   │   │   └── +page.svelte           # 管理トップ（ブックマーク用）
│   │   └── api/
│   │       ├── items/
│   │       │   ├── +server.ts         # GET（一覧）/ POST（作成）
│   │       │   └── [id]/
│   │       │       └── +server.ts     # GET / PATCH / DELETE
│   │       ├── photos/
│   │       │   ├── presign/+server.ts # POST: presigned URL 発行
│   │       │   └── [id]/+server.ts    # POST（DB登録）/ DELETE
│   │       ├── tags/
│   │       │   └── +server.ts         # GET（一覧）/ POST（作成）
│   │       └── materials/
│   │           └── +server.ts         # GET（一覧）/ POST（作成）
├── migrations/
│   └── 0001_initial.sql
├── drizzle.config.ts
├── wrangler.toml
├── svelte.config.js
├── vite.config.ts
└── static/
    ├── manifest.json
    └── icons/                         # PWA アイコン各種
```

---

## Phase 1: プロジェクト基盤

### Task 1: SvelteKit プロジェクト初期化

**Files:**
- Create: `package.json`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`（SvelteKit CLI が生成）
- Create: `wrangler.toml`

- [ ] **Step 1: SvelteKit プロジェクトを作成**

```bash
cd /home/haku/projects/figurine-catalog
npx sv create . --template minimal --types ts --no-add-ons
```

プロンプトで「TypeScript」「Vitest」を選択。

- [ ] **Step 2: 依存パッケージをインストール**

```bash
npm install drizzle-orm @aws-sdk/client-s3 @aws-sdk/s3-request-presigner svelte-dnd-action
npm install -D drizzle-kit wrangler @sveltejs/adapter-cloudflare @cloudflare/workers-types vitest @testing-library/svelte jsdom
```

- [ ] **Step 3: svelte.config.js を Cloudflare アダプターに変更**

```js
// svelte.config.js
import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
  },
};
```

- [ ] **Step 4: tsconfig.json に Cloudflare Workers 型を追加**

`tsconfig.json` の `compilerOptions.types` に `"@cloudflare/workers-types"` を追加:

```json
{
  "compilerOptions": {
    "types": ["@cloudflare/workers-types"]
  }
}
```

- [ ] **Step 5: wrangler.toml を作成**

```toml
# wrangler.toml
name = "figurine-catalog"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".svelte-kit/cloudflare"

[[d1_databases]]
binding = "DB"
database_name = "figurine-catalog-db"
database_id = "REPLACE_AFTER_CREATION"

[[r2_buckets]]
binding = "R2"
bucket_name = "figurine-catalog-photos"

[vars]
R2_BUCKET_NAME = "figurine-catalog-photos"
# 以下は wrangler secret put で設定（.toml に書かない）
# CLOUDFLARE_ACCOUNT_ID
# R2_ACCESS_KEY_ID
# R2_SECRET_ACCESS_KEY
```

- [ ] **Step 6: D1 データベースと R2 バケットを作成**

```bash
npx wrangler d1 create figurine-catalog-db
# 出力の database_id を wrangler.toml の database_id に貼り付ける

npx wrangler r2 bucket create figurine-catalog-photos
```

- [ ] **Step 7: R2 S3 API トークンをシークレットとして設定**

Cloudflare ダッシュボード → R2 → 「Manage R2 API Tokens」で S3 互換トークンを発行し:

```bash
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
```

- [ ] **Step 8: コミット**

```bash
git add -A
git commit -m "chore: SvelteKitプロジェクト初期化・Cloudflare設定"
```

---

### Task 2: Tailwind CSS + shadcn-svelte セットアップ

**Files:**
- Modify: `src/app.css`, `src/routes/+layout.svelte`
- Create: `components.json`（shadcn-svelte 設定）

- [ ] **Step 1: Tailwind CSS を追加**

```bash
npx sv add tailwindcss
```

- [ ] **Step 2: shadcn-svelte を初期化**

```bash
npx shadcn-svelte@latest init
```

プロンプト: style=default, baseColor=slate, cssVariables=yes

- [ ] **Step 3: 必要な shadcn コンポーネントを追加**

```bash
npx shadcn-svelte@latest add button input label dialog toast badge switch progress
```

- [ ] **Step 4: app.css にダーク/ライトモードのカスタム変数を設定**

`src/app.css` の `:root` と `.dark` に Tailwind が生成した変数が入る。`prefers-color-scheme` の対応は Tailwind のデフォルト `darkMode: 'media'` で自動。

- [ ] **Step 5: ルートレイアウトに Toaster を追加**

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import '../app.css';
  import { Toaster } from '$lib/components/ui/sonner';
</script>

<slot />
<Toaster />
```

- [ ] **Step 6: コミット**

```bash
git add -A
git commit -m "chore: Tailwind CSS・shadcn-svelteセットアップ"
```

---

## Phase 2: データベース

### Task 3: Drizzle スキーマ定義

**Files:**
- Create: `src/lib/server/db/schema.ts`
- Create: `drizzle.config.ts`

- [ ] **Step 1: drizzle.config.ts を作成**

```ts
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/lib/server/db/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.D1_DATABASE_ID!,
    token: process.env.CLOUDFLARE_API_TOKEN!,
  },
} satisfies Config;
```

- [ ] **Step 2: スキーマを定義**

```ts
// src/lib/server/db/schema.ts
import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const items = sqliteTable('items', {
  id: text('id').primaryKey(),
  name: text('name'),
  series: text('series'),
  isHandmade: integer('is_handmade'), // 0=購入品, 1=自作品, NULL=未設定
  isPublic: integer('is_public').notNull().default(0),
  purchaseInfoPublic: integer('purchase_info_public').notNull().default(0),
  handmadeInfoPublic: integer('handmade_info_public').notNull().default(0),
  status: text('status').notNull().default('owned'), // 'owned' | 'parted'
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const photos = sqliteTable('photos', {
  id: text('id').primaryKey(),
  itemId: text('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  r2KeyOrig: text('r2_key_orig').notNull(),
  r2KeyThumb: text('r2_key_thumb').notNull(),
  isCover: integer('is_cover').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const purchaseInfo = sqliteTable('purchase_info', {
  itemId: text('item_id').primaryKey().references(() => items.id, { onDelete: 'cascade' }),
  storeName: text('store_name'),
  eventName: text('event_name'),
  purchaseDate: text('purchase_date'),
  purchasePrice: integer('purchase_price'),
  maker: text('maker'),
  artistName: text('artist_name'),
});

export const handmadeInfo = sqliteTable('handmade_info', {
  itemId: text('item_id').primaryKey().references(() => items.id, { onDelete: 'cascade' }),
  productionStart: text('production_start'),
  productionEnd: text('production_end'),
  notes: text('notes'),
});

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
});

export const itemTags = sqliteTable('item_tags', {
  itemId: text('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => ({ pk: primaryKey({ columns: [t.itemId, t.tagId] }) }));

export const materials = sqliteTable('materials', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  isPreset: integer('is_preset').notNull().default(0),
});

export const itemMaterials = sqliteTable('item_materials', {
  itemId: text('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  materialId: text('material_id').notNull().references(() => materials.id, { onDelete: 'cascade' }),
}, (t) => ({ pk: primaryKey({ columns: [t.itemId, t.materialId] }) }));
```

- [ ] **Step 3: コミット**

```bash
git add -A
git commit -m "feat: Drizzleスキーマ定義"
```

---

### Task 4: D1 マイグレーション生成・適用

**Files:**
- Create: `migrations/0001_initial.sql`

- [ ] **Step 1: マイグレーションSQLを生成**

```bash
npx drizzle-kit generate
```

`migrations/0001_initial.sql` が生成される。

- [ ] **Step 2: 素材プリセットデータをマイグレーションに追記**

生成された SQL ファイルの末尾に追記:

```sql
-- プリセット素材データ
INSERT INTO materials (id, name, is_preset) VALUES
  (lower(hex(randomblob(16))), '石粉粘土', 1),
  (lower(hex(randomblob(16))), 'エポキシパテ', 1),
  (lower(hex(randomblob(16))), 'スカルピー', 1),
  (lower(hex(randomblob(16))), 'レジン', 1),
  (lower(hex(randomblob(16))), 'ポリパテ', 1),
  (lower(hex(randomblob(16))), 'プラ板', 1),
  (lower(hex(randomblob(16))), '真鍮線', 1),
  (lower(hex(randomblob(16))), 'エアブラシ', 1),
  (lower(hex(randomblob(16))), '筆塗り', 1),
  (lower(hex(randomblob(16))), '缶スプレー', 1),
  (lower(hex(randomblob(16))), '水性アクリル塗料', 1),
  (lower(hex(randomblob(16))), 'Mr.カラー', 1),
  (lower(hex(randomblob(16))), 'ラッカー塗料', 1),
  (lower(hex(randomblob(16))), 'ウォッシング', 1),
  (lower(hex(randomblob(16))), 'デカール', 1),
  (lower(hex(randomblob(16))), '3Dプリンター', 1),
  (lower(hex(randomblob(16))), 'ルーター', 1);
```

- [ ] **Step 3: ローカル D1 にマイグレーションを適用**

```bash
npx wrangler d1 migrations apply figurine-catalog-db --local
```

Expected output: `✅ Applied 1 migration`

- [ ] **Step 4: コミット**

```bash
git add -A
git commit -m "feat: D1マイグレーション・素材プリセットデータ"
```

---

### Task 5: DB クライアント初期化

**Files:**
- Create: `src/lib/server/db/index.ts`
- Create: `src/app.d.ts`

- [ ] **Step 1: SvelteKit の型定義に Cloudflare バインディングを追加**

```ts
// src/app.d.ts
declare global {
  namespace App {
    interface Platform {
      env: {
        DB: D1Database;
        R2: R2Bucket;
        CLOUDFLARE_ACCOUNT_ID: string;
        R2_ACCESS_KEY_ID: string;
        R2_SECRET_ACCESS_KEY: string;
        R2_BUCKET_NAME: string;
      };
    }
  }
}
export {};
```

- [ ] **Step 2: DB クライアントヘルパーを作成**

```ts
// src/lib/server/db/index.ts
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export function getDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export * from './schema';
```

- [ ] **Step 3: ユニットテストを書く**

```ts
// src/lib/server/db/index.test.ts
import { describe, it, expect } from 'vitest';
import { getDb } from './index';

describe('getDb', () => {
  it('D1バインディングを受け取りdrizzleインスタンスを返す', () => {
    const mockD1 = {} as D1Database;
    const db = getDb(mockD1);
    expect(db).toBeDefined();
  });
});
```

- [ ] **Step 4: テストを実行して確認**

```bash
npx vitest run src/lib/server/db/index.test.ts
```

Expected: `✓ 1 test passed`

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "feat: DBクライアント初期化ヘルパー"
```

---

## Phase 3: ユーティリティ

### Task 6: UUID ユーティリティ

**Files:**
- Create: `src/lib/utils/uuid.ts`
- Create: `src/lib/utils/uuid.test.ts`

- [ ] **Step 1: テストを書く**

```ts
// src/lib/utils/uuid.test.ts
import { describe, it, expect } from 'vitest';
import { generateId } from './uuid';

describe('generateId', () => {
  it('UUID v4形式の文字列を返す', () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('呼び出しごとに異なる値を返す', () => {
    const ids = new Set(Array.from({ length: 100 }, generateId));
    expect(ids.size).toBe(100);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx vitest run src/lib/utils/uuid.test.ts
```

Expected: FAIL with "Cannot find module './uuid'"

- [ ] **Step 3: 実装**

```ts
// src/lib/utils/uuid.ts
export function generateId(): string {
  return crypto.randomUUID();
}
```

- [ ] **Step 4: テストが通ることを確認**

```bash
npx vitest run src/lib/utils/uuid.test.ts
```

Expected: `✓ 2 tests passed`

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "feat: UUID生成ユーティリティ"
```

---

### Task 7: 画像リサイズユーティリティ（クライアント）

**Files:**
- Create: `src/lib/utils/image.ts`
- Create: `src/lib/utils/image.test.ts`

- [ ] **Step 1: テストを書く**

```ts
// src/lib/utils/image.test.ts
import { describe, it, expect, vi } from 'vitest';
import { resizeImage } from './image';

// Canvas API のモック
const mockCanvasCtx = {
  drawImage: vi.fn(),
};
const mockCanvas = {
  getContext: vi.fn(() => mockCanvasCtx),
  toBlob: vi.fn((cb: (blob: Blob) => void) => cb(new Blob(['fake'], { type: 'image/webp' }))),
  width: 0,
  height: 0,
};
vi.stubGlobal('document', {
  createElement: vi.fn(() => mockCanvas),
});

const mockImg = {
  onload: null as (() => void) | null,
  src: '',
  naturalWidth: 800,
  naturalHeight: 600,
};
vi.stubGlobal('Image', vi.fn(() => {
  setTimeout(() => mockImg.onload?.(), 0);
  return mockImg;
}));

describe('resizeImage', () => {
  it('Blobを受け取りWebP Blobを返す', async () => {
    const input = new Blob(['fake-image'], { type: 'image/jpeg' });
    const result = await resizeImage(input, 400);
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('image/webp');
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx vitest run src/lib/utils/image.test.ts
```

Expected: FAIL

- [ ] **Step 3: 実装**

```ts
// src/lib/utils/image.ts
export async function resizeImage(file: Blob, maxWidth: number): Promise<Blob> {
  const url = URL.createObjectURL(file);
  const img = new Image();

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });

  URL.revokeObjectURL(url);

  const ratio = Math.min(1, maxWidth / img.naturalWidth);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * ratio);
  canvas.height = Math.round(img.naturalHeight * ratio);

  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('リサイズ失敗'))),
      'image/webp',
      0.85,
    );
  });
}
```

- [ ] **Step 4: テストが通ることを確認**

```bash
npx vitest run src/lib/utils/image.test.ts
```

Expected: `✓ 1 test passed`

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "feat: クライアントサイド画像リサイズユーティリティ"
```

---

### Task 8: R2 ヘルパー

**Files:**
- Create: `src/lib/server/r2.ts`
- Create: `src/lib/server/r2.test.ts`

- [ ] **Step 1: テストを書く**

```ts
// src/lib/server/r2.test.ts
import { describe, it, expect, vi } from 'vitest';
import { buildR2Client, getPresignedPutUrl, deleteR2Object } from './r2';

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({})),
  PutObjectCommand: vi.fn((input) => input),
  DeleteObjectCommand: vi.fn((input) => input),
}));
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(async () => 'https://example.r2.presigned.url/test'),
}));

const env = {
  CLOUDFLARE_ACCOUNT_ID: 'acc123',
  R2_ACCESS_KEY_ID: 'key123',
  R2_SECRET_ACCESS_KEY: 'secret123',
  R2_BUCKET_NAME: 'figurine-catalog-photos',
} as unknown as App.Platform['env'];

describe('getPresignedPutUrl', () => {
  it('署名付きPUT URLを返す', async () => {
    const url = await getPresignedPutUrl(env, 'items/abc/orig_1.jpg', 'image/jpeg');
    expect(url).toBe('https://example.r2.presigned.url/test');
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx vitest run src/lib/server/r2.test.ts
```

Expected: FAIL

- [ ] **Step 3: 実装**

```ts
// src/lib/server/r2.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export function buildR2Client(env: App.Platform['env']): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
}

export async function getPresignedPutUrl(
  env: App.Platform['env'],
  key: string,
  contentType: string,
  expiresIn = 3600,
): Promise<string> {
  const client = buildR2Client(env);
  return getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key, ContentType: contentType }),
    { expiresIn },
  );
}

export async function getPresignedGetUrl(
  env: App.Platform['env'],
  key: string,
  expiresIn = 3600,
): Promise<string> {
  const { GetObjectCommand } = await import('@aws-sdk/client-s3');
  const client = buildR2Client(env);
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }),
    { expiresIn },
  );
}

export async function deleteR2Object(env: App.Platform['env'], key: string): Promise<void> {
  const client = buildR2Client(env);
  await client.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }));
}
```

- [ ] **Step 4: テストが通ることを確認**

```bash
npx vitest run src/lib/server/r2.test.ts
```

Expected: `✓ 1 test passed`

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "feat: R2 presigned URL生成・削除ヘルパー"
```

---

## Phase 4: アイテム API

### Task 9: アイテム作成 API（POST /api/items）

**Files:**
- Create: `src/routes/api/items/+server.ts`

- [ ] **Step 1: POST /api/items を実装**

```ts
// src/routes/api/items/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, items } from '$lib/server/db';
import { generateId } from '$lib/utils/uuid';

export const POST: RequestHandler = async ({ request, platform }) => {
  const db = getDb(platform!.env.DB);
  const body = await request.json().catch(() => ({}));

  const id = generateId();
  const now = new Date().toISOString();

  await db.insert(items).values({
    id,
    name: body.name ?? null,
    series: body.series ?? null,
    isHandmade: body.isHandmade ?? null,
    isPublic: 0,
    purchaseInfoPublic: 0,
    handmadeInfoPublic: 0,
    status: 'owned',
    createdAt: now,
    updatedAt: now,
  });

  return json({ id }, { status: 201 });
};
```

- [ ] **Step 2: GET /api/items（一覧）を同ファイルに追加**

```ts
export const GET: RequestHandler = async ({ url, platform }) => {
  const db = getDb(platform!.env.DB);
  const limit = Number(url.searchParams.get('limit') ?? 30);
  const offset = Number(url.searchParams.get('offset') ?? 0);
  const status = url.searchParams.get('status') ?? 'owned';
  const tagId = url.searchParams.get('tagId');
  const q = url.searchParams.get('q');

  const { eq, like, and, inArray } = await import('drizzle-orm');

  let query = db
    .select({
      id: items.id,
      name: items.name,
      status: items.status,
      isPublic: items.isPublic,
      createdAt: items.createdAt,
    })
    .from(items)
    .where(
      and(
        eq(items.status, status),
        q ? like(items.name, `%${q}%`) : undefined,
      )
    )
    .orderBy(items.createdAt)
    .limit(limit)
    .offset(offset);

  const rows = await query;
  return json({ items: rows, offset, limit });
};
```

- [ ] **Step 3: wrangler dev でローカル動作を確認**

```bash
npx wrangler dev
```

別ターミナルで:

```bash
curl -X POST http://localhost:8787/api/items \
  -H "Content-Type: application/json" \
  -d '{"name": "テストアイテム"}'
```

Expected: `{"id":"<uuid>"}` with status 201

```bash
curl http://localhost:8787/api/items
```

Expected: `{"items":[{"id":"...","name":"テストアイテム",...}],...}`

- [ ] **Step 4: コミット**

```bash
git add -A
git commit -m "feat: アイテム作成・一覧APIを実装"
```

---

### Task 10: アイテム詳細・更新・削除 API

**Files:**
- Create: `src/routes/api/items/[id]/+server.ts`

- [ ] **Step 1: GET / PATCH / DELETE を実装**

```ts
// src/routes/api/items/[id]/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, items, photos, purchaseInfo, handmadeInfo, itemTags, itemMaterials } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { deleteR2Object } from '$lib/server/r2';

export const GET: RequestHandler = async ({ params, platform }) => {
  const db = getDb(platform!.env.DB);
  const item = await db.query.items.findFirst({
    where: eq(items.id, params.id),
    with: {
      photos: { orderBy: (p, { asc }) => [asc(p.sortOrder)] },
      purchaseInfo: true,
      handmadeInfo: true,
      itemTags: { with: { tag: true } },
      itemMaterials: { with: { material: true } },
    },
  });

  if (!item) throw error(404, 'アイテムが見つかりません');
  return json(item);
};

export const PATCH: RequestHandler = async ({ params, request, platform }) => {
  const db = getDb(platform!.env.DB);
  const body = await request.json();
  const now = new Date().toISOString();

  // items テーブルの更新
  const itemFields = ['name', 'series', 'isHandmade', 'isPublic', 'purchaseInfoPublic', 'handmadeInfoPublic', 'status'];
  const itemUpdate: Record<string, unknown> = { updatedAt: now };
  for (const field of itemFields) {
    if (field in body) itemUpdate[field] = body[field];
  }
  await db.update(items).set(itemUpdate).where(eq(items.id, params.id));

  // purchase_info の upsert
  if (body.purchaseInfo !== undefined) {
    await db.delete(purchaseInfo).where(eq(purchaseInfo.itemId, params.id));
    if (body.purchaseInfo) {
      await db.insert(purchaseInfo).values({ itemId: params.id, ...body.purchaseInfo });
    }
  }

  // handmade_info の upsert
  if (body.handmadeInfo !== undefined) {
    await db.delete(handmadeInfo).where(eq(handmadeInfo.itemId, params.id));
    if (body.handmadeInfo) {
      await db.insert(handmadeInfo).values({ itemId: params.id, ...body.handmadeInfo });
    }
  }

  return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ params, platform }) => {
  const db = getDb(platform!.env.DB);
  const env = platform!.env;

  // 写真を取得して R2 から削除
  const itemPhotos = await db.select().from(photos).where(eq(photos.itemId, params.id));
  await Promise.all(
    itemPhotos.flatMap((p) => [
      deleteR2Object(env, p.r2KeyOrig),
      deleteR2Object(env, p.r2KeyThumb),
    ])
  );

  // DB 削除（cascade で photos, purchase_info 等も削除される）
  await db.delete(items).where(eq(items.id, params.id));

  return json({ ok: true });
};
```

- [ ] **Step 2: wrangler dev で動作確認**

```bash
# 先の POST で作成した ID を使う
ITEM_ID="<先ほどのuuid>"

curl http://localhost:8787/api/items/$ITEM_ID

curl -X PATCH http://localhost:8787/api/items/$ITEM_ID \
  -H "Content-Type: application/json" \
  -d '{"name":"更新済みアイテム"}'

curl -X DELETE http://localhost:8787/api/items/$ITEM_ID
```

Expected: 各リクエストが 200 で返る

- [ ] **Step 3: コミット**

```bash
git add -A
git commit -m "feat: アイテム詳細・更新・削除APIを実装"
```

---

### Task 11: 写真 presign + 登録・削除 API

**Files:**
- Create: `src/routes/api/photos/presign/+server.ts`
- Create: `src/routes/api/photos/[id]/+server.ts`

- [ ] **Step 1: presign エンドポイントを実装**

```ts
// src/routes/api/photos/presign/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPresignedPutUrl } from '$lib/server/r2';

export const POST: RequestHandler = async ({ request, platform }) => {
  const body = await request.json();
  const { itemId, photoId, contentType } = body as {
    itemId: string;
    photoId: string;
    contentType: string; // 'image/jpeg' | 'image/png' | 'image/webp'
  };

  if (!itemId || !photoId || !contentType) throw error(400, '必須パラメータ不足');

  const origKey = `items/${itemId}/orig_${photoId}.jpg`;
  const thumbKey = `items/${itemId}/thumb_${photoId}.webp`;

  const [origUrl, thumbUrl] = await Promise.all([
    getPresignedPutUrl(platform!.env, origKey, contentType),
    getPresignedPutUrl(platform!.env, thumbKey, 'image/webp'),
  ]);

  return json({ origUrl, thumbUrl, origKey, thumbKey });
};
```

- [ ] **Step 2: 写真 DB 登録・削除エンドポイントを実装**

```ts
// src/routes/api/photos/[id]/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, photos } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { deleteR2Object } from '$lib/server/r2';

export const POST: RequestHandler = async ({ params, request, platform }) => {
  const db = getDb(platform!.env.DB);
  const body = await request.json();
  const { itemId, r2KeyOrig, r2KeyThumb, sortOrder } = body;

  // 1枚目は自動的にカバー写真
  const existing = await db.select().from(photos).where(eq(photos.itemId, itemId));
  const isCover = existing.length === 0 ? 1 : 0;

  await db.insert(photos).values({
    id: params.id,
    itemId,
    r2KeyOrig,
    r2KeyThumb,
    isCover,
    sortOrder: sortOrder ?? existing.length,
  });

  return json({ ok: true }, { status: 201 });
};

export const DELETE: RequestHandler = async ({ params, platform }) => {
  const db = getDb(platform!.env.DB);
  const env = platform!.env;

  const [photo] = await db.select().from(photos).where(eq(photos.id, params.id));
  if (!photo) throw error(404, '写真が見つかりません');

  await Promise.all([
    deleteR2Object(env, photo.r2KeyOrig),
    deleteR2Object(env, photo.r2KeyThumb),
  ]);

  await db.delete(photos).where(eq(photos.id, params.id));

  // 削除した写真がカバーだった場合、次の写真をカバーに設定
  if (photo.isCover) {
    const [next] = await db
      .select()
      .from(photos)
      .where(eq(photos.itemId, photo.itemId))
      .orderBy(photos.sortOrder)
      .limit(1);
    if (next) {
      await db.update(photos).set({ isCover: 1 }).where(eq(photos.id, next.id));
    }
  }

  return json({ ok: true });
};
```

- [ ] **Step 3: コミット**

```bash
git add -A
git commit -m "feat: 写真presign・登録・削除APIを実装"
```

---

### Task 12: タグ・素材 API

**Files:**
- Create: `src/routes/api/tags/+server.ts`
- Create: `src/routes/api/materials/+server.ts`

- [ ] **Step 1: タグ API を実装**

```ts
// src/routes/api/tags/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, tags, itemTags } from '$lib/server/db';
import { eq, sql } from 'drizzle-orm';
import { generateId } from '$lib/utils/uuid';

export const GET: RequestHandler = async ({ platform }) => {
  const db = getDb(platform!.env.DB);
  const rows = await db.select().from(tags).orderBy(tags.name);
  return json(rows);
};

export const POST: RequestHandler = async ({ request, platform }) => {
  const db = getDb(platform!.env.DB);
  const { name } = await request.json();
  const normalized = name.trim();
  if (!normalized) return json({ error: 'タグ名が空です' }, { status: 400 });

  // 既存チェック（大文字小文字区別なし）
  const existing = await db.select().from(tags).where(
    sql`lower(${tags.name}) = lower(${normalized})`
  );
  if (existing.length > 0) return json(existing[0]);

  const id = generateId();
  await db.insert(tags).values({ id, name: normalized });
  return json({ id, name: normalized }, { status: 201 });
};
```

- [ ] **Step 2: 素材 API を実装**

```ts
// src/routes/api/materials/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, materials, itemMaterials } from '$lib/server/db';
import { eq, sql, desc } from 'drizzle-orm';
import { generateId } from '$lib/utils/uuid';

export const GET: RequestHandler = async ({ url, platform }) => {
  const db = getDb(platform!.env.DB);
  const itemId = url.searchParams.get('itemId');

  // よく使う素材: 過去の item_materials から使用回数順に上位6件
  const frequent = await db
    .select({
      id: materials.id,
      name: materials.name,
      isPreset: materials.isPreset,
      useCount: sql<number>`count(${itemMaterials.materialId})`.as('use_count'),
    })
    .from(materials)
    .leftJoin(itemMaterials, eq(itemMaterials.materialId, materials.id))
    .groupBy(materials.id)
    .orderBy(desc(sql`use_count`))
    .limit(6);

  const all = await db.select().from(materials).orderBy(materials.name);

  return json({ frequent, all });
};

export const POST: RequestHandler = async ({ request, platform }) => {
  const db = getDb(platform!.env.DB);
  const { name } = await request.json();
  const normalized = name.trim();
  if (!normalized) return json({ error: '素材名が空です' }, { status: 400 });

  const existing = await db.select().from(materials).where(
    sql`lower(${materials.name}) = lower(${normalized})`
  );
  if (existing.length > 0) return json(existing[0]);

  const id = generateId();
  await db.insert(materials).values({ id, name: normalized, isPreset: 0 });
  return json({ id, name: normalized, isPreset: 0 }, { status: 201 });
};
```

- [ ] **Step 3: コミット**

```bash
git add -A
git commit -m "feat: タグ・素材APIを実装"
```

---

## Phase 5: UIコンポーネント

### Task 13: TagPicker コンポーネント

**Files:**
- Create: `src/lib/components/TagPicker.svelte`

- [ ] **Step 1: TagPicker を実装**

```svelte
<!-- src/lib/components/TagPicker.svelte -->
<script lang="ts">
  import { Badge } from '$lib/components/ui/badge';
  import { Input } from '$lib/components/ui/input';

  export let selected: { id: string; name: string }[] = [];
  export let suggestions: { id: string; name: string }[] = [];
  export let frequent: { id: string; name: string }[] = [];
  export let placeholder = 'タグを追加...';
  export let onCreate: (name: string) => Promise<{ id: string; name: string }>;

  let input = '';

  function toggle(item: { id: string; name: string }) {
    const exists = selected.find((s) => s.id === item.id);
    selected = exists ? selected.filter((s) => s.id !== item.id) : [...selected, item];
  }

  function isSelected(id: string) {
    return selected.some((s) => s.id === id);
  }

  async function handleAdd() {
    const name = input.trim();
    if (!name) return;
    const existing = suggestions.find((s) => s.name.toLowerCase() === name.toLowerCase());
    const item = existing ?? (await onCreate(name));
    if (!isSelected(item.id)) selected = [...selected, item];
    input = '';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
  }
</script>

<div class="space-y-3">
  <!-- 選択済みバッジ -->
  {#if selected.length > 0}
    <div class="flex flex-wrap gap-2">
      {#each selected as item}
        <Badge variant="secondary" class="cursor-pointer" on:click={() => toggle(item)}>
          {item.name} ✕
        </Badge>
      {/each}
    </div>
  {/if}

  <!-- よく使う -->
  {#if frequent.length > 0}
    <div>
      <p class="text-xs text-muted-foreground mb-1">⭐ よく使うもの</p>
      <div class="flex flex-wrap gap-2">
        {#each frequent as item}
          <Badge
            variant={isSelected(item.id) ? 'default' : 'outline'}
            class="cursor-pointer"
            on:click={() => toggle(item)}
          >{item.name}</Badge>
        {/each}
      </div>
    </div>
  {/if}

  <!-- 全候補 -->
  <div class="flex flex-wrap gap-2">
    {#each suggestions.filter((s) => !frequent.find((f) => f.id === s.id)) as item}
      <Badge
        variant={isSelected(item.id) ? 'default' : 'outline'}
        class="cursor-pointer"
        on:click={() => toggle(item)}
      >{item.name}</Badge>
    {/each}
  </div>

  <!-- カスタム追加 -->
  <div class="flex gap-2">
    <Input bind:value={input} {placeholder} on:keydown={handleKeydown} />
    <button
      type="button"
      class="px-3 py-2 text-sm border rounded-md hover:bg-accent"
      on:click={handleAdd}
    >追加</button>
  </div>
</div>
```

- [ ] **Step 2: コミット**

```bash
git add -A
git commit -m "feat: TagPickerコンポーネント"
```

---

### Task 14: PhotoUploader コンポーネント

**Files:**
- Create: `src/lib/components/PhotoUploader.svelte`

- [ ] **Step 1: PhotoUploader を実装**

```svelte
<!-- src/lib/components/PhotoUploader.svelte -->
<script lang="ts">
  import { resizeImage } from '$lib/utils/image';
  import { generateId } from '$lib/utils/uuid';
  import { toast } from 'svelte-sonner';

  export let itemId: string;
  export let onUploaded: (photo: { id: string; r2KeyOrig: string; r2KeyThumb: string }) => void;

  let uploading = false;
  let fileInput: HTMLInputElement;

  async function uploadWithRetry(url: string, blob: Blob, maxRetries = 3): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const res = await fetch(url, { method: 'PUT', body: blob, headers: { 'Content-Type': blob.type } });
        if (res.ok) return;
        throw new Error(`HTTP ${res.status}`);
      } catch (e) {
        if (i === maxRetries - 1) throw e;
        await new Promise((r) => setTimeout(r, 500 * (i + 1)));
      }
    }
  }

  async function handleFiles(files: FileList) {
    uploading = true;
    const limited = Array.from(files).slice(0, 20);

    for (const file of limited) {
      const photoId = generateId();
      try {
        // presigned URL を取得
        const presignRes = await fetch('/api/photos/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId, photoId, contentType: file.type }),
        });
        const { origUrl, thumbUrl, origKey, thumbKey } = await presignRes.json();

        // サムネイルを生成（400px幅 WebP）
        const thumb = await resizeImage(file, 400);

        // 並列アップロード（リトライあり）
        await Promise.all([
          uploadWithRetry(origUrl, file),
          uploadWithRetry(thumbUrl, thumb),
        ]);

        // DB に登録
        await fetch(`/api/photos/${photoId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId, r2KeyOrig: origKey, r2KeyThumb: thumbKey }),
        });

        onUploaded({ id: photoId, r2KeyOrig: origKey, r2KeyThumb: thumbKey });
      } catch {
        toast.error(`${file.name} のアップロードに失敗しました`);
      }
    }

    uploading = false;
  }

  function handleChange(e: Event) {
    const files = (e.target as HTMLInputElement).files;
    if (files?.length) handleFiles(files);
  }
</script>

<div>
  <input
    bind:this={fileInput}
    type="file"
    accept="image/jpeg,image/png,image/webp"
    multiple
    class="hidden"
    on:change={handleChange}
  />
  <button
    type="button"
    class="w-full border-2 border-dashed rounded-lg p-8 text-center hover:bg-accent transition-colors"
    disabled={uploading}
    on:click={() => fileInput.click()}
  >
    {#if uploading}
      <span>アップロード中...</span>
    {:else}
      <span>📷 写真を選ぶ（複数可）</span>
    {/if}
  </button>
</div>
```

- [ ] **Step 2: コミット**

```bash
git add -A
git commit -m "feat: PhotoUploaderコンポーネント（リトライ・並列アップロード）"
```

---

### Task 15: ItemCard コンポーネント

**Files:**
- Create: `src/lib/components/ItemCard.svelte`

- [ ] **Step 1: ItemCard を実装**

```svelte
<!-- src/lib/components/ItemCard.svelte -->
<script lang="ts">
  export let item: {
    id: string;
    name: string | null;
    thumbUrl: string | null;
    isPublic: number;
    status: string;
  };
</script>

<a href="/items/{item.id}" class="block group">
  <div class="rounded-xl overflow-hidden border bg-card hover:shadow-md transition-shadow" style="aspect-ratio: 3/4;">
    {#if item.thumbUrl}
      <img
        src={item.thumbUrl}
        alt={item.name ?? '名称未設定'}
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        loading="lazy"
      />
    {:else}
      <div class="w-full h-full bg-muted flex items-center justify-center text-4xl">📦</div>
    {/if}
  </div>
  <div class="mt-1 px-1">
    <p class="text-sm font-medium truncate {item.name ? '' : 'text-muted-foreground italic'}">
      {item.name ?? '名称未設定'}
    </p>
    {#if item.status === 'parted'}
      <span class="text-xs text-muted-foreground">手放し済み</span>
    {/if}
  </div>
</a>
```

- [ ] **Step 2: コミット**

```bash
git add -A
git commit -m "feat: ItemCardコンポーネント"
```

---

## Phase 6: ページ実装

### Task 16: コレクション一覧ページ（/items）

**Files:**
- Create: `src/routes/items/+page.server.ts`
- Create: `src/routes/items/+page.svelte`

- [ ] **Step 1: サーバーサイドのデータ取得**

```ts
// src/routes/items/+page.server.ts
import type { PageServerLoad } from './$types';
import { getDb, items, photos, tags } from '$lib/server/db';
import { eq, asc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ platform }) => {
  const db = getDb(platform!.env.DB);
  const allTags = await db.select().from(tags).orderBy(tags.name);
  return { tags: allTags };
};
```

- [ ] **Step 2: 一覧ページを実装（無限スクロール・タグフィルタ・検索）**

```svelte
<!-- src/routes/items/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import ItemCard from '$lib/components/ItemCard.svelte';
  import { Badge } from '$lib/components/ui/badge';
  import { Input } from '$lib/components/ui/input';
  import { onMount } from 'svelte';

  export let data: PageData;

  let items: any[] = [];
  let offset = 0;
  const limit = 30;
  let loading = false;
  let hasMore = true;
  let selectedTags: string[] = [];
  let query = '';
  let showParted = false;

  let sentinel: HTMLDivElement;

  async function fetchItems(reset = false) {
    if (loading) return;
    loading = true;
    if (reset) { items = []; offset = 0; hasMore = true; }

    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      status: showParted ? 'parted' : 'owned',
    });
    if (query) params.set('q', query);

    const res = await fetch(`/api/items?${params}`);
    const json = await res.json();
    items = reset ? json.items : [...items, ...json.items];
    offset += json.items.length;
    hasMore = json.items.length === limit;
    loading = false;
  }

  onMount(() => {
    fetchItems();
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) fetchItems();
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  });

  let searchTimer: ReturnType<typeof setTimeout>;
  function handleSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => fetchItems(true), 300);
  }
</script>

<div class="max-w-5xl mx-auto p-4">
  <div class="flex items-center justify-between mb-4">
    <h1 class="text-2xl font-bold">コレクション</h1>
    <a href="/items/new" class="fixed bottom-6 right-6 z-10 w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl shadow-lg hover:scale-105 transition-transform">＋</a>
  </div>

  <Input
    bind:value={query}
    on:input={handleSearch}
    placeholder="名前・シリーズ名で検索..."
    class="mb-4"
  />

  <div class="flex flex-wrap gap-2 mb-4">
    {#each data.tags as tag}
      <Badge
        variant={selectedTags.includes(tag.id) ? 'default' : 'outline'}
        class="cursor-pointer"
        on:click={() => {
          selectedTags = selectedTags.includes(tag.id)
            ? selectedTags.filter(id => id !== tag.id)
            : [...selectedTags, tag.id];
        }}
      >{tag.name}</Badge>
    {/each}
  </div>

  <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
    {#each items as item}
      <ItemCard {item} />
    {/each}
  </div>

  {#if loading}
    <div class="text-center py-8 text-muted-foreground">読み込み中...</div>
  {/if}

  <div bind:this={sentinel} class="h-4" />
</div>
```

- [ ] **Step 3: wrangler dev で表示を確認**

```bash
npx wrangler dev
```

ブラウザで `http://localhost:8787/items` を開き、グリッドが表示されることを確認。

- [ ] **Step 4: コミット**

```bash
git add -A
git commit -m "feat: コレクション一覧ページ（無限スクロール・検索・タグフィルタ）"
```

---

### Task 17: クイック登録・ウィザードページ（/items/new）

**Files:**
- Create: `src/routes/items/new/+page.svelte`
- Create: `src/routes/items/new/+page.server.ts`

- [ ] **Step 1: サーバーサイド（素材・タグ取得）**

```ts
// src/routes/items/new/+page.server.ts
import type { PageServerLoad } from './$types';
import { getDb, tags, materials } from '$lib/server/db';

export const load: PageServerLoad = async ({ platform }) => {
  const db = getDb(platform!.env.DB);
  const [allTags, matRes] = await Promise.all([
    db.select().from(tags).orderBy(tags.name),
    fetch(`${platform!.env.ORIGIN ?? ''}/api/materials`).then(r => r.json()),
  ]);
  return { allTags, materials: matRes };
};
```

- [ ] **Step 2: 登録ウィザードページを実装**

```svelte
<!-- src/routes/items/new/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import PhotoUploader from '$lib/components/PhotoUploader.svelte';
  import TagPicker from '$lib/components/TagPicker.svelte';

  export let data: PageData;

  // Step: 'photo' | 'basic' | 'type' | 'details' | 'tags'
  let step: string = 'photo';
  let itemId: string | null = null;
  let uploadedPhotos: any[] = [];

  // フォームデータ
  let name = '';
  let series = '';
  let isHandmade: number | null = null;
  let selectedTags: { id: string; name: string }[] = [];
  let selectedMaterials: { id: string; name: string }[] = [];

  // 購入品
  let storeName = '';
  let eventName = '';
  let purchaseDate = '';
  let purchasePrice = '';
  let maker = '';
  let artistName = '';

  // 自作品
  let productionStart = '';
  let productionEnd = '';
  let notes = '';

  async function createItem() {
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: null }),
    });
    const json = await res.json();
    itemId = json.id;
  }

  async function handlePhotoUploaded(photo: any) {
    if (!itemId) await createItem();
    uploadedPhotos = [...uploadedPhotos, photo];
  }

  async function saveAndFinish() {
    if (!itemId) return;

    const updateBody: Record<string, unknown> = {
      name: name || null,
      series: series || null,
      isHandmade,
    };

    if (isHandmade === 0) {
      updateBody.purchaseInfo = {
        storeName: storeName || null,
        eventName: eventName || null,
        purchaseDate: purchaseDate || null,
        purchasePrice: purchasePrice ? Number(purchasePrice) : null,
        maker: maker || null,
        artistName: artistName || null,
      };
    } else if (isHandmade === 1) {
      updateBody.handmadeInfo = {
        productionStart: productionStart || null,
        productionEnd: productionEnd || null,
        notes: notes || null,
      };
    }

    await fetch(`/api/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateBody),
    });

    goto(`/items/${itemId}`);
  }

  const steps = ['photo', 'basic', 'type', 'details', 'tags'];
  $: stepIndex = steps.indexOf(step);
</script>

<div class="max-w-md mx-auto p-4">
  <div class="flex gap-1 mb-6">
    {#each steps as s, i}
      <div class="flex-1 h-1 rounded-full {i <= stepIndex ? 'bg-primary' : 'bg-muted'}" />
    {/each}
  </div>

  {#if step === 'photo'}
    <h2 class="text-lg font-semibold mb-4">写真を追加</h2>
    {#if itemId}
      <PhotoUploader {itemId} onUploaded={handlePhotoUploaded} />
    {:else}
      <PhotoUploader itemId="__temp__" onUploaded={async (p) => {
        await createItem();
        handlePhotoUploaded(p);
      }} />
    {/if}
    <div class="mt-4 flex gap-2">
      <button class="flex-1 border rounded-lg py-2" on:click={() => step = 'basic'}>スキップ</button>
      {#if uploadedPhotos.length > 0}
        <button class="flex-1 bg-primary text-primary-foreground rounded-lg py-2" on:click={() => step = 'basic'}>次へ →</button>
      {/if}
    </div>

  {:else if step === 'basic'}
    <h2 class="text-lg font-semibold mb-4">名前・シリーズ名</h2>
    <div class="space-y-3">
      <input bind:value={name} placeholder="アイテム名（スキップ可）" class="w-full border rounded-lg px-3 py-2" />
      <input bind:value={series} placeholder="シリーズ名（スキップ可）" class="w-full border rounded-lg px-3 py-2" />
    </div>
    <div class="mt-4 flex gap-2">
      <button class="flex-1 border rounded-lg py-2" on:click={() => step = 'photo'}>← 戻る</button>
      <button class="flex-1 bg-primary text-primary-foreground rounded-lg py-2" on:click={() => step = 'type'}>次へ →</button>
    </div>

  {:else if step === 'type'}
    <h2 class="text-lg font-semibold mb-4">購入品？自作品？</h2>
    <div class="space-y-3">
      <button class="w-full border rounded-xl p-4 text-left hover:bg-accent {isHandmade === 0 ? 'border-primary' : ''}" on:click={() => isHandmade = 0}>
        🛒 <strong>購入品</strong><br><span class="text-sm text-muted-foreground">店舗・EC・イベントで入手</span>
      </button>
      <button class="w-full border rounded-xl p-4 text-left hover:bg-accent {isHandmade === 1 ? 'border-primary' : ''}" on:click={() => isHandmade = 1}>
        🎨 <strong>自作品</strong><br><span class="text-sm text-muted-foreground">造形・塗装・改造など</span>
      </button>
    </div>
    <div class="mt-4 flex gap-2">
      <button class="flex-1 border rounded-lg py-2" on:click={() => step = 'basic'}>← 戻る</button>
      <button class="flex-1 border rounded-lg py-2" on:click={() => step = 'tags'}>スキップ</button>
      {#if isHandmade !== null}
        <button class="flex-1 bg-primary text-primary-foreground rounded-lg py-2" on:click={() => step = 'details'}>次へ →</button>
      {/if}
    </div>

  {:else if step === 'details'}
    {#if isHandmade === 0}
      <h2 class="text-lg font-semibold mb-4">購入情報</h2>
      <div class="space-y-3">
        <input bind:value={storeName} placeholder="店舗名 / ECサイト名" class="w-full border rounded-lg px-3 py-2" />
        <input bind:value={eventName} placeholder="イベント名（例: ワンフェス2024夏）" class="w-full border rounded-lg px-3 py-2" />
        <div class="flex gap-2">
          <input bind:value={purchaseDate} type="date" class="flex-1 border rounded-lg px-3 py-2" />
          <input bind:value={purchasePrice} type="number" placeholder="金額 ¥" class="flex-1 border rounded-lg px-3 py-2" />
        </div>
        <input bind:value={maker} placeholder="メーカー名" class="w-full border rounded-lg px-3 py-2" />
        <input bind:value={artistName} placeholder="作家名・原型師名" class="w-full border rounded-lg px-3 py-2" />
      </div>
    {:else}
      <h2 class="text-lg font-semibold mb-4">制作情報</h2>
      <div class="space-y-3">
        <div class="flex gap-2">
          <input bind:value={productionStart} type="date" class="flex-1 border rounded-lg px-3 py-2" />
          <input bind:value={productionEnd} type="date" class="flex-1 border rounded-lg px-3 py-2" />
        </div>
        <TagPicker
          selected={selectedMaterials}
          suggestions={data.materials?.all ?? []}
          frequent={data.materials?.frequent ?? []}
          placeholder="素材・ツールを追加..."
          onCreate={async (name) => {
            const r = await fetch('/api/materials', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
            return r.json();
          }}
        />
        <textarea bind:value={notes} placeholder="制作メモ・塗装記録（自由記述）" rows="4" class="w-full border rounded-lg px-3 py-2 resize-none" />
      </div>
    {/if}
    <div class="mt-4 flex gap-2">
      <button class="flex-1 border rounded-lg py-2" on:click={() => step = 'type'}>← 戻る</button>
      <button class="flex-1 bg-primary text-primary-foreground rounded-lg py-2" on:click={() => step = 'tags'}>次へ →</button>
    </div>

  {:else if step === 'tags'}
    <h2 class="text-lg font-semibold mb-4">タグを設定</h2>
    <TagPicker
      selected={selectedTags}
      suggestions={data.allTags}
      frequent={[]}
      placeholder="タグを追加..."
      onCreate={async (name) => {
        const r = await fetch('/api/tags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
        return r.json();
      }}
    />
    <div class="mt-4 flex gap-2">
      <button class="flex-1 border rounded-lg py-2" on:click={() => step = 'details'}>← 戻る</button>
      <button class="flex-1 bg-primary text-primary-foreground rounded-lg py-2" on:click={saveAndFinish}>完了 ✓</button>
    </div>
  {/if}
</div>
```

- [ ] **Step 3: 動作確認**

```bash
npx wrangler dev
```

`http://localhost:8787/items/new` を開き、ウィザードをすべてのステップで操作できることを確認。写真アップロード → スキップ連打 → 完了 → /items/:id にリダイレクトされることを確認。

- [ ] **Step 4: コミット**

```bash
git add -A
git commit -m "feat: クイック登録・分岐ウィザードページ"
```

---

### Task 18: アイテム詳細・インライン編集ページ（/items/:id）

**Files:**
- Create: `src/routes/items/[id]/+page.server.ts`
- Create: `src/routes/items/[id]/+page.svelte`

- [ ] **Step 1: サーバーサイドのデータ取得**

```ts
// src/routes/items/[id]/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb, items, photos } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { getPresignedGetUrl } from '$lib/server/r2';

export const load: PageServerLoad = async ({ params, platform }) => {
  const db = getDb(platform!.env.DB);
  const item = await db.query.items.findFirst({
    where: eq(items.id, params.id),
    with: {
      photos: { orderBy: (p, { asc }) => [asc(p.sortOrder)] },
      purchaseInfo: true,
      handmadeInfo: true,
      itemTags: { with: { tag: true } },
      itemMaterials: { with: { material: true } },
    },
  });

  if (!item) throw error(404, 'アイテムが見つかりません');

  // 署名付きURLを生成（サムネイル・元画像）
  const photosWithUrls = await Promise.all(
    item.photos.map(async (p) => ({
      ...p,
      thumbUrl: await getPresignedGetUrl(platform!.env, p.r2KeyThumb),
      origUrl: await getPresignedGetUrl(platform!.env, p.r2KeyOrig),
    }))
  );

  return { item: { ...item, photos: photosWithUrls } };
};
```

- [ ] **Step 2: 詳細・編集ページを実装**

```svelte
<!-- src/routes/items/[id]/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { toast } from 'svelte-sonner';
  import { invalidateAll } from '$app/navigation';

  export let data: PageData;
  $: item = data.item;

  let editing = false;
  let saving = false;

  // 編集用の一時データ
  let editName = '';
  let editSeries = '';
  let editIsPublic = 0;
  let editPurchaseInfoPublic = 0;
  let editHandmadeInfoPublic = 0;
  let editStatus = 'owned';

  function startEdit() {
    editName = item.name ?? '';
    editSeries = item.series ?? '';
    editIsPublic = item.isPublic;
    editPurchaseInfoPublic = item.purchaseInfoPublic;
    editHandmadeInfoPublic = item.handmadeInfoPublic;
    editStatus = item.status;
    editing = true;
  }

  async function saveEdit() {
    saving = true;
    await fetch(`/api/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editName || null,
        series: editSeries || null,
        isPublic: editIsPublic,
        purchaseInfoPublic: editPurchaseInfoPublic,
        handmadeInfoPublic: editHandmadeInfoPublic,
        status: editStatus,
      }),
    });
    await invalidateAll();
    editing = false;
    saving = false;
    toast.success('保存しました');
  }

  async function deleteItem() {
    if (!confirm('削除しますか？写真も削除されます。')) return;
    await fetch(`/api/items/${item.id}`, { method: 'DELETE' });
    location.href = '/items';
  }

  $: coverPhoto = item.photos.find((p) => p.isCover) ?? item.photos[0];
</script>

<div class="max-w-2xl mx-auto p-4">
  <div class="flex items-center justify-between mb-4">
    <a href="/items" class="text-muted-foreground hover:underline">← 一覧へ</a>
    <div class="flex gap-2">
      {#if !editing}
        <button class="border rounded-lg px-3 py-1 text-sm" on:click={startEdit}>編集</button>
        <button class="border rounded-lg px-3 py-1 text-sm text-destructive" on:click={deleteItem}>削除</button>
      {:else}
        <button class="border rounded-lg px-3 py-1 text-sm" on:click={() => editing = false}>キャンセル</button>
        <button class="bg-primary text-primary-foreground rounded-lg px-3 py-1 text-sm" disabled={saving} on:click={saveEdit}>
          {saving ? '保存中...' : '保存'}
        </button>
      {/if}
    </div>
  </div>

  <!-- 写真 -->
  {#if coverPhoto}
    <img src={coverPhoto.thumbUrl} alt={item.name ?? ''} class="w-full rounded-xl mb-4 object-cover" style="max-height:400px" />
  {/if}

  <!-- 基本情報 -->
  {#if editing}
    <div class="space-y-3 mb-4">
      <input bind:value={editName} placeholder="名前" class="w-full border rounded-lg px-3 py-2 text-xl font-bold" />
      <input bind:value={editSeries} placeholder="シリーズ名" class="w-full border rounded-lg px-3 py-2" />

      <!-- 公開設定 -->
      <div class="border rounded-xl p-4 space-y-2">
        <label class="flex items-center gap-2">
          <input type="checkbox" bind:checked={editIsPublic} value={1} />
          <span class="font-medium">このアイテムを公開する</span>
        </label>
        {#if editIsPublic}
          <label class="flex items-center gap-2 ml-4 text-sm text-muted-foreground">
            <input type="checkbox" bind:checked={editPurchaseInfoPublic} value={1} />
            購入情報も公開する（店舗・金額・作家名など）
          </label>
          <label class="flex items-center gap-2 ml-4 text-sm text-muted-foreground">
            <input type="checkbox" bind:checked={editHandmadeInfoPublic} value={1} />
            制作情報も公開する（制作期間・素材・メモ）
          </label>
        {/if}
      </div>

      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" on:change={(e) => editStatus = e.currentTarget.checked ? 'parted' : 'owned'} checked={editStatus === 'parted'} />
        手放したアイテムとしてマーク
      </label>
    </div>
  {:else}
    <h1 class="text-2xl font-bold mb-1">{item.name ?? '名称未設定'}</h1>
    {#if item.series}<p class="text-muted-foreground mb-2">{item.series}</p>{/if}
    {#if item.isPublic}
      <div class="mb-2 text-sm">
        <a href="/p/{item.id}" class="text-blue-500 hover:underline">公開ページ: /p/{item.id}</a>
      </div>
    {/if}
  {/if}

  <!-- 購入情報 -->
  {#if item.purchaseInfo && item.isHandmade === 0}
    <div class="border rounded-xl p-4 mb-4">
      <h3 class="font-semibold mb-2">購入情報</h3>
      {#if item.purchaseInfo.storeName}<p class="text-sm">店舗: {item.purchaseInfo.storeName}</p>{/if}
      {#if item.purchaseInfo.eventName}<p class="text-sm">イベント: {item.purchaseInfo.eventName}</p>{/if}
      {#if item.purchaseInfo.purchaseDate}<p class="text-sm">購入日: {item.purchaseInfo.purchaseDate}</p>{/if}
      {#if item.purchaseInfo.purchasePrice}<p class="text-sm">金額: ¥{item.purchaseInfo.purchasePrice.toLocaleString()}</p>{/if}
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
        <p class="text-sm mt-2">素材: {item.itemMaterials.map(m => m.material.name).join(', ')}</p>
      {/if}
      {#if item.handmadeInfo.notes}<p class="text-sm mt-2 whitespace-pre-wrap">{item.handmadeInfo.notes}</p>{/if}
    </div>
  {/if}

  <!-- タグ -->
  {#if item.itemTags?.length}
    <div class="flex flex-wrap gap-2">
      {#each item.itemTags as t}
        <span class="text-xs border rounded-full px-3 py-1">{t.tag.name}</span>
      {/each}
    </div>
  {/if}
</div>
```

- [ ] **Step 3: コミット**

```bash
git add -A
git commit -m "feat: アイテム詳細・インライン編集ページ"
```

---

### Task 19: 公開ページ（/p/:id）

**Files:**
- Create: `src/routes/p/[id]/+page.server.ts`
- Create: `src/routes/p/[id]/+page.svelte`

- [ ] **Step 1: 公開ページのサーバーサイドを実装**

```ts
// src/routes/p/[id]/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb, items } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { getPresignedGetUrl } from '$lib/server/r2';

export const load: PageServerLoad = async ({ params, platform }) => {
  const db = getDb(platform!.env.DB);
  const item = await db.query.items.findFirst({
    where: eq(items.id, params.id),
    with: {
      photos: { orderBy: (p, { asc }) => [asc(p.sortOrder)] },
      purchaseInfo: true,
      handmadeInfo: true,
      itemTags: { with: { tag: true } },
      itemMaterials: { with: { material: true } },
    },
  });

  if (!item || !item.isPublic) throw error(404, 'ページが見つかりません');

  const photosWithUrls = await Promise.all(
    item.photos.map(async (p) => ({
      ...p,
      thumbUrl: await getPresignedGetUrl(platform!.env, p.r2KeyThumb),
      origUrl: await getPresignedGetUrl(platform!.env, p.r2KeyOrig),
    }))
  );

  // 非公開フラグに基づいて情報を除去
  return {
    item: {
      ...item,
      photos: photosWithUrls,
      purchaseInfo: item.purchaseInfoPublic ? item.purchaseInfo : null,
      handmadeInfo: item.handmadeInfoPublic ? item.handmadeInfo : null,
      itemMaterials: item.handmadeInfoPublic ? item.itemMaterials : [],
    },
  };
};
```

- [ ] **Step 2: 公開ページを実装（ログインUI一切なし）**

```svelte
<!-- src/routes/p/[id]/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  export let data: PageData;
  $: item = data.item;
  $: coverPhoto = item.photos.find((p: any) => p.isCover) ?? item.photos[0];
</script>

<svelte:head>
  <title>{item.name ?? '名称未設定'}</title>
</svelte:head>

<div class="max-w-xl mx-auto p-4">
  {#if coverPhoto}
    <img src={coverPhoto.thumbUrl} alt={item.name ?? ''} class="w-full rounded-xl mb-6 object-cover" style="max-height:480px" />
  {/if}

  <h1 class="text-2xl font-bold mb-1">{item.name ?? '名称未設定'}</h1>
  {#if item.series}<p class="text-muted-foreground mb-4">{item.series}</p>{/if}

  {#if item.purchaseInfo}
    <div class="border rounded-xl p-4 mb-4 space-y-1">
      <h3 class="font-semibold mb-2">購入情報</h3>
      {#if item.purchaseInfo.maker}<p class="text-sm">メーカー: {item.purchaseInfo.maker}</p>{/if}
      {#if item.purchaseInfo.artistName}<p class="text-sm">作家: {item.purchaseInfo.artistName}</p>{/if}
      {#if item.purchaseInfo.purchaseDate}<p class="text-sm">購入日: {item.purchaseInfo.purchaseDate}</p>{/if}
    </div>
  {/if}

  {#if item.handmadeInfo}
    <div class="border rounded-xl p-4 mb-4 space-y-1">
      <h3 class="font-semibold mb-2">制作情報</h3>
      {#if item.handmadeInfo.productionEnd}<p class="text-sm">完成: {item.handmadeInfo.productionEnd}</p>{/if}
      {#if item.itemMaterials?.length}
        <p class="text-sm">素材: {item.itemMaterials.map((m: any) => m.material.name).join(', ')}</p>
      {/if}
    </div>
  {/if}

  {#if item.itemTags?.length}
    <div class="flex flex-wrap gap-2 mt-4">
      {#each item.itemTags as t}
        <span class="text-xs border rounded-full px-3 py-1">{(t as any).tag.name}</span>
      {/each}
    </div>
  {/if}
</div>
```

- [ ] **Step 3: コミット**

```bash
git add -A
git commit -m "feat: 公開ページ実装（認証不要・情報フィルタリング付き）"
```

---

### Task 20: 管理トップ・ルートページ

**Files:**
- Create: `src/routes/admin/+page.svelte`
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: トップページを /items にリダイレクト**

```svelte
<!-- src/routes/+page.svelte -->
<script>
  import { goto } from '$app/navigation';
  goto('/items');
</script>
```

- [ ] **Step 2: 管理トップを作成（ブックマーク用）**

```svelte
<!-- src/routes/admin/+page.svelte -->
<script>
  import { goto } from '$app/navigation';
  goto('/items');
</script>
```

- [ ] **Step 3: コミット**

```bash
git add -A
git commit -m "feat: 管理トップ・ルートリダイレクト"
```

---

## Phase 7: PWA

### Task 21: PWA 設定

**Files:**
- Modify: `vite.config.ts`
- Create: `static/manifest.json`
- Create: `static/icons/` (各サイズのアイコン)

- [ ] **Step 1: @vite-pwa/sveltekit をインストール**

```bash
npm install -D @vite-pwa/sveltekit
```

- [ ] **Step 2: vite.config.ts に PWA プラグインを追加**

```ts
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    sveltekit(),
    SvelteKitPWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'フィギュアコレクション',
        short_name: 'コレクション',
        description: 'フィギュア・置物のコレクション管理',
        theme_color: '#1e1e2e',
        background_color: '#1e1e2e',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html}'],
      },
    }),
  ],
});
```

- [ ] **Step 3: PWA アイコンを用意**

`static/icons/` に `icon-192.png` と `icon-512.png` を配置（任意の画像ツールで作成）。

- [ ] **Step 4: ルートレイアウトに PWA メタタグを追加**

```svelte
<!-- src/routes/+layout.svelte に追記 -->
<svelte:head>
  <meta name="theme-color" content="#1e1e2e" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
</svelte:head>
```

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "feat: PWA設定（ホーム画面追加対応）"
```

---

## Phase 8: デプロイ

### Task 22: Cloudflare Pages デプロイ設定

- [ ] **Step 1: GitHub リポジトリを作成してプッシュ**

```bash
git remote add origin https://github.com/<YOUR_USERNAME>/figurine-catalog.git
git push -u origin main
```

- [ ] **Step 2: Cloudflare Pages でプロジェクトを作成**

Cloudflare ダッシュボード → Pages → 「Create a project」→ GitHubリポジトリを選択

ビルド設定:
```
Framework preset: SvelteKit
Build command:    npm run build
Build output:     .svelte-kit/cloudflare
```

- [ ] **Step 3: D1・R2 バインディングを Pages プロジェクトに設定**

Cloudflare Pages → Settings → Functions → D1 database bindings:
- Variable name: `DB`、D1 database: `figurine-catalog-db`

R2 bucket bindings:
- Variable name: `R2`、R2 bucket: `figurine-catalog-photos`

- [ ] **Step 4: 環境変数を Pages に設定**

Pages → Settings → Environment variables:
```
R2_BUCKET_NAME = figurine-catalog-photos
CLOUDFLARE_ACCOUNT_ID = <your account id>
R2_ACCESS_KEY_ID = <secret>
R2_SECRET_ACCESS_KEY = <secret>
```

- [ ] **Step 5: 本番 D1 にマイグレーションを適用**

```bash
npx wrangler d1 migrations apply figurine-catalog-db --remote
```

- [ ] **Step 6: Cloudflare Access を設定**

Cloudflare Zero Trust → Access → Applications → 「Add an application」

- Application type: Self-hosted
- Application domain: `<your-pages-domain>`
- Protected paths: `/items/*`, `/admin/*`, `/api/*`
- Policy: Email → あなたのGoogleアカウントのメールアドレス

- [ ] **Step 7: デプロイを確認**

`main` にプッシュして自動デプロイが走ることを確認。Pages のビルドログが緑になることを確認。

---

## セルフレビュー

### 仕様書カバレッジ確認

| 仕様要件 | 対応タスク |
|---|---|
| 写真1枚で即保存 | Task 9, 11, 17 |
| presigned URL方式 | Task 8, 11 |
| クライアントサイドリサイズ | Task 7, 14 |
| 購入/自作分岐ウィザード | Task 17 |
| タグピッカー（よく使う・定番・追加） | Task 12, 13 |
| グリッド表示・無限スクロール | Task 16 |
| LIKE検索 | Task 9 |
| ORタグフィルタ | Task 16（実装省略→次フェーズ） |
| 写真20枚上限・並び替え | Task 11, 14（並び替えUI省略→後述） |
| カバー写真（1枚目が自動設定） | Task 11 |
| 公開/非公開フラグ | Task 10, 18, 19 |
| purchase_info_public / handmade_info_public | Task 10, 18, 19 |
| 認証（Cloudflare Access + Google） | Task 22 |
| 公開ページ /p/:id | Task 19 |
| 管理ページ /admin | Task 20 |
| status（owned/parted） | Task 9, 18 |
| アイテム削除（R2も同時削除） | Task 10 |
| Drizzle ORM | Task 3–5 |
| wrangler dev | Task 1, 9, 16, 17 |
| GitHub → Cloudflare Pages自動デプロイ | Task 22 |
| PWA | Task 21 |
| OSテーマ追従 | Task 2（Tailwind `darkMode: 'media'`） |
| shadcn-svelte | Task 2, 13, 14 |

**未対応項目（後フェーズ推奨）:**
- 写真のドラッグ&ドロップ並び替え UI（`svelte-dnd-action`）
- タグフィルタのOR絞り込み実装（APIはパラメータ受け取り可能だが UI が未実装）
- 写真一覧での複数枚表示・ギャラリービュー
- アイテム詳細の購入情報・制作情報の編集（編集ウィザードの呼び出し）
