<!-- src/lib/components/ItemCard.svelte -->
<script lang="ts">
  let { item, isOwner = false }: {
    item: {
      id: string;
      name: string | null;
      series?: string | null;
      isHandmade?: number | null;
      thumbUrl: string | null;
      isPublic: number;
      status: string;
      createdAt?: string | null;
      tags?: { id: string; name: string }[];
    };
    isOwner?: boolean;
  } = $props();

  const kindLabel = item.isHandmade === 1 ? 'Handmade' : 'Collected';
</script>

<a href="/items/{item.id}" class="card">
  <div class="card-img" style="view-transition-name: item-img-{item.id}">
    {#if item.thumbUrl}
      <img src={item.thumbUrl} alt={item.name ?? '名称未設定'} loading="lazy" />
    {:else}
      <div style="width:100%; min-height:160px; display:grid; place-items:center; font-family:var(--f-display); font-size:40px; opacity:0.2; color:var(--fg)">✦</div>
    {/if}
    {#if item.isHandmade !== undefined && item.isHandmade !== null}
      <div class={'card-badge ' + (item.isHandmade === 1 ? '--handmade' : '--bought')}>
        {kindLabel}
      </div>
    {/if}
    {#if isOwner && item.isPublic === 0}
      <div style="position:absolute; top:8px; right:8px; width:22px; height:22px; border-radius:50%; background:rgba(0,0,0,0.45); display:grid; place-items:center; color:#fff">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
    {/if}
  </div>
  <h3>{item.name ?? '名称未設定'}</h3>
  <p class="card-series">{item.series ?? '—'}</p>
  {#if item.tags && item.tags.length > 0}
    <div class="card-tags">
      {#each item.tags as tag (tag.id)}
        <span class="card-tag">{tag.name}</span>
      {/each}
    </div>
  {/if}
  <div class={'card-meta ' + (item.isHandmade === 1 ? '' : '--haze')}>
    <span>
      <span class="dot"></span>
      {item.isHandmade === 1 ? 'HANDMADE' : item.isHandmade === 0 ? 'COLLECTED' : 'ITEM'}
    </span>
    <span class="mono" style="font-size:10px">{item.createdAt?.slice(0, 10) ?? ''}</span>
  </div>
</a>

<style>
  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 8px;
  }
  .card-tag {
    font-family: var(--f-mono);
    font-size: 10px;
    letter-spacing: 0.06em;
    padding: 2px 8px;
    border-radius: var(--r-pill);
    background: var(--bg-sunk);
    color: var(--fg-soft);
    box-shadow: var(--neu-inset);
  }
</style>
