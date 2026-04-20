# Registration Summary Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** tagsステップに入ったとき、タグ入力欄の上に全ステップの入力内容を確認できるサマリーカードを表示する。各セクションに「← 編集」ボタンを設けて対応ステップに戻れるようにする。

**Architecture:** `SummaryCard.svelte` を新規コンポーネントとして作成し、`+page.svelte` の tagsステップブロックにマウントする。全データは props で渡し、編集ボタンクリックは `onEdit(step)` コールバックで親に委譲する。

**Tech Stack:** Svelte 5 (`$props()`), Vitest, @testing-library/svelte, @testing-library/jest-dom, Tailwind CSS

---

## ファイルマップ

| 操作 | ファイル |
|---|---|
| 新規作成 | `src/lib/components/SummaryCard.svelte` |
| 新規作成 | `src/lib/components/SummaryCard.test.ts` |
| 修正 | `src/routes/items/new/+page.svelte` |

---

### Task 1: SummaryCard の失敗テストを書く

**Files:**
- Create: `src/lib/components/SummaryCard.test.ts`

- [ ] **Step 1: テストファイルを作成する**

```typescript
// src/lib/components/SummaryCard.test.ts
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import SummaryCard from './SummaryCard.svelte';

const baseProps = {
  uploadedPhotos: [],
  name: '',
  series: '',
  isHandmade: null as number | null,
  storeName: '',
  eventName: '',
  purchaseDate: '',
  purchasePrice: '',
  maker: '',
  artistName: '',
  productionStart: '',
  productionEnd: '',
  selectedMaterials: [] as { id: string; name: string }[],
  notes: '',
  onEdit: vi.fn(),
};

describe('SummaryCard: 写真セクション', () => {
  it('写真が0枚のとき「未登録」を表示する', () => {
    render(SummaryCard, { ...baseProps, uploadedPhotos: [] });
    expect(screen.getByText('未登録')).toBeInTheDocument();
  });

  it('写真が1枚以上のとき枚数を表示する', () => {
    const photos = [
      { id: 'p1', r2KeyThumb: 'k1', thumbViewUrl: 'https://example.com/1.jpg' },
      { id: 'p2', r2KeyThumb: 'k2', thumbViewUrl: 'https://example.com/2.jpg' },
    ];
    render(SummaryCard, { ...baseProps, uploadedPhotos: photos });
    expect(screen.getByText('2枚')).toBeInTheDocument();
  });

  it('写真セクションの編集ボタンをクリックすると onEdit("photo") が呼ばれる', async () => {
    const onEdit = vi.fn();
    render(SummaryCard, { ...baseProps, onEdit });
    const buttons = screen.getAllByText('← 編集');
    await fireEvent.click(buttons[0]); // 写真セクションは最初のボタン
    expect(onEdit).toHaveBeenCalledWith('photo');
  });
});

describe('SummaryCard: 基本情報セクション', () => {
  it('名前が空のとき「—」を表示する', () => {
    render(SummaryCard, { ...baseProps, name: '' });
    // ラベル「名前」の隣に「—」があること
    expect(screen.getByTestId('name-value')).toHaveTextContent('—');
  });

  it('名前が入力済みのとき値を表示する', () => {
    render(SummaryCard, { ...baseProps, name: 'ガンダム' });
    expect(screen.getByTestId('name-value')).toHaveTextContent('ガンダム');
  });

  it('シリーズ名が空のとき「—」を表示する', () => {
    render(SummaryCard, { ...baseProps, series: '' });
    expect(screen.getByTestId('series-value')).toHaveTextContent('—');
  });

  it('シリーズ名が入力済みのとき値を表示する', () => {
    render(SummaryCard, { ...baseProps, series: 'MGシリーズ' });
    expect(screen.getByTestId('series-value')).toHaveTextContent('MGシリーズ');
  });

  it('基本情報の編集ボタンをクリックすると onEdit("basic") が呼ばれる', async () => {
    const onEdit = vi.fn();
    render(SummaryCard, { ...baseProps, onEdit });
    const buttons = screen.getAllByText('← 編集');
    await fireEvent.click(buttons[1]); // 基本情報は2番目のボタン
    expect(onEdit).toHaveBeenCalledWith('basic');
  });
});

describe('SummaryCard: isHandmade === null のとき', () => {
  it('詳細情報セクションを表示しない', () => {
    render(SummaryCard, { ...baseProps, isHandmade: null });
    expect(screen.queryByTestId('details-section')).not.toBeInTheDocument();
  });
});

describe('SummaryCard: 購入情報セクション（isHandmade === 0）', () => {
  const purchaseProps = { ...baseProps, isHandmade: 0 };

  it('購入情報セクションが表示される', () => {
    render(SummaryCard, purchaseProps);
    expect(screen.getByTestId('details-section')).toBeInTheDocument();
    expect(screen.getByText('🛒 購入情報')).toBeInTheDocument();
  });

  it('店舗名が空のとき「—」を表示する', () => {
    render(SummaryCard, { ...purchaseProps, storeName: '' });
    expect(screen.getByTestId('storeName-value')).toHaveTextContent('—');
  });

  it('店舗名が入力済みのとき値を表示する', () => {
    render(SummaryCard, { ...purchaseProps, storeName: 'ホビーショップ' });
    expect(screen.getByTestId('storeName-value')).toHaveTextContent('ホビーショップ');
  });

  it('金額が入力済みのとき¥付きで表示する', () => {
    render(SummaryCard, { ...purchaseProps, purchasePrice: '3500' });
    expect(screen.getByTestId('purchasePrice-value')).toHaveTextContent('¥3500');
  });

  it('金額が空のとき「—」を表示する', () => {
    render(SummaryCard, { ...purchaseProps, purchasePrice: '' });
    expect(screen.getByTestId('purchasePrice-value')).toHaveTextContent('—');
  });

  it('購入情報の編集ボタンをクリックすると onEdit("details") が呼ばれる', async () => {
    const onEdit = vi.fn();
    render(SummaryCard, { ...purchaseProps, onEdit });
    const buttons = screen.getAllByText('← 編集');
    await fireEvent.click(buttons[2]); // 詳細情報は3番目のボタン
    expect(onEdit).toHaveBeenCalledWith('details');
  });
});

describe('SummaryCard: 制作情報セクション（isHandmade === 1）', () => {
  const handmadeProps = { ...baseProps, isHandmade: 1 };

  it('制作情報セクションが表示される', () => {
    render(SummaryCard, handmadeProps);
    expect(screen.getByTestId('details-section')).toBeInTheDocument();
    expect(screen.getByText('🎨 制作情報')).toBeInTheDocument();
  });

  it('制作開始日が空のとき「—」を表示する', () => {
    render(SummaryCard, { ...handmadeProps, productionStart: '' });
    expect(screen.getByTestId('productionStart-value')).toHaveTextContent('—');
  });

  it('素材が選択済みのとき名前を表示する', () => {
    render(SummaryCard, {
      ...handmadeProps,
      selectedMaterials: [{ id: 'm1', name: 'レジン' }],
    });
    expect(screen.getByText('レジン')).toBeInTheDocument();
  });

  it('素材が未選択のとき「—」を表示する', () => {
    render(SummaryCard, { ...handmadeProps, selectedMaterials: [] });
    expect(screen.getByTestId('materials-value')).toHaveTextContent('—');
  });
});
```

