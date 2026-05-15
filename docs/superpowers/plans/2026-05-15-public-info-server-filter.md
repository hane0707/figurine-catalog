# purchaseInfo/handmadeInfo サーバーサイドフィルタリング 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 未ログインユーザーへのアイテム詳細レスポンスから、非公開フラグが立った `purchaseInfo` / `handmadeInfo` を null にして返すサーバーサイドフィルタを実装する。

**Architecture:** `+page.server.ts` の `load` 関数内でDBフェッチ後、`locals.user` の有無と各公開フラグを照合して返却オブジェクトを null 化する。UIの冗長な `handmadeInfoPublic` チェックも同時に削除する。

**Tech Stack:** SvelteKit (page.server.ts load function), Vitest, TypeScript

---

### Task 1: テストケースの追加

**Files:**
- Modify: `src/routes/items/[id]/page.server.test.ts`

- [ ] **Step 1: 既存テストファイルを確認して末尾にフィルタリングテストを追記**

`src/routes/items/[id]/page.server.test.ts` のファイル末尾（既存の `describe` ブロックの閉じ括弧の後）に以下を追加：

```ts
describe('/items/[id] load: purchaseInfo/handmadeInfo フィルタリング', () => {
  const baseItem = {
    id: 'test-id',
    isPublic: 1,
    purchaseInfoPublic: 0,
    handmadeInfoPublic: 0,
    photos: [],
    itemTags: [],
    itemMaterials: [],
  };

  it('未ログイン + purchaseInfoPublic=0 → purchaseInfo が null', async () => {
    mockFindFirst.mockResolvedValueOnce({
      ...baseItem,
      purchaseInfoPublic: 0,
      purchaseInfo: { storeName: 'Shop A', purchasePrice: 10000 },
      handmadeInfo: null,
    });
    const result = await load({
      locals: {},
      params: { id: 'test-id' },
      platform: { env: { DB: {} } },
    } as any);
    expect(result.item.purchaseInfo).toBeNull();
  });

  it('未ログイン + purchaseInfoPublic=1 → purchaseInfo が返る', async () => {
    mockFindFirst.mockResolvedValueOnce({
      ...baseItem,
      purchaseInfoPublic: 1,
      purchaseInfo: { storeName: 'Shop A', purchasePrice: 10000 },
      handmadeInfo: null,
    });
    const result = await load({
      locals: {},
      params: { id: 'test-id' },
      platform: { env: { DB: {} } },
    } as any);
    expect(result.item.purchaseInfo).not.toBeNull();
    expect(result.item.purchaseInfo?.storeName).toBe('Shop A');
  });

  it('未ログイン + handmadeInfoPublic=0 → handmadeInfo が null', async () => {
    mockFindFirst.mockResolvedValueOnce({
      ...baseItem,
      handmadeInfoPublic: 0,
      purchaseInfo: null,
      handmadeInfo: { quote: '秘密の台詞', notes: 'メモ', productionStart: '2024-01-01', productionEnd: null },
    });
    const result = await load({
      locals: {},
      params: { id: 'test-id' },
      platform: { env: { DB: {} } },
    } as any);
    expect(result.item.handmadeInfo).toBeNull();
  });

  it('未ログイン + handmadeInfoPublic=1 → handmadeInfo が返る', async () => {
    mockFindFirst.mockResolvedValueOnce({
      ...baseItem,
      handmadeInfoPublic: 1,
      purchaseInfo: null,
      handmadeInfo: { quote: '公開の台詞', notes: null, productionStart: null, productionEnd: null },
    });
    const result = await load({
      locals: {},
      params: { id: 'test-id' },
      platform: { env: { DB: {} } },
    } as any);
    expect(result.item.handmadeInfo).not.toBeNull();
    expect(result.item.handmadeInfo?.quote).toBe('公開の台詞');
  });

  it('ログイン済み + purchaseInfoPublic=0 → purchaseInfo が返る（オーナーは常に見える）', async () => {
    mockFindFirst.mockResolvedValueOnce({
      ...baseItem,
      purchaseInfoPublic: 0,
      purchaseInfo: { storeName: 'Secret Shop', purchasePrice: 99999 },
      handmadeInfo: null,
    });
    const result = await load({
      locals: { user: { email: 'owner@example.com' } },
      params: { id: 'test-id' },
      platform: { env: { DB: {} } },
    } as any);
    expect(result.item.purchaseInfo).not.toBeNull();
    expect(result.item.purchaseInfo?.storeName).toBe('Secret Shop');
  });

  it('ログイン済み + handmadeInfoPublic=0 → handmadeInfo が返る', async () => {
    mockFindFirst.mockResolvedValueOnce({
      ...baseItem,
      handmadeInfoPublic: 0,
      purchaseInfo: null,
      handmadeInfo: { quote: '非公開の台詞', notes: null, productionStart: null, productionEnd: null },
    });
    const result = await load({
      locals: { user: { email: 'owner@example.com' } },
      params: { id: 'test-id' },
      platform: { env: { DB: {} } },
    } as any);
    expect(result.item.handmadeInfo).not.toBeNull();
    expect(result.item.handmadeInfo?.quote).toBe('非公開の台詞');
  });
});
```

