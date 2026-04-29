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
    quote: string;
    notes: string;
    onEdit: (step: 'photo' | 'basic' | 'type' | 'details' | 'tags') => void;
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
    quote,
    notes,
    onEdit,
  }: Props = $props();
</script>

<div style="background:var(--surface); box-shadow:var(--neu-soft); border-radius:var(--radius); padding:20px; margin-bottom:16px; font-size:13px">
  <!-- 写真セクション -->
  <div style="border-bottom:1px solid var(--line); padding-bottom:12px; margin-bottom:12px">
    <div class="flex justify-between items-center mb-2">
      <span class="eyebrow">📷 写真</span>
      <button
        style="font-size:11px; color:var(--fg-mute); background:none; border:none; cursor:pointer; font-family:var(--f-mono)"
        onclick={() => onEdit('photo')}
      >
        ← 編集
      </button>
    </div>
    {#if uploadedPhotos.length === 0}
      <span style="color:var(--fg-mute)">未登録</span>
    {:else}
      <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:4px">
        {#each uploadedPhotos.slice(0, 4) as photo (photo.id)}
          <img src={photo.thumbViewUrl} alt="" style="width:100%; aspect-ratio:1; object-fit:cover; display:block" />
        {/each}
      </div>
      <span>{uploadedPhotos.length}枚</span>
    {/if}
  </div>

  <!-- 基本情報セクション -->
  <div style="border-bottom:1px solid var(--line); padding-bottom:12px; margin-bottom:12px">
    <div class="flex justify-between items-center mb-2">
      <span class="eyebrow">📋 基本情報</span>
      <button
        style="font-size:11px; color:var(--fg-mute); background:none; border:none; cursor:pointer; font-family:var(--f-mono)"
        onclick={() => onEdit('basic')}
      >
        ← 編集
      </button>
    </div>
    <dl style="display:grid; grid-template-columns:auto 1fr; gap:3px 12px; font-size:12px; color:var(--fg-soft)">
      <dt>名前</dt>
      <dd data-testid="name-value" style="color:var(--fg)">
        {#if name}
          {name}
        {:else}
          <span style="color:var(--fg-mute)">—</span>
        {/if}
      </dd>
      <dt>シリーズ</dt>
      <dd data-testid="series-value" style="color:var(--fg)">
        {#if series}
          {series}
        {:else}
          <span style="color:var(--fg-mute)">—</span>
        {/if}
      </dd>
    </dl>
  </div>

  <!-- 詳細セクション -->
  {#if isHandmade === 0}
    <div data-testid="details-section">
      <div class="flex justify-between items-center mb-2">
        <span class="eyebrow">🛒 購入情報</span>
        <button
          style="font-size:11px; color:var(--fg-mute); background:none; border:none; cursor:pointer; font-family:var(--f-mono)"
          onclick={() => onEdit('details')}
        >
          ← 編集
        </button>
      </div>
      <dl style="display:grid; grid-template-columns:auto 1fr; gap:3px 12px; font-size:12px; color:var(--fg-soft)">
        <dt>店舗名</dt>
        <dd data-testid="storeName-value" style="color:var(--fg)">
          {#if storeName}
            {storeName}
          {:else}
            <span style="color:var(--fg-mute)">—</span>
          {/if}
        </dd>
        <dt>イベント名</dt>
        <dd data-testid="eventName-value" style="color:var(--fg)">
          {#if eventName}
            {eventName}
          {:else}
            <span style="color:var(--fg-mute)">—</span>
          {/if}
        </dd>
        <dt>購入日</dt>
        <dd data-testid="purchaseDate-value" style="color:var(--fg)">
          {#if purchaseDate}
            {purchaseDate}
          {:else}
            <span style="color:var(--fg-mute)">—</span>
          {/if}
        </dd>
        <dt>金額</dt>
        <dd data-testid="purchasePrice-value" style="color:var(--fg)">
          {#if purchasePrice}
            ¥{purchasePrice}
          {:else}
            <span style="color:var(--fg-mute)">—</span>
          {/if}
        </dd>
        <dt>メーカー名</dt>
        <dd data-testid="maker-value" style="color:var(--fg)">
          {#if maker}
            {maker}
          {:else}
            <span style="color:var(--fg-mute)">—</span>
          {/if}
        </dd>
        <dt>作家名</dt>
        <dd data-testid="artistName-value" style="color:var(--fg)">
          {#if artistName}
            {artistName}
          {:else}
            <span style="color:var(--fg-mute)">—</span>
          {/if}
        </dd>
      </dl>
    </div>
  {:else if isHandmade === 1}
    <div data-testid="details-section">
      <div class="flex justify-between items-center mb-2">
        <span class="eyebrow">🎨 制作情報</span>
        <button
          style="font-size:11px; color:var(--fg-mute); background:none; border:none; cursor:pointer; font-family:var(--f-mono)"
          onclick={() => onEdit('details')}
        >
          ← 編集
        </button>
      </div>
      <dl style="display:grid; grid-template-columns:auto 1fr; gap:3px 12px; font-size:12px; color:var(--fg-soft)">
        <dt>開始日</dt>
        <dd data-testid="productionStart-value" style="color:var(--fg)">
          {#if productionStart}
            {productionStart}
          {:else}
            <span style="color:var(--fg-mute)">—</span>
          {/if}
        </dd>
        <dt>終了日</dt>
        <dd data-testid="productionEnd-value" style="color:var(--fg)">
          {#if productionEnd}
            {productionEnd}
          {:else}
            <span style="color:var(--fg-mute)">—</span>
          {/if}
        </dd>
        <dt>台詞</dt>
        <dd data-testid="quote-value" style="color:var(--fg)">
          {#if quote}
            {quote}
          {:else}
            <span style="color:var(--fg-mute)">—</span>
          {/if}
        </dd>
        <dt>素材</dt>
        <dd data-testid="materials-value" style="color:var(--fg)">
          {#if selectedMaterials.length > 0}
            <div style="display:flex; flex-wrap:wrap; gap:4px">
              {#each selectedMaterials as material (material.id)}
                <span style="display:inline-block; border:1px solid var(--line); border-radius:var(--radius-sm); padding:1px 6px; font-size:11px">{material.name}</span>
              {/each}
            </div>
          {:else}
            <span style="color:var(--fg-mute)">—</span>
          {/if}
        </dd>
        <dt>メモ</dt>
        <dd data-testid="notes-value" style="color:var(--fg)">
          {#if notes}
            {notes}
          {:else}
            <span style="color:var(--fg-mute)">—</span>
          {/if}
        </dd>
      </dl>
    </div>
  {/if}
</div>
