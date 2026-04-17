<script lang="ts">
  import type { PageData } from './$types';
  import ItemCard from '$lib/components/ItemCard.svelte';
  import { onMount } from 'svelte';

  let { data }: { data: PageData } = $props();

  let items: any[] = $state([]);
  let offset = $state(0);
  const limit = 30;
  let loading = $state(false);
  let hasMore = $state(true);
  let selectedTags: string[] = $state([]);
  let query = $state('');
  let showParted = $state(false);

  let sentinel: HTMLDivElement;

  async function fetchItems(reset = false) {
    if (loading) return;
    loading = true;
    if (reset) { items = []; offset = 0; hasMore = true; }

    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      status: showParted ? 'parted' : 'owned',
    });
    if (query) params.set('q', query);
    if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));

    const res = await fetch(`/api/items?${params}`);
    const json = await res.json();
    items = reset ? json.items : [...items, ...json.items];
    offset += json.items.length;
    hasMore = json.items.length === limit;
    loading = false;
  }

  onMount(() => {
    fetchItems();
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) fetchItems();
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  });

  let searchTimer: ReturnType<typeof setTimeout>;
  function handleSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => fetchItems(true), 300);
  }
</script>

<div class="max-w-5xl mx-auto p-4">
  <div class="flex items-center justify-between mb-4">
    <h1 class="text-2xl font-bold">コレクション</h1>
    <a href="/items/new" class="fixed bottom-6 right-6 z-10 w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl shadow-lg hover:scale-105 transition-transform">＋</a>
  </div>

  <input
    bind:value={query}
    oninput={handleSearch}
    placeholder="名前・シリーズ名で検索..."
    class="w-full border rounded-lg px-3 py-2 mb-4 bg-background text-foreground"
  />

  <div class="flex flex-wrap gap-2 mb-4">
    {#each data.tags as tag}
      <button
        class="text-xs border rounded-full px-3 py-1 cursor-pointer {selectedTags.includes(tag.id) ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent'}"
        onclick={() => {
          selectedTags = selectedTags.includes(tag.id)
            ? selectedTags.filter(id => id !== tag.id)
            : [...selectedTags, tag.id];
          fetchItems(true);
        }}
      >{tag.name}</button>
    {/each}
  </div>

  <label class="flex items-center gap-2 text-sm mb-4">
    <input type="checkbox" bind:checked={showParted} onchange={() => fetchItems(true)} />
    手放し済みを表示
  </label>

  <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
    {#each items as item (item.id)}
      <ItemCard {item} />
    {/each}
  </div>

  {#if loading}
    <div class="text-center py-8 text-muted-foreground">読み込み中...</div>
  {/if}
  {#if !loading && items.length === 0}
    <div class="text-center py-16 text-muted-foreground">
      <p class="text-4xl mb-4">📦</p>
      <p>アイテムがありません</p>
      <a href="/items/new" class="mt-4 inline-block bg-primary text-primary-foreground px-4 py-2 rounded-lg">最初のアイテムを登録</a>
    </div>
  {/if}

  <div bind:this={sentinel} class="h-4" />
</div>