- [ ] **Step 2: テストを実行して失敗することを確認する**

```bash
cd /home/haku/projects/figurine-catalog
npm test -- SummaryCard
```

期待結果: `Cannot find module './SummaryCard.svelte'` 等のエラーで全テスト FAIL

---

### Task 2: SummaryCard コンポーネントを実装する

**Files:**
- Create: `src/lib/components/SummaryCard.svelte`

- [ ] **Step 1: コンポーネントを作成する**

```svelte
<!-- src/lib/components/SummaryCard.svelte -->
<script lang="ts">
  interface Props {
    uploadedPhotos: { id: string; r2KeyThumb: string; thumbViewUrl: string }[];
    name: string;
    series: string;
    isHandmade: number | null;
    storeName: string;
    eventName: string;
    purchaseDate: string;
    purchasePrice: string;
    maker: string;
    artistName: string;
    productionStart: string;
    productionEnd: string;
    selectedMaterials: { id: string; name: string }[];
    notes: string;
    onEdit: (step: string) => void;
  }

  let {
    uploadedPhotos,
    name,
    series,
    isHandmade,
    storeName,
    eventName,
    purchaseDate,
    purchasePrice,
    maker,
    artistName,
    productionStart,
    productionEnd,
    selectedMaterials,
    notes,
    onEdit,
  }: Props = $props();

  const dash = '—';
  const val = (v: string) => v || dash;
</script>

<div class="border rounded-xl p-4 mb-4 bg-background text-sm space-y-0">
  <p class="text-xs font-semibold text-muted-foreground mb-3">入力内容の確認</p>

  <!-- 写真セクション -->
  <div class="border-b pb-3 mb-3">
    <div class="flex justify-between items-center mb-2">
      <span class="font-medium">📷 写真</span>
      <button
        class="text-xs text-muted-foreground hover:text-primary transition-colors"
        onclick={() => onEdit('photo')}
      >← 編集</button>
    </div>
    {#if uploadedPhotos.length === 0}
      <span class="text-muted-foreground">未登録</span>
    {:else}
      <div class="flex items-center gap-2">
        <div class="grid grid-cols-4 gap-1">
          {#each uploadedPhotos.slice(0, 4) as photo}
            <div class="w-10 h-10 rounded overflow-hidden bg-muted">
              <img src={photo.thumbViewUrl} alt="" class="w-full h-full object-cover" />
            </div>
          {/each}
        </div>
        <span class="text-muted-foreground">{uploadedPhotos.length}枚</span>
      </div>
    {/if}
  </div>

  <!-- 基本情報セクション -->
  <div class="border-b pb-3 mb-3">
    <div class="flex justify-between items-center mb-2">
      <span class="font-medium">📝 基本情報</span>
      <button
        class="text-xs text-muted-foreground hover:text-primary transition-colors"
        onclick={() => onEdit('basic')}
      >← 編集</button>
    </div>
    <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
      <dt class="text-muted-foreground">名前</dt>
      <dd data-testid="name-value" class="{name ? '' : 'text-muted-foreground'}">{val(name)}</dd>
      <dt class="text-muted-foreground">シリーズ</dt>
      <dd data-testid="series-value" class="{series ? '' : 'text-muted-foreground'}">{val(series)}</dd>
    </dl>
  </div>

  <!-- 詳細情報セクション -->
  {#if isHandmade === 0}
    <div data-testid="details-section">
      <div class="flex justify-between items-center mb-2">
        <span class="font-medium">🛒 購入情報</span>
        <button
          class="text-xs text-muted-foreground hover:text-primary transition-colors"
          onclick={() => onEdit('details')}
        >← 編集</button>
      </div>
      <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt class="text-muted-foreground">店舗</dt>
        <dd data-testid="storeName-value" class="{storeName ? '' : 'text-muted-foreground'}">{val(storeName)}</dd>
        <dt class="text-muted-foreground">イベント</dt>
        <dd data-testid="eventName-value" class="{eventName ? '' : 'text-muted-foreground'}">{val(eventName)}</dd>
        <dt class="text-muted-foreground">購入日</dt>
        <dd data-testid="purchaseDate-value" class="{purchaseDate ? '' : 'text-muted-foreground'}">{val(purchaseDate)}</dd>
        <dt class="text-muted-foreground">金額</dt>
        <dd data-testid="purchasePrice-value" class="{purchasePrice ? '' : 'text-muted-foreground'}">
          {purchasePrice ? `¥${purchasePrice}` : dash}
        </dd>
        <dt class="text-muted-foreground">メーカー</dt>
        <dd data-testid="maker-value" class="{maker ? '' : 'text-muted-foreground'}">{val(maker)}</dd>
        <dt class="text-muted-foreground">作家名</dt>
        <dd data-testid="artistName-value" class="{artistName ? '' : 'text-muted-foreground'}">{val(artistName)}</dd>
      </dl>
    </div>
  {:else if isHandmade === 1}
    <div data-testid="details-section">
      <div class="flex justify-between items-center mb-2">
        <span class="font-medium">🎨 制作情報</span>
        <button
          class="text-xs text-muted-foreground hover:text-primary transition-colors"
          onclick={() => onEdit('details')}
        >← 編集</button>
      </div>
      <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt class="text-muted-foreground">開始日</dt>
        <dd data-testid="productionStart-value" class="{productionStart ? '' : 'text-muted-foreground'}">{val(productionStart)}</dd>
        <dt class="text-muted-foreground">終了日</dt>
        <dd data-testid="productionEnd-value" class="{productionEnd ? '' : 'text-muted-foreground'}">{val(productionEnd)}</dd>
        <dt class="text-muted-foreground">素材</dt>
        <dd data-testid="materials-value" class="{selectedMaterials.length === 0 ? 'text-muted-foreground' : ''}">
          {#if selectedMaterials.length === 0}
            {dash}
          {:else}
            <span class="flex flex-wrap gap-1">
              {#each selectedMaterials as m}
                <span class="border rounded-full px-2 py-0.5 text-xs">{m.name}</span>
              {/each}
            </span>
          {/if}
        </dd>
        <dt class="text-muted-foreground">メモ</dt>
        <dd data-testid="notes-value" class="{notes ? '' : 'text-muted-foreground'}">{val(notes)}</dd>
      </dl>
    </div>
  {/if}
</div>
```

