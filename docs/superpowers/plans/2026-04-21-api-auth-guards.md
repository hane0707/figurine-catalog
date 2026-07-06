# API 認証ガード実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 書き込み系 API エンドポイント（POST/PATCH/DELETE）に `locals.user` による認証チェックを追加し、未認証リクエストを 401 で拒否する。ローカル開発用バイパスと CF Access JWT 署名検証も実装する。

**Architecture:** SvelteKit の `hooks.server.ts` で CF Access JWT を検証して `locals.user` にセットし、各 API ハンドラーで `locals.user` の存在を確認する。ローカル開発では `.dev.vars` の `DEV_ADMIN_EMAIL` でバイパスする。

**Tech Stack:** SvelteKit RequestHandler, Cloudflare Workers, Web Crypto API (RS256), Vitest + @testing-library/svelte

---

## 変更ファイル一覧

| ファイル | 種別 | 内容 |
|---|---|---|
| `src/hooks.server.ts` | 修正 | JWT 署名検証 + ローカル dev バイパス |
| `src/routes/api/items/+server.ts` | 修正 | POST に auth guard 追加 |
| `src/routes/api/items/[id]/+server.ts` | 修正 | PATCH・DELETE に auth guard 追加 |
| `src/routes/api/photos/presign/+server.ts` | 修正 | POST に auth guard 追加 |
| `src/routes/api/photos/[id]/+server.ts` | 修正 | POST に auth guard 追加 |
| `src/routes/api/materials/+server.ts` | 修正 | POST に auth guard 追加 |
| `src/routes/api/tags/+server.ts` | 修正 | POST に auth guard 追加 |
| `src/routes/items/[id]/page.test.ts` | 修正 | `mockData` に `user` を追加（既存テスト修正） |
| `src/routes/items/new/page.test.ts` | 修正 | `mockData` に `user` を追加（既存テスト修正） |
| `.dev.vars` | 修正 | `DEV_ADMIN_EMAIL` を追加 |

---

### Task 1: 既存テストを修正（先に直さないとビルドが壊れる）

**背景:** 編集・削除ボタンは `data.user` が truthy な場合のみレンダリングされるようになった。既存テストの `mockData` に `user` がないとボタンが見えず、クリックテストが失敗する。

**Files:**
- Modify: `src/routes/items/[id]/page.test.ts`
- Modify: `src/routes/items/new/page.test.ts`

- [ ] **Step 1: テストを実行して現状の失敗を確認**

```bash
cd /home/haku/projects/figurine-catalog
npx vitest run src/routes/items/[id]/page.test.ts 2>&1 | tail -30
```

Expected: "Unable to find element by text: 編集" のようなエラーで FAIL

- [ ] **Step 2: `[id]/page.test.ts` の `mockData` に `user` を追加**

```typescript
// src/routes/items/[id]/page.test.ts の mockData を以下に変更
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
  user: { email: 'test@example.com' },  // ← 追加
};
```

- [ ] **Step 3: テストを再実行して PASS を確認**

```bash
npx vitest run src/routes/items/[id]/page.test.ts 2>&1 | tail -20
```

Expected: すべて PASS

- [ ] **Step 4: `new/page.test.ts` の `mockData` にも `user` を追加**

`src/routes/items/new/page.test.ts` を開き、`mockData` オブジェクト（`allTags`・`materials` を含む）に `user: { email: 'test@example.com' }` を追加する。

```bash
npx vitest run src/routes/items/new/page.test.ts 2>&1 | tail -20
```

Expected: すべて PASS

- [ ] **Step 5: コミット**

```bash
cd /home/haku/projects/figurine-catalog
git add src/routes/items/[id]/page.test.ts src/routes/items/new/page.test.ts
git commit -m "test: mockDataにuserを追加してauth対応後のテストを修正"
```

---

### Task 2: ローカル開発用バイパスを追加

**背景:** CF Access はデプロイ後のみ動作する。ローカルでは `.dev.vars` の `DEV_ADMIN_EMAIL` がセットされていれば認証済みとみなす。

