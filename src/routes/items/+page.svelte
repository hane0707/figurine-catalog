<script lang="ts">
  import type { PageData } from './$types';
  import { onMount } from 'svelte';
  import ItemCard from '$lib/components/ItemCard.svelte';

  let { data }: { data: PageData } = $props();

  let items: any[] = $state([]);
  let offset = $state(0);
  const limit = 30;
  let loading = $state(false);
  let hasMore = $state(true);
  let query = $state('');
  let kindFilter = $state('all');
  let sort = $state('recent');
  let activeTags = $state<string[]>([]);
  let layout = $state('grid');

  let sentinel: HTMLDivElement;

  const kindOptions = [
    { key: 'all', label: 'すべて' },
    { key: 'bought', label: '購入品' },
    { key: 'handmade', label: '自作品' },
  ];
  const sortOptions = [
    { key: 'recent', label: '最新' },
    { key: 'oldest', label: '古い順' },
  ];

  async function fetchItems(reset = false) {
    if (loading) return;
    loading = true;
    if (reset) { items = []; offset = 0; hasMore = true; }

    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      status: 'owned',
      sort,
    });
    if (query) params.set('q', query);
    if (kindFilter !== 'all') params.set('kind', kindFilter);
    if (activeTags.length > 0) params.set('tags', activeTags.join(','));

    try {
      const res = await fetch(`/api/items?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { items: any[] };
      items = reset ? json.items : [...items, ...json.items];
      offset += json.items.length;
      hasMore = json.items.length === limit;
    } catch (e) {
      console.error('Failed to fetch items:', e);
      hasMore = false;
    } finally {
      loading = false;
    }
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

  function setKind(k: string) { kindFilter = k; fetchItems(true); }
  function setSort(s: string) { sort = s; fetchItems(true); }
  function toggleTag(tagId: string) {
    activeTags = activeTags.includes(tagId)
      ? activeTags.filter((id) => id !== tagId)
      : [...activeTags, tagId];
    fetchItems(true);
  }
</script>

<svelte:head>
  <title>Haku's suitcase — Made · Met · Kept</title>
</svelte:head>

<!-- 背景装飾 -->
<div class="ambient" aria-hidden="true">
  <div class="blob b1"></div>
  <div class="blob b2"></div>
  <div class="blob b3"></div>
  <div class="amb-ring r1"></div>
  <div class="amb-ring r2"></div>
</div>

<div class="app">
  <!-- ナビ -->
  <nav class="nav">
    <div class="brand">
      <div class="brand-mark" aria-hidden="true"></div>
      <div>
        <div class="brand-name">Haku's suitcase</div>
        <div class="brand-sub">Made · Met · Kept</div>
      </div>
    </div>
    <div class="nav-actions">
      {#if data.user}
        {#if data.isDevMode}
          <form method="POST" action="/admin?/logout" style="display:contents">
            <button type="submit" class="btn --ghost" style="font-size:12px; letter-spacing:0.04em">
              ログアウト
            </button>
          </form>
        {:else}
          <a href="/cdn-cgi/access/logout" class="btn --ghost" style="font-size:12px; letter-spacing:0.04em">
            ログアウト
          </a>
        {/if}
      {/if}
    </div>
  </nav>

  <!-- ヒーロー -->
  <section class="hero rise">
    <div>
      <div class="eyebrow" style="margin-bottom: 20px">Made · Met · Kept</div>
      <h1 class="display hero-title">
        雨のあたらない、<br />
        <em>スーツケース</em>の中。
      </h1>
      <p class="hero-lede">
        作ったものも、出会ったものも。<br />
        ここに置いておきます。
      </p>
      <div class="hero-meta">
        <span class="eyebrow">Now showing</span>
        <span class="mono" style="font-size:11px; color:var(--fg-soft)">
          {data.stats.total} items · {data.stats.handmade} handmade
        </span>
      </div>
    </div>

    <div class="spotlight">
      {#if data.spotlight}
        <div class="spotlight-tag">
          Spotlight · {data.spotlight.isHandmade === 1 ? 'Handmade' : 'Collected'}
        </div>
        <div class="spotlight-inner">
          <img src={data.spotlight.thumbUrl} alt={data.spotlight.name ?? 'Spotlight'} />
        </div>
        <div class="spotlight-caption">
          <h3>{data.spotlight.name ?? '名称未設定'}</h3>
          {#if data.spotlight.series}<p>{data.spotlight.series}</p>{/if}
        </div>
      {:else}
        <div class="spotlight-tag">Spotlight</div>
        <div class="spotlight-inner" style="display:grid; place-items:center; background:var(--bg-sunk)">
          <span style="font-family:var(--f-display); font-size:56px; opacity:0.2; color:var(--fg)">✦</span>
        </div>
      {/if}
    </div>
  </section>

  <!-- 統計 -->
  <section class="stats rise rise-d1">
    <div class="stat">
      <span class="eyebrow">Total Items</span>
      <div class="stat-value">{data.stats.total}</div>
      <div class="stat-delta"><span class="dot"></span>owned now</div>
      <div class="stat-chip"><div class="stat-chip-dot"></div></div>
    </div>
    <div class="stat --haze">
      <span class="eyebrow">Handmade</span>
      <div class="stat-value">{data.stats.handmade}</div>
      <div class="stat-delta"><span class="dot"></span>自作品</div>
      <div class="stat-chip"><div class="stat-chip-dot"></div></div>
    </div>
    <div class="stat --line">
      <span class="eyebrow">Purchased</span>
      <div class="stat-value">{data.stats.bought}</div>
      <div class="stat-delta"><span class="dot"></span>購入品</div>
      <div class="stat-chip"><div class="stat-chip-dot"></div></div>
    </div>
    <div class="stat --diamond">
      <span class="eyebrow">Series</span>
      <div class="stat-value">{data.stats.series}</div>
      <div class="stat-delta"><span class="dot"></span>unique</div>
      <div class="stat-chip"><div class="stat-chip-dot"></div></div>
    </div>
  </section>

  <!-- セクションヘッダー -->
  <div class="section-head rise rise-d2">
    <h2>Collection</h2>
    <div class="seg">
      <button class={layout === 'grid' ? '--active' : ''} onclick={() => (layout = 'grid')} aria-label="グリッド表示">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
      </button>
      <button class={layout === 'list' ? '--active' : ''} onclick={() => (layout = 'list')} aria-label="リスト表示">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
      </button>
    </div>
  </div>

  <!-- フィルターバー -->
  <div class="filterbar rise rise-d2">
    <div class="search">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
      <input placeholder="名前・シリーズ・タグで検索…" bind:value={query} oninput={handleSearch} />
    </div>
    <div class="seg">
      {#each kindOptions as opt}
        <button class={kindFilter === opt.key ? '--active' : ''} onclick={() => setKind(opt.key)}>
          {opt.label}
        </button>
      {/each}
    </div>
    <div class="seg">
      {#each sortOptions as opt}
        <button class={sort === opt.key ? '--active' : ''} onclick={() => setSort(opt.key)}>
          {opt.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- タグチップ -->
  {#if data.tags.length > 0}
    <div class="chiprow rise rise-d3">
      {#each data.tags as tag}
        <button class={'chip ' + (activeTags.includes(tag.id) ? '--active' : '')} onclick={() => toggleTag(tag.id)}>
          {tag.name}{#if tag.count > 0}&nbsp;<span class="count">{tag.count}</span>{/if}
        </button>
      {/each}
      {#if activeTags.length > 0}
        <button class="chip" onclick={() => { activeTags = []; fetchItems(true); }}>クリア ×</button>
      {/if}
    </div>
  {/if}

  <!-- アイテム一覧 -->
  {#if layout === 'grid'}
    <div class="items-grid rise rise-d4">
      {#each items as item (item.id)}
        <ItemCard {item} />
      {/each}
      {#if data.user}
        <a href="/items/new" class="card --empty">
          <div class="plus">+</div>
          <div style="font-family:var(--f-mono); font-size:11px; letter-spacing:0.12em; text-transform:uppercase">
            新しいアイテムを登録
          </div>
        </a>
      {/if}
    </div>
  {:else}
    <div class="rise rise-d4" style="display:flex; flex-direction:column; gap:10px">
      {#each items as item (item.id)}
        <a href="/items/{item.id}" class="card"
          style="display:grid; grid-template-columns:72px 1fr auto; gap:18px; align-items:center; padding:12px">
          <div style="width:72px; height:72px; border-radius:14px; overflow:hidden; box-shadow:var(--neu-inset); flex-shrink:0">
            {#if item.thumbUrl}
              <img src={item.thumbUrl} alt="" style="width:100%; height:100%; object-fit:cover" />
            {:else}
              <div style="width:100%; height:100%; background:var(--bg-sunk); display:grid; place-items:center; font-family:var(--f-display); font-size:24px; opacity:0.25; color:var(--fg)">✦</div>
            {/if}
          </div>
          <div style="text-align:left; overflow:hidden">
            <h3 style="margin:0; font-family:var(--f-display); font-size:17px; font-weight:400; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">
              {item.name ?? '名称未設定'}
            </h3>
            <div style="font-family:var(--f-mono); font-size:10px; color:var(--fg-soft); letter-spacing:0.05em; margin-top:3px">
              {item.series ?? '—'} · {item.isHandmade === 1 ? 'HANDMADE' : item.isHandmade === 0 ? 'COLLECTED' : '—'}
            </div>
          </div>
          <div style="font-family:var(--f-mono); font-size:10px; color:var(--fg-soft); white-space:nowrap">
            {item.createdAt?.slice(0, 10) ?? ''}
          </div>
        </a>
      {/each}
    </div>
  {/if}

  {#if loading}
    <div style="text-align:center; padding:48px 20px; color:var(--fg-soft); font-family:var(--f-mono); font-size:11px; letter-spacing:0.16em">
      LOADING...
    </div>
  {/if}

  {#if !loading && items.length === 0}
    <div style="text-align:center; padding:80px 20px; color:var(--fg-soft)">
      <div style="font-family:var(--f-display); font-size:36px; margin-bottom:12px">該当なし</div>
      <div style="font-size:13px; color:var(--fg-mute)">フィルタを変えるか、新しいアイテムを登録してください。</div>
    </div>
  {/if}

  <div bind:this={sentinel} style="height:4px"></div>
</div>

<!-- FAB (ログイン時のみ) -->
{#if data.user}
  <a href="/items/new" class="fab" aria-label="新規登録">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
    <div class="fab-ring"></div>
  </a>
{/if}
