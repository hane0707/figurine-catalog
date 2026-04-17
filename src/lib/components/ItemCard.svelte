<!-- src/lib/components/ItemCard.svelte -->
<script lang="ts">
  let { item }: {
    item: {
      id: string;
      name: string | null;
      thumbUrl: string | null;
      isPublic: number;
      status: string;
    };
  } = $props();
</script>

<a href="/items/{item.id}" class="block group">
  <div class="rounded-xl overflow-hidden border bg-card hover:shadow-md transition-shadow" style="aspect-ratio: 3/4;">
    {#if item.thumbUrl}
      <img
        src={item.thumbUrl}
        alt={item.name ?? '名称未設定'}
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        loading="lazy"
      />
    {:else}
      <div class="w-full h-full bg-muted flex items-center justify-center text-4xl">📦</div>
    {/if}
  </div>
  <div class="mt-1 px-1">
    <p class="text-sm font-medium truncate {item.name ? '' : 'text-muted-foreground italic'}">
      {item.name ?? '名称未設定'}
    </p>
    {#if item.status === 'parted'}
      <span class="text-xs text-muted-foreground">手放し済み</span>
    {/if}
  </div>
</a>