- [ ] **Step 2: テストを実行して FAIL を確認**

```bash
npm test -- src/routes/items/\\[id\\]/page.server.test.ts
```

期待される結果: 新しく追加した6ケースすべてが FAIL（`purchaseInfo` が null にならず現状のデータが返る）

---

### Task 2: `+page.server.ts` にフィルタロジックを実装

**Files:**
- Modify: `src/routes/items/[id]/+page.server.ts`

- [ ] **Step 1: load 関数の return 部分を修正**

現在の `src/routes/items/[id]/+page.server.ts` の return 文（38〜43行目付近）を以下に置き換える：

変更前:
```ts
  return {
    item: { ...item, photos: photosWithUrls },
    allTags,
    materials: { all: allMaterials, frequent },
  };
```

変更後:
```ts
  const isOwner = !!locals.user;

  return {
    item: {
      ...item,
      photos: photosWithUrls,
      purchaseInfo: (isOwner || item.purchaseInfoPublic === 1) ? item.purchaseInfo : null,
      handmadeInfo: (isOwner || item.handmadeInfoPublic === 1) ? item.handmadeInfo : null,
    },
    allTags,
    materials: { all: allMaterials, frequent },
  };
```

- [ ] **Step 2: テストを実行して PASS を確認**

```bash
npm test -- src/routes/items/\\[id\\]/page.server.test.ts
```

期待される結果: 全テストケースが PASS

---

### Task 3: `+page.svelte` の冗長チェックを削除

**Files:**
- Modify: `src/routes/items/[id]/+page.svelte:324-329`

- [ ] **Step 1: quote ブロックの条件を簡略化**

`src/routes/items/[id]/+page.svelte` の quote ブロック（324行目付近）を修正：

変更前:
```svelte
{#if item.isHandmade === 1 && item.handmadeInfo?.quote &&
     (data.user || (item.isPublic === 1 && item.handmadeInfoPublic === 1))}
```

変更後:
```svelte
{#if item.isHandmade === 1 && item.handmadeInfo?.quote}
```

- [ ] **Step 2: ビルドエラーがないことを確認**

```bash
npm run build 2>&1 | tail -20
```

期待される結果: エラーなし（`BUILD COMPLETE` またはワーニングのみ）

---

### Task 4: コミット

- [ ] **Step 1: 変更をコミット**

```bash
git add src/routes/items/[id]/+page.server.ts src/routes/items/[id]/+page.svelte src/routes/items/[id]/page.server.test.ts
git commit -m "$(cat <<'EOF'
feat: purchaseInfo/handmadeInfo を未ログイン時にサーバー側でフィルタリング

未ログインユーザーへのレスポンスから、purchaseInfoPublic/handmadeInfoPublic
フラグが 0 のとき対応フィールドを null にして返す。
UIの冗長な handmadeInfoPublic チェックも合わせて削除。

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```