- [ ] **Step 2: テストを実行してすべて PASS することを確認する**

```bash
cd /home/haku/projects/figurine-catalog
npm test -- SummaryCard
```

期待結果: 全テスト PASS

- [ ] **Step 3: コミットする**

```bash
cd /home/haku/projects/figurine-catalog
git add src/lib/components/SummaryCard.svelte src/lib/components/SummaryCard.test.ts
git commit -m "feat: SummaryCardコンポーネントを追加"
```

---

### Task 3: +page.svelte の tagsステップに SummaryCard を組み込む

**Files:**
- Modify: `src/routes/items/new/+page.svelte`

- [ ] **Step 1: tagsステップの統合テストを書く**

`src/routes/items/new/+page.svelte` のテストはまだ存在しないため新規作成する。

```typescript
// src/routes/items/new/page.test.ts
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Page from './+page.svelte';

vi.mock('$app/navigation', () => ({
  goto: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('svelte-sonner', () => ({
  toast: { error: vi.fn() },
}));
vi.mock('$lib/utils/uuid', () => ({
  generateId: () => 'test-item-id',
}));

const mockData = {
  allTags: [],
  materials: { all: [], frequent: [] },
};

async function advanceToTags() {
  render(Page, { data: mockData });

  // photo → basic
  await fireEvent.click(screen.getByText('スキップ'));
  // basic → type
  await fireEvent.click(screen.getByText('次へ →'));
  // type → tags（スキップ）
  await fireEvent.click(screen.getByText('スキップ'));
}

describe('新規登録ウィザード: tagsステップのサマリーカード', () => {
  it('tagsステップに入るとサマリーカードが表示される', async () => {
    await advanceToTags();
    expect(screen.getByText('入力内容の確認')).toBeInTheDocument();
  });

  it('tagsステップ以外ではサマリーカードが表示されない', () => {
    render(Page, { data: mockData });
    // 初期ステップ（photo）ではカードなし
    expect(screen.queryByText('入力内容の確認')).not.toBeInTheDocument();
  });

  it('写真が0枚のとき「未登録」と表示される', async () => {
    await advanceToTags();
    expect(screen.getByText('未登録')).toBeInTheDocument();
  });

  it('名前が未入力のとき「—」と表示される', async () => {
    await advanceToTags();
    expect(screen.getByTestId('name-value')).toHaveTextContent('—');
  });

  it('isHandmadeがnullのとき詳細情報セクションが表示されない', async () => {
    await advanceToTags();
    expect(screen.queryByTestId('details-section')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: テストを実行して失敗することを確認する**

```bash
cd /home/haku/projects/figurine-catalog
npm test -- new/+page
```

期待結果: `入力内容の確認` が見つからず FAIL

- [ ] **Step 3: +page.svelte の tagsブロックに SummaryCard を追加する**

`src/routes/items/new/+page.svelte` の `{:else if step === 'tags'}` ブロックを以下に変更する。

変更前（7行）:
```svelte
  {:else if step === 'tags'}
    <h2 class="text-lg font-semibold mb-4">タグを設定</h2>
    <TagPicker
      bind:selected={selectedTags}
      suggestions={data.allTags}
      frequent={[]}
      placeholder="タグを追加..."
      onCreate={createTag}
    />
    <div class="mt-4 flex gap-2">
      <button
        class="flex-1 border rounded-lg py-2"
        onclick={() => (step = isHandmade !== null ? 'details' : 'type')}
      >← 戻る</button>
      <button
        class="flex-1 bg-primary text-primary-foreground rounded-lg py-2"
        disabled={isSaving}
        onclick={saveAndFinish}
      >{isSaving ? '保存中...' : '完了 ✓'}</button>
    </div>
