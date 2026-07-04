<script lang="ts">
  import type { PageData } from "./$types";
  import { onMount } from "svelte";
  import ItemCard from "$lib/components/ItemCard.svelte";
  import GlitchText from "$lib/components/GlitchText.svelte";
  import { formatDate } from "$lib/utils/date";
  import { replaceState } from "$app/navigation";
  import { page } from "$app/state";
  import { reveal } from "$lib/actions/reveal";

  let { data }: { data: PageData } = $props();

  let items: any[] = $state([]);
  let offset = $state(0);
  const limit = 30;
  let loading = $state(false);
  let hasMore = $state(true);
  let query = $state(page.url.searchParams.get("q") ?? "");
  let kindFilter = $state(page.url.searchParams.get("kind") ?? "all");
  let sort = $state(page.url.searchParams.get("sort") ?? "recent");
  let activeTags = $state<string[]>(
    page.url.searchParams.get("tags")?.split(",").filter(Boolean) ?? [],
  );
  let layout = $state("grid");
  let columnCount = $state(4);
  let columns = $derived(
    Array.from({ length: columnCount }, (_, col) =>
      items.filter((_, i) => i % columnCount === col),
    ),
  );

  let displayTotal = $state(0);
  let displayHandmade = $state(0);
  let displayBought = $state(0);
  let displaySeries = $state(0);

  let sentinel: HTMLDivElement;

  const kindOptions = [
    { key: "all", label: "すべて" },
    { key: "bought", label: "購入品" },
    { key: "handmade", label: "自作品" },
  ];
  const sortOptions = [
    { key: "recent", label: "最新" },
    { key: "oldest", label: "古い順" },
  ];

  async function fetchItems(reset = false) {
    if (loading) return;
    loading = true;
    if (reset) {
      items = [];
      offset = 0;
      hasMore = true;
    }

    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      status: "owned",
      sort,
    });
    if (query) params.set("q", query);
    if (kindFilter !== "all") params.set("kind", kindFilter);
    if (activeTags.length > 0) params.set("tags", activeTags.join(","));

    try {
      const res = await fetch(`/api/items?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { items: any[] };
      items = reset ? json.items : [...items, ...json.items];
      offset += json.items.length;
      hasMore = json.items.length === limit;
    } catch (e) {
      console.error("Failed to fetch items:", e);
      hasMore = false;
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    let rafId: number;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) {
      displayTotal = data.stats.total;
      displayHandmade = data.stats.handmade;
      displayBought = data.stats.bought;
      displaySeries = data.stats.series;
    } else {
      const dur = 1200,
        start = performance.now();
      const tick = () => {
        const t = Math.min((performance.now() - start) / dur, 1);
        const e = 1 - Math.pow(1 - t, 3);
        displayTotal = Math.round(e * data.stats.total);
        displayHandmade = Math.round(e * data.stats.handmade);
        displayBought = Math.round(e * data.stats.bought);
        displaySeries = Math.round(e * data.stats.series);
        if (t < 1) rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    }
    const updateColumns = () => {
      columnCount =
        window.innerWidth <= 720 ? 2 : window.innerWidth <= 1100 ? 3 : 4;
    };
    updateColumns();
    window.addEventListener("resize", updateColumns);
    fetchItems();
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) fetchItems();
    });
    observer.observe(sentinel);
    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener("resize", updateColumns);
    };
  });

  let tiltX = $state(0);
  let tiltY = $state(0);
  let glareX = $state(50);
  let glareY = $state(50);
  let tilting = $state(false);
  function handleTilt(e: MouseEvent) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    tilting = true;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    tiltX = py * -16;
    tiltY = px * 18;
    glareX = px * 100 + 50;
    glareY = py * 100 + 50;
  }
  function resetTilt() {
    tilting = false;
    tiltX = 0;
    tiltY = 0;
    glareX = 50;
    glareY = 50;
  }

  function syncUrl() {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (kindFilter !== "all") params.set("kind", kindFilter);
    if (sort !== "recent") params.set("sort", sort);
    if (activeTags.length > 0) params.set("tags", activeTags.join(","));
    const qs = params.toString();
    replaceState(qs ? `?${qs}` : page.url.pathname, {});
  }

  let searchTimer: ReturnType<typeof setTimeout>;
  function handleSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      syncUrl();
      fetchItems(true);
    }, 300);
  }

  function setKind(k: string) {
    kindFilter = k;
    syncUrl();
    fetchItems(true);
  }
  function setSort(s: string) {
    sort = s;
    syncUrl();
    fetchItems(true);
  }
  function toggleTag(tagId: string) {
    activeTags = activeTags.includes(tagId)
      ? activeTags.filter((id) => id !== tagId)
      : [...activeTags, tagId];
    syncUrl();
    fetchItems(true);
  }
</script>

<svelte:head>
  <title>Haku's suitcase</title>
  <meta property="og:title" content="Haku's suitcase" />
  <meta property="og:description" content="ここは雨のあたらない、スーツケースの中。作ったものと、出会ったもの。" />
  {#if data.spotlight}
    <meta property="og:image" content={data.spotlight.thumbUrl} />
  {/if}
</svelte:head>

<div class="app">
  <!-- ヒーロー -->
  <section class="hero rise">
    <div>
      <h1 class="display hero-title">
        <GlitchText
          segments={[
            { text: "ここは", small: true, breakAfter: true },
            { text: "雨", large: true, stain: true },
            { text: "のあたらない、", breakAfter: true },
            { text: "スーツケース", em: true },
            { text: "の中。" },
          ]}
        />
      </h1>
      <p class="hero-lede">作ったものと、出会ったもの。</p>
      <div class="hero-meta">
        <span class="eyebrow">Now showing</span>
        <span class="mono" style="font-size:11px; color:var(--fg-soft)">
          {data.stats.total} items · {data.stats.handmade} handmade
        </span>
        <a href="/about" class="hero-about-link">このサイトについて →</a>
      </div>
    </div>

    <div
      class="spotlight-frame"
      onmousemove={handleTilt}
      onmouseleave={resetTilt}
      role="presentation"
    >
      <div
        class="spotlight"
        style="transform: perspective(900px) rotateX({tiltX}deg) rotateY({tiltY}deg) scale({tiltX !== 0 || tiltY !== 0 ? 1.015 : 1})"
      >
        {#if data.spotlight}
          <div class="spotlight-tag">
            Spotlight · {data.spotlight.isHandmade === 1
              ? "Handmade"
              : "Collected"}
          </div>
          <div class="spotlight-inner">
            <img
              src={data.spotlight.origUrl}
              alt={data.spotlight.name ?? "Spotlight"}
              style="background-image: url({data.spotlight.thumbUrl}); background-size: cover"
            />
          </div>
          <div
            class="spotlight-glare"
            aria-hidden="true"
            style="background: radial-gradient(circle at {glareX}% {glareY}%, oklch(1 0 0 / 0.3), transparent 60%); opacity: {tilting ? 1 : 0}"
          ></div>
          <div class="spotlight-caption">
            <h3>{data.spotlight.name ?? "名称未設定"}</h3>
            {#if data.spotlight.series}<p>{data.spotlight.series}</p>{/if}
          </div>
        {:else}
          <div class="spotlight-tag">Spotlight</div>
          <div
            class="spotlight-inner"
            style="display:grid; place-items:center; background:var(--bg-sunk)"
          >
            <span
              style="font-family:var(--f-display); font-size:56px; opacity:0.2; color:var(--fg)"
              >✦</span
            >
          </div>
        {/if}
      </div>
    </div>
  </section>

  <!-- 統計 -->
  <section class="statline rise rise-d1" aria-label="コレクション統計">
    <div class="statline-item">
      <span class="statline-num display">{displayTotal}</span>
      <span class="statline-label">Items</span>
    </div>
    <span class="statline-sep" aria-hidden="true"></span>
    <div class="statline-item">
      <span class="statline-num display">{displayHandmade}</span>
      <span class="statline-label">Handmade</span>
    </div>
    <span class="statline-sep" aria-hidden="true"></span>
    <div class="statline-item">
      <span class="statline-num display">{displayBought}</span>
      <span class="statline-label">Collected</span>
    </div>
    <span class="statline-sep" aria-hidden="true"></span>
    <div class="statline-item">
      <span class="statline-num display">{displaySeries}</span>
      <span class="statline-label">Series</span>
    </div>
  </section>

  <!-- セクションヘッダー -->
  <div class="section-head rise rise-d2">
    <h2>Collection</h2>
    <div class="seg">
      <button
        class={layout === "grid" ? "--active" : ""}
        onclick={() => (layout = "grid")}
        aria-label="グリッド表示"
        aria-pressed={layout === "grid"}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          ><rect x="3" y="3" width="7" height="7" /><rect
            x="14"
            y="3"
            width="7"
            height="7"
          /><rect x="3" y="14" width="7" height="7" /><rect
            x="14"
            y="14"
            width="7"
            height="7"
          /></svg
        >
      </button>
      <button
        class={layout === "list" ? "--active" : ""}
        onclick={() => (layout = "list")}
        aria-label="リスト表示"
        aria-pressed={layout === "list"}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"><path d="M3 6h18M3 12h18M3 18h18" /></svg
        >
      </button>
    </div>
  </div>

  <!-- フィルターバー -->
  <div class="filterbar rise rise-d2">
    <div class="search">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        ><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg
      >
      <input
        placeholder="名前・シリーズ・タグで検索…"
        bind:value={query}
        oninput={handleSearch}
      />
    </div>
    <div class="seg">
      {#each kindOptions as opt}
        <button
          class={kindFilter === opt.key ? "--active" : ""}
          onclick={() => setKind(opt.key)}
          aria-pressed={kindFilter === opt.key}
        >
          {opt.label}
        </button>
      {/each}
    </div>
    <div class="seg">
      {#each sortOptions as opt}
        <button
          class={sort === opt.key ? "--active" : ""}
          onclick={() => setSort(opt.key)}
          aria-pressed={sort === opt.key}
        >
          {opt.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- タグチップ -->
  {#if data.tags.length > 0}
    <div class="chiprow rise rise-d3">
      {#each data.tags as tag}
        <button
          class={"chip " + (activeTags.includes(tag.id) ? "--active" : "")}
          onclick={() => toggleTag(tag.id)}
          aria-pressed={activeTags.includes(tag.id)}
        >
          {tag.name}{#if tag.count > 0}&nbsp;<span class="count"
              >{tag.count}</span
            >{/if}
        </button>
      {/each}
      {#if activeTags.length > 0}
        <button
          class="chip"
          onclick={() => {
            activeTags = [];
            syncUrl();
            fetchItems(true);
          }}>クリア ×</button
        >
      {/if}
    </div>
  {/if}

  <!-- アイテム一覧 -->
  {#if layout === "grid"}
    <div class="items-grid">
      {#each columns as column, colIdx (colIdx)}
        <div class="items-column">
          {#each column as item (item.id)}
            <ItemCard {item} isOwner={!!data.user} />
          {/each}
        </div>
      {/each}
    </div>
  {:else}
    <div class="row-list">
      {#each items as item (item.id)}
        <a href="/items/{item.id}" class="card row-card reveal" use:reveal>
          <div class="row-thumb" style="view-transition-name: item-img-{item.id}">
            {#if item.thumbUrl}
              <img src={item.thumbUrl} alt="" />
            {:else}
              <div class="row-thumb-empty">✦</div>
            {/if}
          </div>
          <div class="row-body">
            <h3>{item.name ?? '名称未設定'}</h3>
            <div class="row-sub mono">
              {item.series ?? '—'} · {item.isHandmade === 1
                ? 'HANDMADE'
                : item.isHandmade === 0
                  ? 'COLLECTED'
                  : '—'}
            </div>
          </div>
          <div class="row-date mono">{formatDate(item.createdAt)}</div>
        </a>
      {/each}
    </div>
  {/if}

  {#if loading}
    <div class="skel-grid" aria-hidden="true">
      {#each Array(columnCount * 2) as _, i (i)}
        <div class="skel-card" style="animation-delay: {i * 90}ms">
          <div class="skel-img"></div>
          <div class="skel-line"></div>
          <div class="skel-line --short"></div>
        </div>
      {/each}
    </div>
  {/if}

  {#if !loading && items.length === 0}
    <div style="text-align:center; padding:80px 20px; color:var(--fg-soft)">
      <div
        style="font-family:var(--f-display); font-size:36px; margin-bottom:12px"
      >
        該当なし
      </div>
      <div style="font-size:13px; color:var(--fg-mute)">
        フィルタを変えるか、新しいアイテムを登録してください。
      </div>
    </div>
  {/if}

  <div bind:this={sentinel} style="height:4px"></div>
</div>

<!-- FAB (ログイン時のみ) -->
{#if data.user}
  <a href="/items/new" class="fab" aria-label="新規登録">
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg
    >
    <div class="fab-ring"></div>
  </a>
{/if}

<style>
  .hero-about-link {
    color: var(--fg-mute);
    text-decoration: underline dashed;
    text-underline-offset: 3px;
    transition: color var(--dur) var(--ease);
  }
  .hero-about-link:hover {
    color: var(--fg);
  }
  .hero-about-link:focus-visible {
    outline: 1.5px solid var(--fg-soft);
    border-radius: 2px;
  }
  @media (max-width: 720px) {
    .hero-meta { flex-wrap: wrap; }
    .hero-about-link { flex-basis: 100%; margin-top: 2px; }
  }

  .row-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .row-card {
    display: grid;
    grid-template-columns: 72px 1fr auto;
    gap: 18px;
    align-items: center;
    padding: 12px;
  }
  .row-thumb {
    width: 72px;
    height: 72px;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: var(--neu-inset);
    flex-shrink: 0;
  }
  .row-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .row-thumb-empty {
    width: 100%;
    height: 100%;
    background: var(--bg-sunk);
    display: grid;
    place-items: center;
    font-family: var(--f-display);
    font-size: 24px;
    opacity: 0.25;
    color: var(--fg);
  }
  .row-body {
    text-align: left;
    overflow: hidden;
  }
  .row-body h3 {
    margin: 0;
    font-family: var(--f-display);
    font-size: 17px;
    font-weight: 400;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .row-sub {
    font-size: 11px;
    color: var(--fg-soft);
    letter-spacing: 0.05em;
    margin-top: 3px;
  }
  .row-date {
    font-size: 11px;
    color: var(--fg-soft);
    white-space: nowrap;
  }
</style>
