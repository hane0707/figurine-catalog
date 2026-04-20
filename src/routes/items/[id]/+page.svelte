<script lang="ts">
  import type { PageData } from './$types';
  import { toast } from 'svelte-sonner';
  import { invalidateAll, goto } from '$app/navigation';

  let { data }: { data: PageData } = $props();
  let item = $derived(data.item);

  let editing = $state(false);
  let saving = $state(false);

  // 編集用の一時データ
  let editName = $state('');
  let editSeries = $state('');
  let editIsPublic = $state(0);
  let editPurchaseInfoPublic = $state(0);
  let editHandmadeInfoPublic = $state(0);
  let editStatus = $state('owned');
  let editIsHandmade = $state<number | null>(null);
  // 購入情報
  let editStoreName = $state('');
  let editEventName = $state('');
  let editPurchaseDate = $state('');
  let editPurchasePrice = $state('');
  let editMaker = $state('');
  let editArtistName = $state('');
  // 制作情報
  let editProductionStart = $state('');
  let editProductionEnd = $state('');
  let editNotes = $state('');

  function startEdit() {
    editName = item.name ?? '';
    editSeries = item.series ?? '';
    editIsPublic = item.isPublic;
    editPurchaseInfoPublic = item.purchaseInfoPublic;
    editHandmadeInfoPublic = item.handmadeInfoPublic;
    editStatus = item.status;
    editIsHandmade = item.isHandmade;
    editStoreName = item.purchaseInfo?.storeName ?? '';
    editEventName = item.purchaseInfo?.eventName ?? '';
    editPurchaseDate = item.purchaseInfo?.purchaseDate ?? '';
    editPurchasePrice = item.purchaseInfo?.purchasePrice?.toString() ?? '';
    editMaker = item.purchaseInfo?.maker ?? '';
    editArtistName = item.purchaseInfo?.artistName ?? '';
    editProductionStart = item.handmadeInfo?.productionStart ?? '';
    editProductionEnd = item.handmadeInfo?.productionEnd ?? '';
    editNotes = item.handmadeInfo?.notes ?? '';
    editing = true;
  }

  async function saveEdit() {
    saving = true;
    try {
      const body: Record<string, unknown> = {
        name: editName || null,
        series: editSeries || null,
        isPublic: editIsPublic,
        purchaseInfoPublic: editPurchaseInfoPublic,
        handmadeInfoPublic: editHandmadeInfoPublic,
        status: editStatus,
        isHandmade: editIsHandmade,
      };
      if (editIsHandmade === 0) {
        body.purchaseInfo = {
          storeName: editStoreName || null,
          eventName: editEventName || null,
          purchaseDate: editPurchaseDate || null,
          purchasePrice: editPurchasePrice ? Number(editPurchasePrice) : null,
          maker: editMaker || null,
          artistName: editArtistName || null,
        };
      } else if (editIsHandmade === 1) {
        body.handmadeInfo = {
          productionStart: editProductionStart || null,
          productionEnd: editProductionEnd || null,
          notes: editNotes || null,
        };
      }
      const res = await fetch(`/api/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`保存失敗: ${res.status}`);
      await invalidateAll();
      editing = false;
      toast.success('保存しました');
    } catch (e) {
      toast.error('保存に失敗しました');
      console.error(e);
    } finally {
      saving = false;
    }
  }

  async function deleteItem() {
    if (!confirm('削除しますか？写真も削除されます。')) return;
    try {
      const res = await fetch(`/api/items/${item.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`削除失敗: ${res.status}`);
      location.href = '/items';
    } catch (e) {
      toast.error('削除に失敗しました');
      console.error(e);
    }
  }

  let coverPhoto = $derived(item.photos.find((p: any) => p.isCover) ?? item.photos[0]);
</script>

<div class="max-w-2xl mx-auto p-4">
  <div class="flex items-center justify-between mb-4">
    <a href="/items" class="text-muted-foreground hover:underline">← 一覧へ</a>
    <div class="flex gap-2">
      {#if !editing}
        <button class="border rounded-lg px-3 py-1 text-sm" onclick={startEdit}>編集</button>
        <button class="border rounded-lg px-3 py-1 text-sm text-destructive" onclick={deleteItem}>削除</button>
      {:else}
        <button class="border rounded-lg px-3 py-1 text-sm" onclick={() => editing = false}>キャンセル</button>
        <button class="bg-primary text-primary-foreground rounded-lg px-3 py-1 text-sm" disabled={saving} onclick={saveEdit}>
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
      <input bind:value={editName} placeholder="名前" class="w-full border rounded-lg px-3 py-2 text-xl font-bold bg-background text-foreground" />
      <input bind:value={editSeries} placeholder="シリーズ名" class="w-full border rounded-lg px-3 py-2 bg-background text-foreground" />

      <!-- 種別 -->
      <div class="flex gap-2">
        <button
          class="flex-1 border rounded-xl p-3 text-sm {editIsHandmade === 0 ? 'border-primary bg-accent' : ''}"
          onclick={() => editIsHandmade = 0}
        >🛒 購入品</button>
        <button
          class="flex-1 border rounded-xl p-3 text-sm {editIsHandmade === 1 ? 'border-primary bg-accent' : ''}"
          onclick={() => editIsHandmade = 1}
        >🎨 自作品</button>
      </div>

      <!-- 購入情報 -->
      {#if editIsHandmade === 0}
        <div class="border rounded-xl p-3 space-y-2">
          <p class="text-sm font-medium text-muted-foreground">購入情報</p>
          <input bind:value={editStoreName} placeholder="店舗名 / ECサイト名" class="w-full border rounded-lg px-3 py-2 text-sm bg-background text-foreground" />
          <input bind:value={editEventName} placeholder="イベント名" class="w-full border rounded-lg px-3 py-2 text-sm bg-background text-foreground" />
          <div class="flex gap-2">
            <input bind:value={editPurchaseDate} type="date" class="flex-1 border rounded-lg px-3 py-2 text-sm bg-background text-foreground" />
            <input bind:value={editPurchasePrice} type="number" placeholder="金額 ¥" class="flex-1 border rounded-lg px-3 py-2 text-sm bg-background text-foreground" />
          </div>
          <input bind:value={editMaker} placeholder="メーカー名" class="w-full border rounded-lg px-3 py-2 text-sm bg-background text-foreground" />
          <input bind:value={editArtistName} placeholder="作家名・原型師名" class="w-full border rounded-lg px-3 py-2 text-sm bg-background text-foreground" />
        </div>
      {:else if editIsHandmade === 1}
        <div class="border rounded-xl p-3 space-y-2">
          <p class="text-sm font-medium text-muted-foreground">制作情報</p>
          <div class="flex gap-2">
            <input bind:value={editProductionStart} type="date" class="flex-1 border rounded-lg px-3 py-2 text-sm bg-background text-foreground" />
            <input bind:value={editProductionEnd} type="date" class="flex-1 border rounded-lg px-3 py-2 text-sm bg-background text-foreground" />
          </div>
          <textarea bind:value={editNotes} placeholder="制作メモ・塗装記録" rows={3} class="w-full border rounded-lg px-3 py-2 text-sm bg-background text-foreground resize-none"></textarea>
        </div>
      {/if}

      <!-- 公開設定 -->
      <div class="border rounded-xl p-4 space-y-2">
        <label class="flex items-center gap-2">
          <input type="checkbox"
            checked={editIsPublic === 1}
            onchange={(e) => editIsPublic = e.currentTarget.checked ? 1 : 0}
          />
          <span class="font-medium">このアイテムを公開する</span>
        </label>
        {#if editIsPublic === 1}
          <label class="flex items-center gap-2 ml-4 text-sm text-muted-foreground">
            <input type="checkbox"
              checked={editPurchaseInfoPublic === 1}
              onchange={(e) => editPurchaseInfoPublic = e.currentTarget.checked ? 1 : 0}
            />
            購入情報も公開する（店舗・金額・作家名など）
          </label>
          <label class="flex items-center gap-2 ml-4 text-sm text-muted-foreground">
            <input type="checkbox"
              checked={editHandmadeInfoPublic === 1}
              onchange={(e) => editHandmadeInfoPublic = e.currentTarget.checked ? 1 : 0}
            />
            制作情報も公開する（制作期間・素材・メモ）
          </label>
        {/if}
      </div>

      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox"
          checked={editStatus === 'parted'}
          onchange={(e) => editStatus = e.currentTarget.checked ? 'parted' : 'owned'}
        />
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
    {#if item.status === 'parted'}
      <span class="inline-block text-xs border rounded-full px-3 py-1 mb-2 text-muted-foreground">手放し済み</span>
    {/if}

    <!-- 購入情報 -->
    {#if item.purchaseInfo && item.isHandmade === 0}
      <div class="border rounded-xl p-4 mb-4">
        <h3 class="font-semibold mb-2">購入情報</h3>
        {#if item.purchaseInfo.storeName}<p class="text-sm">店舗: {item.purchaseInfo.storeName}</p>{/if}
        {#if item.purchaseInfo.eventName}<p class="text-sm">イベント: {item.purchaseInfo.eventName}</p>{/if}
        {#if item.purchaseInfo.purchaseDate}<p class="text-sm">購入日: {item.purchaseInfo.purchaseDate}</p>{/if}
        {#if item.purchaseInfo.purchasePrice !== null}<p class="text-sm">金額: ¥{item.purchaseInfo.purchasePrice?.toLocaleString()}</p>{/if}
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
          <p class="text-sm mt-2">素材: {item.itemMaterials.map((m: any) => m.material.name).join(', ')}</p>
        {/if}
        {#if item.handmadeInfo.notes}<p class="text-sm mt-2 whitespace-pre-wrap">{item.handmadeInfo.notes}</p>{/if}
      </div>
    {/if}

    <!-- タグ -->
    {#if item.itemTags?.length}
      <div class="flex flex-wrap gap-2 mt-2">
        {#each item.itemTags as t}
          <span class="text-xs border rounded-full px-3 py-1">{(t as any).tag.name}</span>
        {/each}
      </div>
    {/if}
  {/if}

  <!-- 全写真グリッド（常に表示） -->
  {#if item.photos.length > 1}
    <div class="mt-6 grid grid-cols-3 gap-2">
      {#each item.photos as photo}
        <div class="rounded-lg overflow-hidden" style="aspect-ratio:1">
          <img src={photo.thumbUrl} alt="" class="w-full h-full object-cover" />
        </div>
      {/each}
    </div>
  {/if}
</div>
