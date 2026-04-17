<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let item = $derived(data.item);
  let coverPhoto = $derived(item.photos.find((p: any) => p.isCover) ?? item.photos[0]);
</script>

<svelte:head>
  <title>{item.name ?? '名称未設定'}</title>
  <meta name="description" content="{item.name ?? '名称未設定'}{item.series ? ` - ${item.series}` : ''}" />
</svelte:head>

<div class="max-w-xl mx-auto p-4">
  {#if coverPhoto}
    <img
      src={coverPhoto.thumbUrl}
      alt={item.name ?? ''}
      class="w-full rounded-xl mb-6 object-cover"
      style="max-height:480px"
    />
  {/if}

  <h1 class="text-2xl font-bold mb-1">{item.name ?? '名称未設定'}</h1>
  {#if item.series}<p class="text-muted-foreground mb-4">{item.series}</p>{/if}

  {#if item.purchaseInfo}
    <div class="border rounded-xl p-4 mb-4 space-y-1">
      <h3 class="font-semibold mb-2">購入情報</h3>
      {#if item.purchaseInfo.maker}<p class="text-sm">メーカー: {item.purchaseInfo.maker}</p>{/if}
      {#if item.purchaseInfo.artistName}<p class="text-sm">作家: {item.purchaseInfo.artistName}</p>{/if}
      {#if item.purchaseInfo.eventName}<p class="text-sm">イベント: {item.purchaseInfo.eventName}</p>{/if}
      {#if item.purchaseInfo.purchaseDate}<p class="text-sm">購入日: {item.purchaseInfo.purchaseDate}</p>{/if}
    </div>
  {/if}

  {#if item.handmadeInfo}
    <div class="border rounded-xl p-4 mb-4 space-y-1">
      <h3 class="font-semibold mb-2">制作情報</h3>
      {#if item.handmadeInfo.productionStart}<p class="text-sm">制作開始: {item.handmadeInfo.productionStart}</p>{/if}
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

  <!-- 複数写真がある場合のギャラリー -->
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