**Files:**
- Modify: `.dev.vars`
- Modify: `src/hooks.server.ts`
- Modify: `src/app.d.ts` (Platform 型に追加)

- [ ] **Step 1: `.dev.vars` に環境変数を追加**

`.dev.vars` を開き、以下を追加する（ファイルが存在しない場合は作成する）:

```ini
DEV_ADMIN_EMAIL=local@dev
```

- [ ] **Step 2: `app.d.ts` の Platform 型に `DEV_ADMIN_EMAIL` を追加**

```typescript
// src/app.d.ts の Platform.env に追加
interface Platform {
  env: {
    DB: D1Database;
    R2: R2Bucket;
    CLOUDFLARE_ACCOUNT_ID: string;
    R2_ACCESS_KEY_ID: string;
    R2_SECRET_ACCESS_KEY: string;
    R2_BUCKET_NAME: string;
    R2_KEY_PREFIX?: string;
    DEV_ADMIN_EMAIL?: string;  // ← 追加
  };
  context: ExecutionContext;
  caches: CacheStorage & { default: Cache };
}
```

- [ ] **Step 3: `hooks.server.ts` にローカルバイパスを追加**

```typescript
// src/hooks.server.ts を以下に全置換
import type { Handle } from '@sveltejs/kit';

function decodeCfJwt(token: string): { email?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(payload);
    return JSON.parse(json) as { email?: string };
  } catch {
    return null;
  }
}

export const handle: Handle = async ({ event, resolve }) => {
  // ローカル開発バイパス（DEV_ADMIN_EMAIL がセットされていれば認証済みとみなす）
  const devEmail = event.platform?.env?.DEV_ADMIN_EMAIL;
  if (devEmail) {
    event.locals.user = { email: devEmail };
    return resolve(event);
  }

  // 本番: CF Access JWT を解析
  const cfJwt = event.cookies.get('CF_Authorization');
  if (cfJwt) {
    const claims = decodeCfJwt(cfJwt);
    if (claims?.email) {
      event.locals.user = { email: claims.email };
    }
  }

  return resolve(event);
};
```

- [ ] **Step 4: ローカルで dev サーバーを起動して確認**

```bash
cd /home/haku/projects/figurine-catalog
npm run dev
```

ブラウザで http://localhost:5173/items を開き、ログアウトボタンが表示されていないこと（まだナビバーに出ない場合は次タスク以降）、FAB が表示されることを確認する。

- [ ] **Step 5: コミット**

```bash
git add .dev.vars src/app.d.ts src/hooks.server.ts
git commit -m "feat: ローカル開発用auth bypass(DEV_ADMIN_EMAIL)を追加"
```

---

### Task 3: 書き込み API に認証ガードを追加

**背景:** 6つの API ファイルの write ハンドラーに `if (!locals.user) throw error(401, 'Unauthorized')` を追加する。GET は公開なのでガードしない。

**Files:**
- Modify: `src/routes/api/items/+server.ts`
- Modify: `src/routes/api/items/[id]/+server.ts`
- Modify: `src/routes/api/photos/presign/+server.ts`
- Modify: `src/routes/api/photos/[id]/+server.ts`
- Modify: `src/routes/api/materials/+server.ts`
- Modify: `src/routes/api/tags/+server.ts`

- [ ] **Step 1: `api/items/+server.ts` の POST にガードを追加**

`POST` ハンドラーの先頭（`const db = ...` の前）に追加する:

```typescript
export const POST: RequestHandler = async ({ request, platform, locals }) => {
  if (!locals.user) throw error(401, 'Unauthorized');
  const db = getDb(platform!.env.DB);
  // ... 以下既存コード
```

`error` を既存の import に追加する:
```typescript
import { json, error } from '@sveltejs/kit';
```

- [ ] **Step 2: `api/items/[id]/+server.ts` の PATCH・DELETE にガードを追加**

```typescript
export const PATCH: RequestHandler = async ({ params, request, platform, locals }) => {
  if (!locals.user) throw error(401, 'Unauthorized');
  // ... 以下既存コード

export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
  if (!locals.user) throw error(401, 'Unauthorized');
  // ... 以下既存コード
```

