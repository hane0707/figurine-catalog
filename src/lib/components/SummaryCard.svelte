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
</script>

<div class="border rounded-xl p-4 mb-4 bg-background text-sm">
  <!-- 写真セクション -->
  <div class="border-b pb-3 mb-3">
    <div class="flex justify-between items-center mb-2">
      <span>📷 写真</span>
      <button
        class="text-xs text-muted-foreground hover:text-primary transition-colors"
        onclick={() => onEdit('photo')}
      >
        ← 編集
      </button>
    </div>
    {#if uploadedPhotos.length === 0}
      <span class="text-muted-foreground">未登録</span>
    {:else}
      <div class="grid grid-cols-4 gap-1">
        {#each uploadedPhotos.slice(0, 4) as photo (photo.id)}
          <img src={photo.thumbViewUrl} alt="thumbnail" class="w-full aspect-square object-cover" />
        {/each}
      </div>
      <span>{uploadedPhotos.length}枚</span>
    {/if}
  </div>

  <!-- 基本情報セクション -->
  <div class="border-b pb-3 mb-3">
    <div class="flex justify-between items-center mb-2">
      <span>📋 基本情報</span>
      <button
        class="text-xs text-muted-foreground hover:text-primary transition-colors"
        onclick={() => onEdit('basic')}
      >
        ← 編集
      </button>
    </div>
    <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
      <dt>名前</dt>
      <dd data-testid="name-value">
        {#if name}
          {name}
        {:else}
          <span class="text-muted-foreground">—</span>
        {/if}
      </dd>
      <dt>シリーズ</dt>
      <dd data-testid="series-value">
        {#if series}
          {series}
        {:else}
          <span class="text-muted-foreground">—</span>
        {/if}
      </dd>
    </dl>
  </div>

  <!-- 詳細セクション -->
  {#if isHandmade === 0}
    <div data-testid="details-section">
      <div class="flex justify-between items-center mb-2">
        <span>🛒 購入情報</span>
        <button
          class="text-xs text-muted-foreground hover:text-primary transition-colors"
          onclick={() => onEdit('details')}
        >
          ← 編集
        </button>
      </div>
      <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt>店舗名</dt>
        <dd data-testid="storeName-value">
          {#if storeName}
            {storeName}
          {:else}
            <span class="text-muted-foreground">—</span>
          {/if}
        </dd>
        <dt>イベント名</dt>
        <dd data-testid="eventName-value">
          {#if eventName}
            {eventName}
          {:else}
            <span class="text-muted-foreground">—</span>
          {/if}
        </dd>
        <dt>購入日</dt>
        <dd data-testid="purchaseDate-value">
          {#if purchaseDate}
            {purchaseDate}
          {:else}
            <span class="text-muted-foreground">—</span>
          {/if}
        </dd>
        <dt>金額</dt>
        <dd data-testid="purchasePrice-value">
          {#if purchasePrice}
            ¥{purchasePrice}
          {:else}
            <span class="text-muted-foreground">—</span>
          {/if}
        </dd>
        <dt>メーカー名</dt>
        <dd data-testid="maker-value">
          {#if maker}
            {maker}
          {:else}
            <span class="text-muted-foreground">—</span>
          {/if}
        </dd>
        <dt>作家名</dt>
        <dd data-testid="artistName-value">
          {#if artistName}
            {artistName}
          {:else}
            <span class="text-muted-foreground">—</span>
          {/if}
        </dd>
      </dl>
    </div>
  {:else if isHandmade === 1}
    <div data-testid="details-section">
      <div class="flex justify-between items-center mb-2">
        <span>🎨 制作情報</span>
        <button
          class="text-xs text-muted-foreground hover:text-primary transition-colors"
          onclick={() => onEdit('details')}
        >
          ← 編集
        </button>
      </div>
      <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt>開始日</dt>
        <dd data-testid="productionStart-value">
          {#if productionStart}
            {productionStart}
          {:else}
            <span class="text-muted-foreground">—</span>
          {/if}
        </dd>
        <dt>終了日</dt>
        <dd data-testid="productionEnd-value">
          {#if productionEnd}
            {productionEnd}
          {:else}
            <span class="text-muted-foreground">—</span>
          {/if}
        </dd>
        <dt>素材</dt>
        <dd data-testid="materials-value">
          {#if selectedMaterials.length > 0}
            <div class="flex flex-wrap gap-1">
              {#each selectedMaterials as material (material.id)}
                <span class="inline-block border rounded px-1 py-0.5 text-xs">{material.name}</span>
              {/each}
            </div>
          {:else}
            <span class="text-muted-foreground">—</span>
          {/if}
        </dd>
        <dt>メモ</dt>
        <dd data-testid="notes-value">
          {#if notes}
            {notes}
          {:else}
            <span class="text-muted-foreground">—</span>
          {/if}
        </dd>
      </dl>
    </div>
  {/if}
</div>
