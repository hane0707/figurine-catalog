# ローカル開発用認証トグル Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ローカル開発環境でも `/admin` ページのボタンで認証状態をトグルできるようにし、`/items` は未認証ユーザーを `/admin` へリダイレクトする。

**Architecture:** `hooks.server.ts` のdevバイパスを「`DEV_ADMIN_EMAIL` があり、かつ `dev_logged_in` クッキーが `'1'` の場合のみログイン済み」に変更。`/items/+layout.server.ts` で認証ガードを追加。`/admin/+page.server.ts` に login/logout フォームアクションを追加してクッキーを操作する。

**Tech Stack:** SvelteKit 5 / TypeScript / Cloudflare Workers / Vitest

---

### Task 1: hooks.server.ts の devバイパス変更

**Files:**
- Modify: `src/hooks.server.ts:90-96`

- [ ] **Step 1: devバイパスをクッキー確認に変更**

`src/hooks.server.ts` の90〜96行目を以下に置き換える:

変更前:
```ts
const devEmail = event.platform?.env?.DEV_ADMIN_EMAIL;
if (devEmail) {
  event.locals.user = { email: devEmail };
  return resolve(event);
}
```

変更後:
```ts
const devEmail = event.platform?.env?.DEV_ADMIN_EMAIL;
if (devEmail) {
  const loggedIn = event.cookies.get('dev_logged_in');
  if (loggedIn === '1') {
    event.locals.user = { email: devEmail };
  }
  return resolve(event);
}
```

- [ ] **Step 2: 型チェック**

```bash
cd /home/haku/projects/figurine-catalog && npm run check
```

エラーなしで通ること。

- [ ] **Step 3: コミット**

```bash
git add src/hooks.server.ts
git commit -m "認証: ローカルdevバイパスをdev_logged_inクッキー確認に変更"
```

---

### Task 2: /items/+layout.server.ts - 認証ガード追加

**Files:**
- Create: `src/routes/items/+layout.server.ts`

- [ ] **Step 1: ファイル作成**

```ts
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
  if (!locals.user) throw redirect(302, '/admin');
};
```

- [ ] **Step 2: 型チェック**

```bash
npm run check
```

エラーなしで通ること。

- [ ] **Step 3: コミット**

```bash
git add src/routes/items/+layout.server.ts
git commit -m "認証: /items配下に認証ガードを追加"
```

---

### Task 3: /admin/+page.server.ts - login/logout アクション追加

**Files:**
- Modify: `src/routes/admin/+page.server.ts`

- [ ] **Step 1: ファイルを以下に置き換える**

```ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = ({ locals, platform }) => {
  // 本番環境（DEV_ADMIN_EMAIL なし）: /items へ（CF Accessが認証を担う）
  if (!platform?.env?.DEV_ADMIN_EMAIL) throw redirect(302, '/items');
  // 既にログイン済みなら /items へ
  if (locals.user) throw redirect(302, '/items');
  // devモード・未ログイン → ログインページを表示
  return {};
};

export const actions: Actions = {
  login: ({ cookies, platform }) => {
    if (!platform?.env?.DEV_ADMIN_EMAIL) throw redirect(302, '/items');
    cookies.set('dev_logged_in', '1', { path: '/', httpOnly: true, sameSite: 'lax' });
    throw redirect(302, '/items');
  },
  logout: ({ cookies }) => {
    cookies.delete('dev_logged_in', { path: '/' });
    throw redirect(302, '/admin');
  },
};
```

- [ ] **Step 2: 型チェック**

```bash
npm run check
```

エラーなしで通ること。

- [ ] **Step 3: コミット**

```bash
git add src/routes/admin/+page.server.ts
git commit -m "認証: /adminにdev用login/logoutアクションを追加"
```

---

### Task 4: /admin/+page.svelte - devログインページ作成

**Files:**
- Create: `src/routes/admin/+page.svelte`

- [ ] **Step 1: ファイル作成**

既存アプリのCSS変数（`--bg`, `--fg-soft`, `--f-mono`）を使い、スタイルに統一感を持たせる。

```svelte
<svelte:head>
  <title>Dev Login</title>
</svelte:head>

<div style="min-height: 100dvh; display: grid; place-items: center; background: var(--bg, #f0edf8);">
  <div style="text-align: center; font-family: var(--f-mono, monospace);">
    <div style="font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--fg-soft, #888); margin-bottom: 24px;">
      DEV MODE
    </div>
    <form method="POST" action="?/login">
      <button
        type="submit"
        style="padding: 12px 32px; font-family: inherit; font-size: 12px; letter-spacing: 0.08em; cursor: pointer; border: 1px solid currentColor; background: transparent; color: var(--fg, #1a1a1a);"
      >
        ログインする
      </button>
    </form>
  </div>
</div>
```

- [ ] **Step 2: 型チェック**