（`error` は既に import 済み）

- [ ] **Step 3: `api/photos/presign/+server.ts` の POST にガードを追加**

```typescript
export const POST: RequestHandler = async ({ request, platform, locals }) => {
  if (!locals.user) throw error(401, 'Unauthorized');
  // ... 以下既存コード
```

（`error` は既に import 済み）

- [ ] **Step 4: `api/photos/[id]/+server.ts` の POST にガードを追加**

```typescript
// src/routes/api/photos/[id]/+server.ts を開いて POST ハンドラーを確認し、先頭に追加
export const POST: RequestHandler = async ({ params, request, platform, locals }) => {
  if (!locals.user) throw error(401, 'Unauthorized');
  // ... 以下既存コード
```

- [ ] **Step 5: `api/materials/+server.ts` の POST にガードを追加**

```typescript
export const POST: RequestHandler = async ({ request, platform, locals }) => {
  if (!locals.user) throw error(401, 'Unauthorized');
  // ... 以下既存コード
```

- [ ] **Step 6: `api/tags/+server.ts` の POST にガードを追加**

```typescript
export const POST: RequestHandler = async ({ request, platform, locals }) => {
  if (!locals.user) throw error(401, 'Unauthorized');
  // ... 以下既存コード
```

- [ ] **Step 7: ローカルで動作確認**

dev サーバーが起動している状態で:

```bash
# DEV_ADMIN_EMAIL がセットされているのでガードを通過できる（201 が返るはず）
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5173/api/items \
  -H "Content-Type: application/json" -d '{"name":"test"}'
# Expected: 201

# cookie なしで直接叩いたら 401 になるか確認（devサーバーは DEV_ADMIN_EMAIL でバイパスされるため、
# DEV_ADMIN_EMAIL を一時的にコメントアウトするか本番環境でのみ確認）
```

- [ ] **Step 8: 全テストを実行**

```bash
npx vitest run 2>&1 | tail -30
```

Expected: すべて PASS（API テストがなければスキップ）

- [ ] **Step 9: コミット**

```bash
git add src/routes/api/
git commit -m "feat: 書き込みAPIに認証ガード(401 Unauthorized)を追加"
```

---

### Task 4: CF Access JWT 署名検証（本番セキュリティ強化）

**背景:** 現在の実装は JWT の base64 デコードのみで署名を検証しない。CF Access の公開鍵（RS256）で署名を検証することで cookie 偽造を防ぐ。`CF_ACCESS_AUD`（Application Audience Tag）が必要。

**Files:**
- Modify: `src/hooks.server.ts`
- Modify: `src/app.d.ts`

- [ ] **Step 1: `app.d.ts` に `CF_ACCESS_AUD` を追加**

```typescript
interface Platform {
  env: {
    // ... 既存フィールド
    DEV_ADMIN_EMAIL?: string;
    CF_ACCESS_AUD?: string;   // ← 追加: Cloudflare Access Application Audience Tag
  };
}
```

- [ ] **Step 2: `hooks.server.ts` を署名検証付きに書き換え**

```typescript
// src/hooks.server.ts 全置換
import type { Handle } from '@sveltejs/kit';

const CERTS_CACHE = new Map<string, { keys: JsonWebKey[]; cachedAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10分

async function fetchCfPublicKeys(teamDomain: string): Promise<JsonWebKey[]> {
  const cached = CERTS_CACHE.get(teamDomain);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) return cached.keys;

  const res = await fetch(`https://${teamDomain}.cloudflareaccess.com/cdn-cgi/access/certs`);
  if (!res.ok) return [];
  const data = await res.json() as { keys: JsonWebKey[] };
  CERTS_CACHE.set(teamDomain, { keys: data.keys, cachedAt: Date.now() });
  return data.keys;
}

