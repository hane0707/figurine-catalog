# キャンセル・クリーンアップ機能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** アイテム登録ウィザードにキャンセル機能を追加し、写真ゼロのアイテムがDBに残らない構造に変更する

**Architecture:** ページ読み込み時にクライアントでUUIDを生成し、最初の写真アップロード成功後にのみDBへアイテムを作成する。キャンセルボタンはアイテム作成済みの場合のみ DELETE API を呼んでR2・DBを一括削除する。エラーはシステム障害系（break）とファイル固有（続行）に分類する。

**Tech Stack:** SvelteKit 2 + Svelte 5 runes / Cloudflare Pages + D1 + R2 / Drizzle ORM / Vitest

---

## ファイル構成

| ファイル | 変更内容 |
|---------|---------|
| `src/routes/api/items/+server.ts` | POST ハンドラにオプション `id` を追加 |
| `src/lib/components/PhotoUploader.svelte` | props 変更・エラー分類・ファイルサイズチェック |
| `src/routes/items/new/+page.svelte` | ウィザードロジック全面変更・キャンセルボタン追加 |

---

## Task 1: POST /api/items にオプション id を受け付ける

**Files:**
- Modify: `src/routes/api/items/+server.ts:8-29`

クライアントが事前生成した UUID を id として指定できるようにする。指定がなければ従来通りサーバーで生成する（後方互換）。

- [ ] **Step 1: POST ハンドラの id 行を変更する**

`src/routes/api/items/+server.ts` の12行目を変更する：

```ts
// 変更前
const id = generateId();

// 変更後
const id = (body.id as string | undefined) ?? generateId();
```

- [ ] **Step 2: ビルドして型エラーがないことを確認する**

```bash
npm run check
```

Expected: エラーなし

- [ ] **Step 3: コミットする**

```bash
git add src/routes/api/items/+server.ts
git commit -m "feat: POST /api/items でクライアント指定 id を受け付ける"
```

---

## Task 2: PhotoUploader のインターフェース変更とエラー分類

**Files:**
- Modify: `src/lib/components/PhotoUploader.svelte`

props に `itemCreated: boolean` と `onSystemError: () => void` を追加する。`onUploaded` に `isFirst: boolean` 引数を追加する。20MB を超えるファイルをスキップする。エラーをシステム障害系（全ファイル中断）とファイル固有（スキップして続行）に分類する。

- [ ] **Step 1: `PhotoUploader.svelte` の script ブロックを以下で置き換える**

```svelte
<script lang="ts">
  import { resizeImage } from '$lib/utils/image';
  import { generateId } from '$lib/utils/uuid';
  import { toast } from 'svelte-sonner';

  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

  let {
    itemId,
    itemCreated,
    onUploaded,
    onSystemError,
  }: {
    itemId: string;
    itemCreated: boolean;
    onUploaded: (
      photo: { id: string; r2KeyOrig: string; r2KeyThumb: string; thumbViewUrl: string },
      isFirst: boolean,
    ) => void;
    onSystemError: () => void;
  } = $props();

  let uploading = $state(false);
  let fileInput: HTMLInputElement;

  function classifyError(e: unknown, status?: number): 'system' | 'file' {
    if (e instanceof TypeError) return 'system';
    if (status === 413) return 'file';
    if (status === 403 || (status !== undefined && status >= 500)) return 'system';
    return 'system';
  }

  async function uploadWithRetry(url: string, blob: Blob, maxRetries = 3): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const res = await fetch(url, {
          method: 'PUT',
          body: blob,
          headers: { 'Content-Type': blob.type },
        });
        if (res.ok) return;
        const err = new Error(`HTTP ${res.status}`);
        (err as any).status = res.status;
        throw err;
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
      // ファイルサイズチェック（ファイル固有エラー）
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} はサイズが大きすぎます（上限20MB）`);
        continue;
      }

      const photoId = generateId();
      try {
        const presignRes = await fetch('/api/photos/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId, photoId, contentType: file.type }),
        });
        if (!presignRes.ok) {
          const err = new Error(`HTTP ${presignRes.status}`);
          (err as any).status = presignRes.status;
          throw err;
        }
        const { origUrl, thumbUrl, origKey, thumbKey, thumbViewUrl } =
          (await presignRes.json()) as {
            origUrl: string;
            thumbUrl: string;
            origKey: string;
            thumbKey: string;
            thumbViewUrl: string;
          };

        const thumb = await resizeImage(file, 400);

        await Promise.all([uploadWithRetry(origUrl, file), uploadWithRetry(thumbUrl, thumb)]);

        onUploaded(
          { id: photoId, r2KeyOrig: origKey, r2KeyThumb: thumbKey, thumbViewUrl },
          !itemCreated,
        );
      } catch (e) {
        const status = (e as any)?.status as number | undefined;
        const kind = classifyError(e, status);
        console.error(`[PhotoUploader] ${file.name} upload failed (${kind}):`, e);
        if (kind === 'system') {
          onSystemError();
          break; // システムエラーは以降も失敗するため中断
        } else {
          toast.error(`${file.name} のアップロードに失敗しました`);
        }
      }
    }

    uploading = false;
  }

  function handleChange(e: Event) {
    const files = (e.target as HTMLInputElement).files;
    if (files?.length) handleFiles(files);
  }