```

変更後:
```svelte
  {:else if step === 'tags'}
    <SummaryCard
      {uploadedPhotos}
      {name}
      {series}
      {isHandmade}
      {storeName}
      {eventName}
      {purchaseDate}
      {purchasePrice}
      {maker}
      {artistName}
      {productionStart}
      {productionEnd}
      {selectedMaterials}
      {notes}
      onEdit={(s) => (step = s)}
    />
    <h2 class="text-lg font-semibold mb-4">タグを設定</h2>
    <TagPicker
      bind:selected={selectedTags}
      suggestions={data.allTags}
      frequent={[]}
      placeholder="タグを追加..."
      onCreate={createTag}
    />
    <div class="mt-4 flex gap-2">
      <button
        class="flex-1 border rounded-lg py-2"
        onclick={() => (step = isHandmade !== null ? 'details' : 'type')}
      >← 戻る</button>
      <button
        class="flex-1 bg-primary text-primary-foreground rounded-lg py-2"
        disabled={isSaving}
        onclick={saveAndFinish}
      >{isSaving ? '保存中...' : '完了 ✓'}</button>
    </div>
```

また、`<script>` ブロックの import に以下を追加する（既存の import 群の末尾）:

```svelte
  import SummaryCard from '$lib/components/SummaryCard.svelte';
```

- [ ] **Step 4: テストを実行してすべて PASS することを確認する**

```bash
cd /home/haku/projects/figurine-catalog
npm test -- new/+page
```

期待結果: 全テスト PASS

- [ ] **Step 5: 全テストスイートが壊れていないことを確認する**

```bash
cd /home/haku/projects/figurine-catalog
npm test
```

期待結果: 全テスト PASS

- [ ] **Step 6: コミットする**

```bash
cd /home/haku/projects/figurine-catalog
git add src/routes/items/new/+page.svelte src/routes/items/new/page.test.ts
git commit -m "feat: 新規登録tagsステップにサマリーカードを表示"
```

---

## 実装完了の確認

- [ ] `npm test` が全テストスイートで PASS する
- [ ] ブラウザで新規登録ウィザードを操作し、tagsステップでサマリーカードが表示される
- [ ] 「← 編集」ボタンで各ステップに戻り、再度tagsに進むとデータが保持されている
- [ ] 空欄フィールドが `—` で表示される
- [ ] typeをスキップした場合、詳細情報セクションが表示されない