```bash
npm run check
```

エラーなしで通ること。

- [ ] **Step 3: コミット**

```bash
git add src/routes/admin/+page.svelte
git commit -m "認証: devモード用ログインページを追加"
```

---

### Task 5: /items/+page.svelte - devモード時のログアウトボタン表示

**Files:**
- Modify: `src/routes/items/+page.svelte:108-116`

- [ ] **Step 1: ログアウトボタン箇所を更新**

`src/routes/items/+page.svelte` の `nav-actions` 内を以下に置き換える。

変更前:
```svelte
<div class="nav-actions">
  {#if data.user && !data.isDevMode}
    <a href="/cdn-cgi/access/logout" class="btn --ghost" style="font-size:12px; letter-spacing:0.04em">
      ログアウト
    </a>
  {/if}
</div>
```

変更後:
```svelte
<div class="nav-actions">
  {#if data.user}
    {#if data.isDevMode}
      <form method="POST" action="/admin?/logout" style="display:contents">
        <button type="submit" class="btn --ghost" style="font-size:12px; letter-spacing:0.04em">
          ログアウト
        </button>
      </form>
    {:else}
      <a href="/cdn-cgi/access/logout" class="btn --ghost" style="font-size:12px; letter-spacing:0.04em">
        ログアウト
      </a>
    {/if}
  {/if}
</div>
```

- [ ] **Step 2: ビルドして動作確認**

```bash
npm run build && npx wrangler pages dev .svelte-kit/cloudflare
```

`http://localhost:8788` で以下をすべて確認する:

1. `/items` にアクセス → `/admin` にリダイレクトされる
2. `/admin` に「ログインする」ボタンが表示される
3. ボタンを押す → `/items` に遷移し、ログアウトボタンが右上に表示される
4. ログアウトボタンを押す → `/admin` に戻る
5. `/p/<有効なアイテムID>` → 認証なしでアクセスできる（リダイレクトされない）

- [ ] **Step 3: コミット**

```bash
git add src/routes/items/+page.svelte
git commit -m "認証: devモード時のログアウトボタンを追加"
```

---

### Task 6: README.md 更新

**Files:**
- Modify: `README.md`

- [ ] **Step 1: `DEV_ADMIN_EMAIL` の説明を更新（101行目付近）**

変更前:
```
DEV_ADMIN_EMAIL=local@dev  # ← ローカル認証バイパス（この値がセットされていれば常にログイン済み扱い）
```

変更後:
```
DEV_ADMIN_EMAIL=local@dev  # ← ローカル疑似認証用メール。セットされていると /admin でログインボタンが使えるようになる（デフォルトは未ログイン状態）
```

- [ ] **Step 2: ルーティングテーブルを更新（208〜214行目付近）**

変更前:
```markdown
| `/items` | コレクション一覧（閲覧は誰でも可） | 不要 |
...
| `/admin` | `/items` へリダイレクト | 不要 |
```

変更後:
```markdown
| `/items` | コレクション一覧 | 必要 |
...
| `/admin` | devモード: ログインページ / 本番: `/items` へリダイレクト | devモードのみ不要 |
```

- [ ] **Step 3: 認証の仕組み説明を更新（221行目付近）**

変更前:
```
ローカル開発時は `.dev.vars` の `DEV_ADMIN_EMAIL` がセットされていれば認証済み扱い。
```

変更後:
```
ローカル開発時は `.dev.vars` の `DEV_ADMIN_EMAIL` がセットされた状態で `/admin` のログインボタンを押すと認証済み扱いになる（`dev_logged_in` クッキーで管理）。
```

- [ ] **Step 4: Cloudflare Accessの保護パスを更新（182〜183行目付近）**

変更前:
```markdown
- `https://your-domain.com/api/*`
- `https://your-domain.com/items/new`

閲覧（`/items`, `/items/:id`, `/p/:id`）はパスを指定しなければ誰でもアクセス可能なまま。
```

変更後:
```markdown
- `https://your-domain.com/items`
- `https://your-domain.com/items/*`
- `https://your-domain.com/api/*`
- `https://your-domain.com/admin`

`/p/:id` のみ認証不要（公開ページ）。
```

- [ ] **Step 5: 手順7に許可メールアドレスの設定手順を追記**

手順7の既存内容（アプリケーション作成の説明）の後に以下を追加:

```markdown
#### 許可するメールアドレスを設定

Access → Applications → 該当アプリ → **Policies** → **Add a Policy**

- Policy name: `Allow owner`
- Action: `Allow`
- Include: **Emails** → 自分の Google アカウントのメールアドレスを入力

これで指定したメールアドレス以外は Google ログイン後も弾かれる。
```

- [ ] **Step 6: コミット**

```bash
git add README.md
git commit -m "docs: 認証フローの変更に合わせてREADMEを更新"
```