</script>
```

- [ ] **Step 2: template ブロックはそのまま維持されていることを確認する**

template ブロック（`<div>` 以降）は変更不要。`bind:this={fileInput}` と `onclick={() => fileInput.click()}` はそのまま動作する。

- [ ] **Step 3: 型チェックを実行する**

```bash
npm run check
```

Expected: PhotoUploader の新しい props がまだ親から渡されていないため型エラーが出る（Task 3 で解消する）

- [ ] **Step 4: コミットする**

```bash
git add src/lib/components/PhotoUploader.svelte
git commit -m "feat: PhotoUploader にエラー分類・ファイルサイズチェック・新 props を追加"
```

---

## Task 3: ウィザード (new/+page.svelte) の全面変更

**Files:**
- Modify: `src/routes/items/new/+page.svelte`

`ensureItem()`・`createItemPromise`・`showPhotoUploader` を削除し、ページ読み込み時に UUID を生成する構造に変更する。`handlePhotoUploaded` で初回アップロード時にのみアイテムを作成する。全ステップにキャンセルボタンを追加する。

- [ ] **Step 1: script ブロック全体を以下で置き換える**

```svelte
<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import PhotoUploader from '$lib/components/PhotoUploader.svelte';
  import TagPicker from '$lib/components/TagPicker.svelte';
  import { generateId } from '$lib/utils/uuid';

  let { data }: { data: PageData } = $props();

  // ページ読み込み時に UUID を生成（DB操作なし）
  const itemId = generateId();

  let itemCreated = $state(false);
  let step = $state('photo');
  let uploadedPhotos = $state<
    { id: string; r2KeyOrig: string; r2KeyThumb: string; thumbViewUrl: string }[]
  >([]);

  // フォームデータ
  let name = $state('');
  let series = $state('');
  let isHandmade = $state<number | null>(null);
  let selectedTags = $state<{ id: string; name: string }[]>([]);
  let selectedMaterials = $state<{ id: string; name: string }[]>([]);

  // 購入品
  let storeName = $state('');
  let eventName = $state('');
  let purchaseDate = $state('');
  let purchasePrice = $state('');
  let maker = $state('');
  let artistName = $state('');

  // 自作品
  let productionStart = $state('');
  let productionEnd = $state('');
  let notes = $state('');

  const steps = ['photo', 'basic', 'type', 'details', 'tags'];
  let stepIndex = $derived(steps.indexOf(step));
  let isSaving = $state(false);

  async function handlePhotoUploaded(
    photo: { id: string; r2KeyOrig: string; r2KeyThumb: string; thumbViewUrl: string },
    isFirst: boolean,
  ) {
    if (isFirst) {
      // 初回アップロード成功時にのみアイテムを作成
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, name: null }),
      });
      if (!res.ok) {
        toast.error('アイテムの作成に失敗しました');
        return;
      }
      itemCreated = true;
    }

    await fetch(`/api/photos/${photo.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, r2KeyOrig: photo.r2KeyOrig, r2KeyThumb: photo.r2KeyThumb }),
    });

    uploadedPhotos = [...uploadedPhotos, photo];
  }

  function handleSystemError() {
    toast.error('アップロードに失敗しました。設定やネットワークを確認してください');
  }

  async function cancelWizard() {
    if (!itemCreated) {
      goto('/items');
      return;
    }
    if (!confirm('アップロード済みのデータを削除して中断しますか？')) return;
    await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
    goto('/items');
  }

  async function saveAndFinish() {
    if (isSaving) return;
    isSaving = true;
    try {
      if (!itemCreated) {
        // 写真なしで完了した場合、ここでアイテムを作成
        const res = await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: itemId, name: null }),
        });
        if (!res.ok) throw new Error(`アイテム作成失敗: ${res.status}`);
        itemCreated = true;
      }

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
        if (selectedMaterials.length > 0) {
          updateBody.materialIds = selectedMaterials.map((m) => m.id);
        }
      }

      if (selectedTags.length > 0) {
        updateBody.tagIds = selectedTags.map((t) => t.id);
      }

      const res = await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateBody),
      });
      if (!res.ok) throw new Error(`保存に失敗しました: ${res.status}`);
      goto(`/items/${itemId}`);
    } catch (e) {
      console.error('saveAndFinish failed:', e);
      toast.error('保存に失敗しました');
    } finally {
      isSaving = false;
    }
  }

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
</script>
```

- [ ] **Step 2: template ブロック全体を以下で置き換える**

```svelte
<div class="max-w-md mx-auto p-4">
  <!-- ヘッダー -->
  <div class="flex items-center justify-between mb-3">
    <span class="text-sm text-muted-foreground">新規登録</span>
    <button
      class="text-sm text-muted-foreground hover:text-destructive transition-colors"
      onclick={cancelWizard}
    >✕ キャンセル</button>
  </div>

  <!-- プログレスバー -->
  <div class="flex gap-1 mb-3">
    {#each steps as s, i}
      <div class="flex-1 h-1 rounded-full {i <= stepIndex ? 'bg-primary' : 'bg-muted'}"></div>
    {/each}
  </div>

  <!-- 前のステップの選択内容サマリ -->
  {#if stepIndex > 0}
    <div class="flex flex-wrap gap-2 mb-4 text-xs text-muted-foreground">
      {#if uploadedPhotos.length > 0}
        <span class="border rounded-full px-2 py-0.5">📷 {uploadedPhotos.length}枚</span>
      {/if}
      {#if stepIndex > 1 && (name || series)}
        <span class="border rounded-full px-2 py-0.5"
          >📝 {[name, series].filter(Boolean).join(' / ')}</span
        >
      {/if}
      {#if stepIndex > 2 && isHandmade !== null}
        <span class="border rounded-full px-2 py-0.5"
          >{isHandmade === 0 ? '🛒 購入品' : '🎨 自作品'}</span
        >
      {/if}
    </div>
  {/if}

  {#if step === 'photo'}
    <h2 class="text-lg font-semibold mb-4">写真を追加</h2>

    <PhotoUploader
      {itemId}
      {itemCreated}
      onUploaded={handlePhotoUploaded}
      onSystemError={handleSystemError}
    />

    {#if uploadedPhotos.length > 0}
      <div class="mt-3 grid grid-cols-4 gap-2">
        {#each uploadedPhotos as photo}
          <div class="aspect-square rounded-lg overflow-hidden bg-muted">
            <img src={photo.thumbViewUrl} alt="" class="w-full h-full object-cover" />
          </div>
        {/each}
      </div>
    {/if}

    <div class="mt-4 flex gap-2">
      <button class="flex-1 border rounded-lg py-2" onclick={() => (step = 'basic')}>スキップ</button>
      {#if uploadedPhotos.length > 0}
        <button
          class="flex-1 bg-primary text-primary-foreground rounded-lg py-2"
          onclick={() => (step = 'basic')}
        >次へ →</button>
      {/if}
    </div>

  {:else if step === 'basic'}
    <h2 class="text-lg font-semibold mb-4">名前・シリーズ名</h2>
    <div class="space-y-3">
      <input
        bind:value={name}
        placeholder="アイテム名（スキップ可）"
        class="w-full border rounded-lg px-3 py-2 bg-background text-foreground"
      />
      <input
        bind:value={series}
        placeholder="シリーズ名（スキップ可）"
        class="w-full border rounded-lg px-3 py-2 bg-background text-foreground"
      />
    </div>
    <div class="mt-4 flex gap-2">
      <button class="flex-1 border rounded-lg py-2" onclick={() => (step = 'photo')}>← 戻る</button>
      <button
        class="flex-1 bg-primary text-primary-foreground rounded-lg py-2"
        onclick={() => (step = 'type')}
      >次へ →</button>
    </div>

  {:else if step === 'type'}
    <h2 class="text-lg font-semibold mb-4">購入品？自作品？</h2>
    <div class="space-y-3">
      <button
        class="w-full border rounded-xl p-4 text-left hover:bg-accent {isHandmade === 0
          ? 'border-primary'
          : ''}"
        onclick={() => {
          isHandmade = 0;
          step = 'details';
        }}
      >
        🛒 <strong>購入品</strong><br /><span class="text-sm text-muted-foreground"
          >店舗・EC・イベントで入手</span
        >
      </button>
      <button
        class="w-full border rounded-xl p-4 text-left hover:bg-accent {isHandmade === 1
          ? 'border-primary'
          : ''}"
        onclick={() => {
          isHandmade = 1;
          step = 'details';
        }}
      >
        🎨 <strong>自作品</strong><br /><span class="text-sm text-muted-foreground"
          >造形・塗装・改造など</span
        >
      </button>
    </div>
    <div class="mt-4 flex gap-2">
      <button class="flex-1 border rounded-lg py-2" onclick={() => (step = 'basic')}>← 戻る</button>
      <button class="flex-1 border rounded-lg py-2" onclick={() => (step = 'tags')}>スキップ</button>
    </div>

  {:else if step === 'details'}
    {#if isHandmade === 0}
      <h2 class="text-lg font-semibold mb-4">購入情報</h2>
      <div class="space-y-3">
        <input
          bind:value={storeName}
          placeholder="店舗名 / ECサイト名"
          class="w-full border rounded-lg px-3 py-2 bg-background text-foreground"
        />
        <input
          bind:value={eventName}
          placeholder="イベント名（例: ワンフェス2024夏）"
          class="w-full border rounded-lg px-3 py-2 bg-background text-foreground"
        />
        <div class="flex gap-2">
          <input
            bind:value={purchaseDate}
            type="date"
            class="flex-1 border rounded-lg px-3 py-2 bg-background text-foreground"
          />
          <input
            bind:value={purchasePrice}
            type="number"
            placeholder="金額 ¥"
            class="flex-1 border rounded-lg px-3 py-2 bg-background text-foreground"
          />
        </div>
        <input
          bind:value={maker}
          placeholder="メーカー名"
          class="w-full border rounded-lg px-3 py-2 bg-background text-foreground"
        />
        <input
          bind:value={artistName}
          placeholder="作家名・原型師名"
          class="w-full border rounded-lg px-3 py-2 bg-background text-foreground"
        />
      </div>
    {:else}
      <h2 class="text-lg font-semibold mb-4">制作情報</h2>
      <div class="space-y-3">
        <div class="flex gap-2">
          <input
            bind:value={productionStart}
            type="date"
            class="flex-1 border rounded-lg px-3 py-2 bg-background text-foreground"
          />
          <input
            bind:value={productionEnd}
            type="date"
            class="flex-1 border rounded-lg px-3 py-2 bg-background text-foreground"
          />
        </div>
        <div>
          <p class="text-sm text-muted-foreground mb-2">使用素材</p>
          <TagPicker
            bind:selected={selectedMaterials}
            suggestions={data.materials.all}
            frequent={data.materials.frequent}
            placeholder="素材を追加..."
            onCreate={createMaterial}
          />
        </div>
        <textarea
          bind:value={notes}
          placeholder="制作メモ・塗装記録（自由記述）"
          rows={4}
          class="w-full border rounded-lg px-3 py-2 bg-background text-foreground resize-none"
        ></textarea>
      </div>
    {/if}
    <div class="mt-4 flex gap-2">
      <button class="flex-1 border rounded-lg py-2" onclick={() => (step = 'type')}>← 戻る</button>
      <button
        class="flex-1 bg-primary text-primary-foreground rounded-lg py-2"
        onclick={() => (step = 'tags')}
      >次へ →</button>
    </div>

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
  {/if}
</div>
```

- [ ] **Step 3: 型チェックを実行してエラーがないことを確認する**

```bash
npm run check
```

Expected: エラーなし

- [ ] **Step 4: ビルドしてエラーがないことを確認する**

```bash
npm run build
```

Expected: ビルド成功

- [ ] **Step 5: 動作確認（手動テスト）**

```bash
npm run build && npx wrangler pages dev .svelte-kit/cloudflare
```

確認項目：
1. `/items/new` を開くと右上に「✕ キャンセル」が表示される
2. 何もせずキャンセル → 確認なしで `/items` へ遷移
3. 写真をアップロードしてからキャンセル → 確認ダイアログが出る → 確認すると `/items` へ遷移、アイテムが削除されている
4. 写真アップロード後にサムネイルが表示される
5. 20MB 超のファイルを選択するとスキップされてトーストが出る
6. 写真なしで「完了」まで進んでも正常に保存できる

- [ ] **Step 6: コミットする**

```bash
git add src/routes/items/new/+page.svelte
git commit -m "feat: ウィザードにキャンセル機能・アイテム遅延作成を実装"
```
