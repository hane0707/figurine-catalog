<!-- src/routes/items/new/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import PhotoUploader from '$lib/components/PhotoUploader.svelte';
  import TagPicker from '$lib/components/TagPicker.svelte';

  let { data }: { data: PageData } = $props();

  // Step: 'photo' | 'basic' | 'type' | 'details' | 'tags'
  let step = $state('photo');
  let itemId = $state<string | null>(null);
  let uploadedPhotos = $state<{ id: string; r2KeyOrig: string; r2KeyThumb: string }[]>([]);

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

  async function createItem() {
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: null }),
    });
    const json = (await res.json()) as { id: string };
    itemId = json.id;
  }

  async function handlePhotoUploaded(photo: { id: string; r2KeyOrig: string; r2KeyThumb: string }) {
    uploadedPhotos = [...uploadedPhotos, photo];
  }

  async function ensureItem() {
    if (!itemId) await createItem();
  }

  async function saveAndFinish() {
    if (!itemId) await createItem();
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
      if (selectedMaterials.length > 0) {
        updateBody.materialIds = selectedMaterials.map((m) => m.id);
      }
    }

    if (selectedTags.length > 0) {
      updateBody.tagIds = selectedTags.map((t) => t.id);
    }

    await fetch(`/api/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateBody),
    });

    goto(`/items/${itemId}`);
  }

  async function createTag(tagName: string): Promise<{ id: string; name: string }> {
    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: tagName }),
    });
    return (await res.json()) as { id: string; name: string };
  }

  async function createMaterial(materialName: string): Promise<{ id: string; name: string }> {
    const res = await fetch('/api/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: materialName }),
    });
    return (await res.json()) as { id: string; name: string };
  }
</script>

<div class="max-w-md mx-auto p-4">
  <!-- プログレスバー -->
  <div class="flex gap-1 mb-6">
    {#each steps as s, i}
      <div class="flex-1 h-1 rounded-full {i <= stepIndex ? 'bg-primary' : 'bg-muted'}"></div>
    {/each}
  </div>

  {#if step === 'photo'}
    <h2 class="text-lg font-semibold mb-4">写真を追加</h2>
    {#if itemId}
      <PhotoUploader {itemId} onUploaded={handlePhotoUploaded} />
    {:else}
      <button
        type="button"
        class="w-full border-2 border-dashed rounded-lg p-8 text-center hover:bg-accent transition-colors"
        onclick={async () => {
          await ensureItem();
        }}
      >
        <span>📷 写真を選ぶ（複数可）</span>
      </button>
      {#if itemId}
        <PhotoUploader {itemId} onUploaded={handlePhotoUploaded} />
      {/if}
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
        onclick={() => (isHandmade = 0)}
      >
        🛒 <strong>購入品</strong><br /><span class="text-sm text-muted-foreground"
          >店舗・EC・イベントで入手</span
        >
      </button>
      <button
        class="w-full border rounded-xl p-4 text-left hover:bg-accent {isHandmade === 1
          ? 'border-primary'
          : ''}"
        onclick={() => (isHandmade = 1)}
      >
        🎨 <strong>自作品</strong><br /><span class="text-sm text-muted-foreground"
          >造形・塗装・改造など</span
        >
      </button>
    </div>
    <div class="mt-4 flex gap-2">
      <button class="flex-1 border rounded-lg py-2" onclick={() => (step = 'basic')}>← 戻る</button>
      <button class="flex-1 border rounded-lg py-2" onclick={() => (step = 'tags')}>スキップ</button>
      {#if isHandmade !== null}
        <button
          class="flex-1 bg-primary text-primary-foreground rounded-lg py-2"
          onclick={() => (step = 'details')}
        >次へ →</button>
      {/if}
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
        onclick={saveAndFinish}
      >完了 ✓</button>
    </div>
  {/if}
</div>
