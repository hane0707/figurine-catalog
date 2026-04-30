<!-- src/routes/items/new/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import PhotoUploader from '$lib/components/PhotoUploader.svelte';
  import TagPicker from '$lib/components/TagPicker.svelte';
  import SummaryCard from '$lib/components/SummaryCard.svelte';
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
  let quote = $state('');
  let notes = $state('');

  const steps = ['photo', 'basic', 'type', 'details', 'tags'];
  let stepIndex = $derived(steps.indexOf(step));
  let isSaving = $state(false);

  async function handlePhotoUploaded(
    photo: { id: string; r2KeyOrig: string; r2KeyThumb: string; thumbViewUrl: string },
    isFirst: boolean,
  ) {
    if (isFirst && !itemCreated) {
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

    const photoRes = await fetch(`/api/photos/${photo.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, r2KeyOrig: photo.r2KeyOrig, r2KeyThumb: photo.r2KeyThumb }),
    });
    if (!photoRes.ok) {
      toast.error('写真の登録に失敗しました');
      return;
    }

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
    try {
      const res = await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
      if (!res.ok) console.error(`キャンセル中の削除失敗: ${res.status}`);
    } catch (e) {
      console.error('キャンセル中にネットワークエラー:', e);
    }
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
          quote: quote || null,
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
    {#each steps as _s, i}
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
    <h2 style="margin-bottom:16px">写真を追加</h2>

    <PhotoUploader
      {itemId}
      {itemCreated}
      onUploaded={handlePhotoUploaded}
      onSystemError={handleSystemError}
    />

    {#if uploadedPhotos.length > 0}
      <div style="margin-top:12px; display:grid; grid-template-columns:repeat(4,1fr); gap:8px">
        {#each uploadedPhotos as photo}
          <div style="aspect-ratio:1; border-radius:var(--r-sm); overflow:hidden; background:var(--bg-sunk)">
            <img src={photo.thumbViewUrl} alt="" style="width:100%; height:100%; object-fit:cover; display:block" />
          </div>
        {/each}
      </div>
    {/if}

    <div style="margin-top:16px; display:flex; gap:10px">
      <button class="btn --ghost" onclick={() => (step = 'basic')}>スキップ</button>
      {#if uploadedPhotos.length > 0}
        <button class="btn --primary" onclick={() => (step = 'basic')}>次へ →</button>
      {/if}
    </div>

  {:else if step === 'basic'}
    <h2 style="margin-bottom:16px">名前・シリーズ名</h2>
    <div style="display:flex; flex-direction:column; gap:12px">
      <div class="field">
        <label>Name</label>
        <input type="text" bind:value={name} placeholder="アイテム名（スキップ可）" />
      </div>
      <div class="field">
        <label>Series</label>
        <input type="text" bind:value={series} placeholder="シリーズ名（スキップ可）" />
      </div>
    </div>
    <div style="margin-top:16px; display:flex; gap:10px">
      <button class="btn --ghost" onclick={() => (step = 'photo')}>← 戻る</button>
      <button class="btn --primary" onclick={() => (step = 'type')}>次へ →</button>
    </div>

  {:else if step === 'type'}
    <h2 style="margin-bottom:16px">購入品？自作品？</h2>
    <div class="type-picker">
      <button
        class={'type-card --bought ' + (isHandmade === 0 ? '--active' : '')}
        onclick={() => { isHandmade = 0; step = 'details'; }}
      >
        <div class="mark"></div>
        <h4>購入品</h4>
        <p>店舗・EC・イベントで入手</p>
      </button>
      <button
        class={'type-card --handmade ' + (isHandmade === 1 ? '--active' : '')}
        onclick={() => { isHandmade = 1; step = 'details'; }}
      >
        <div class="mark"></div>
        <h4>自作品</h4>
        <p>造形・塗装・改造など</p>
      </button>
    </div>
    <div style="margin-top:16px; display:flex; gap:10px">
      <button class="btn --ghost" onclick={() => (step = 'basic')}>← 戻る</button>
      <button class="btn --ghost" onclick={() => (step = 'tags')}>スキップ</button>
    </div>

  {:else if step === 'details'}
    {#if isHandmade === 0}
      <h2 style="margin-bottom:16px">購入情報</h2>
      <div style="display:flex; flex-direction:column; gap:12px">
        <div class="field">
          <label>Store</label>
          <input type="text" bind:value={storeName} placeholder="店舗名 / ECサイト名" />
        </div>
        <div class="field">
          <label>Event</label>
          <input type="text" bind:value={eventName} placeholder="イベント名（例: ワンフェス2024夏）" />
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px">
          <div class="field">
            <label>Date</label>
            <input bind:value={purchaseDate} type="date" />
          </div>
          <div class="field">
            <label>Price ¥</label>
            <input bind:value={purchasePrice} type="number" placeholder="金額" />
          </div>
        </div>
        <div class="field">
          <label>Maker</label>
          <input type="text" bind:value={maker} placeholder="メーカー名" />
        </div>
        <div class="field">
          <label>Artist</label>
          <input type="text" bind:value={artistName} placeholder="作家名・原型師名" />
        </div>
      </div>
    {:else}
      <h2 style="margin-bottom:16px">制作情報</h2>
      <div style="display:flex; flex-direction:column; gap:12px">
        <div class="field">
          <label>Quote</label>
          <textarea bind:value={quote} placeholder="台詞・印象的なセリフ（スキップ可）" rows={2}></textarea>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px">
          <div class="field">
            <label>Started</label>
            <input bind:value={productionStart} type="date" />
          </div>
          <div class="field">
            <label>Finished</label>
            <input bind:value={productionEnd} type="date" />
          </div>
        </div>
        <div class="field">
          <label>素材</label>
          <TagPicker
            bind:selected={selectedMaterials}
            suggestions={data.materials.all}
            frequent={data.materials.frequent}
            placeholder="素材を追加..."
            onCreate={createMaterial}
          />
        </div>
        <div class="field">
          <label>Notes</label>
          <textarea bind:value={notes} placeholder="制作メモ・塗装記録（自由記述）" rows={4}></textarea>
        </div>
      </div>
    {/if}
    <div style="margin-top:16px; display:flex; gap:10px">
      <button class="btn --ghost" onclick={() => (step = 'type')}>← 戻る</button>
      <button class="btn --primary" onclick={() => (step = 'tags')}>次へ →</button>
    </div>

  {:else if step === 'tags'}
    <h2 style="margin-bottom:16px">入力内容の確認</h2>
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
      {quote}
      {notes}
      onEdit={(s) => (step = s)}
    />
    <h2 style="margin-bottom:16px">タグを設定</h2>
    <TagPicker
      bind:selected={selectedTags}
      suggestions={data.allTags}
      frequent={[]}
      placeholder="タグを追加..."
      onCreate={createTag}
    />
    <div style="margin-top:16px; display:flex; gap:10px">
      <button
        class="btn --ghost"
        onclick={() => (step = isHandmade !== null ? 'details' : 'type')}
      >← 戻る</button>
      <button
        class="btn --primary"
        disabled={isSaving}
        onclick={saveAndFinish}
      >{isSaving ? '保存中...' : '完了 ✓'}</button>
    </div>
  {/if}
</div>