async function verifyCfJwt(
  token: string,
  aud: string,
  teamDomain: string,
): Promise<{ email?: string } | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  // ヘッダーから kid を取得
  let kid: string | undefined;
  try {
    const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/'))) as { kid?: string };
    kid = header.kid;
  } catch { return null; }

  // 公開鍵一覧を取得
  const jwks = await fetchCfPublicKeys(teamDomain);
  const jwk = kid ? jwks.find((k: any) => k.kid === kid) : jwks[0];
  if (!jwk) return null;

  try {
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const enc = new TextEncoder();
    const signingInput = enc.encode(`${parts[0]}.${parts[1]}`);
    const signature = Uint8Array.from(
      atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0),
    );

    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, signature, signingInput);
    if (!valid) return null;

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
      email?: string;
      aud?: string | string[];
      exp?: number;
    };

    // aud 検証
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audiences.includes(aud)) return null;

    // 有効期限検証
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return { email: payload.email };
  } catch {
    return null;
  }
}

function unsafeDecode(token: string): { email?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)) as { email?: string };
  } catch {
    return null;
  }
}

export const handle: Handle = async ({ event, resolve }) => {
  // ローカル開発バイパス
  const devEmail = event.platform?.env?.DEV_ADMIN_EMAIL;
  if (devEmail) {
    event.locals.user = { email: devEmail };
    return resolve(event);
  }

  // 本番: CF Access JWT を検証
  const cfJwt = event.cookies.get('CF_Authorization');
  if (cfJwt) {
    const aud = event.platform?.env?.CF_ACCESS_AUD;
    const teamDomain = event.platform?.env?.CF_ACCESS_TEAM_DOMAIN;

    let claims: { email?: string } | null = null;

    if (aud && teamDomain) {
      // 署名検証あり（本番推奨）
      claims = await verifyCfJwt(cfJwt, aud, teamDomain);
    } else {
      // 署名検証なし（CF_ACCESS_AUD 未設定時のフォールバック）
      claims = unsafeDecode(cfJwt);
    }

    if (claims?.email) {
      event.locals.user = { email: claims.email };
    }
  }

  return resolve(event);
};
```

- [ ] **Step 3: `app.d.ts` に `CF_ACCESS_TEAM_DOMAIN` も追加**

```typescript
CF_ACCESS_AUD?: string;
CF_ACCESS_TEAM_DOMAIN?: string;  // ← 追加: 例 "myteam"（myteam.cloudflareaccess.com の前半）
```

- [ ] **Step 4: デプロイ時の Cloudflare 設定確認（コメント）**

Cloudflare Workers のダッシュボードまたは `wrangler.toml` の `[vars]` に以下を追加する（シークレットは `wrangler secret put` で設定）:

```toml
# wrangler.toml に追加（シークレットでない値のみ）
[vars]
CF_ACCESS_TEAM_DOMAIN = "your-team-name"
```

```bash
# Audience Tag は Cloudflare Access > Applications > 該当アプリ > Overview で確認
wrangler secret put CF_ACCESS_AUD
# プロンプトにペーストして Enter
```

- [ ] **Step 5: 全テストを実行**

```bash
npx vitest run 2>&1 | tail -20
```

Expected: すべて PASS（hooks はサーバー専用なので単体テスト不要）

- [ ] **Step 6: コミット**

```bash
git add src/hooks.server.ts src/app.d.ts
git commit -m "feat: CF Access JWT RS256署名検証を実装（CF_ACCESS_AUD/TEAM_DOMAIN設定時に有効化）"
```

---

## 自己レビュー

**Spec カバレッジ確認:**
- ✅ 書き込み API 全6エンドポイントにガード追加（Task 3）
- ✅ 既存テストの修正（Task 1）
- ✅ ローカル開発バイパス（Task 2）
- ✅ JWT署名検証（Task 4）
- ✅ GET エンドポイントは公開のまま（触らない）

**注意点:**
- `CF_ACCESS_AUD` と `CF_ACCESS_TEAM_DOMAIN` が未設定の場合は署名なしデコードにフォールバックする（後方互換）
- `CERTS_CACHE` は Workers のリクエスト間で共有されないため、グローバルキャッシュは同一 isolate 内でのみ有効
