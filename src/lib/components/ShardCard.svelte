<!-- src/lib/components/ShardCard.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { formatDate } from '$lib/utils/date';
  import {
    hashSeed,
    CLIP_SHAPES,
    buildSlab,
    buildEdges,
    glintPos,
    scatterParams,
  } from '$lib/shards/geometry';

  let {
    item,
    isOwner = false,
    index = 0,
  }: {
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
    index?: number;
  } = $props();

  // item.id から決定論的に導く seed。同じ作品は再訪しても同じ形・傾き・浮遊周期になる。
  // item/index は $props() 由来のリアクティブな値なので、$derived 経由で読む
  // （プレーンな const で直接参照すると初期値のみを捕捉してしまう）。
  const seed = $derived(hashSeed(item.id));
  const clipIdx = $derived(seed % CLIP_SHAPES.length);
  const scatter = $derived(scatterParams(seed));
  const slabPanels = $derived(buildSlab(clipIdx, seed));
  const edges = $derived(buildEdges(clipIdx));
  const glint = $derived(glintPos(clipIdx));
  const enterDelay = $derived(index * 0.05);

  const kindLabel = $derived(
    item.isHandmade === 1 ? 'HANDMADE / 自作' : item.isHandmade === 0 ? 'COLLECTED / 購入' : 'ITEM',
  );

  function quadPoints(quad: readonly { x: number; y: number }[]): string {
    return quad.map((p) => `${p.x},${p.y}`).join(' ');
  }

  // ポインタチルト。pointer:fine かつ非 reduced-motion のときのみ、
  // イベント発生ごとに能力を再評価する（タッチ端末でチルトが固定表示される
  // 既修正バグと同じガード。src/routes/items/+page.svelte の handleTilt を参照）。
  let tiltX = $state(0);
  let tiltY = $state(0);
  let stageEl: HTMLDivElement;

  function handleTilt(e: MouseEvent) {
    if (
      !window.matchMedia('(pointer: fine)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const rect = stageEl.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    tiltX = (0.5 - py) * 14;
    tiltY = (px - 0.5) * 14;
  }
  function resetTilt() {
    tiltX = 0;
    tiltY = 0;
  }

  // 画面外では bob（浮遊）を止め、毎フレームの再ラスタライズを避ける。
  let inView = $state(false);
  let rootEl: HTMLAnchorElement;
  onMount(() => {
    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
      },
      { rootMargin: '200px 0px' },
    );
    io.observe(rootEl);
    return () => io.disconnect();
  });
</script>

<a
  href="/items/{item.id}"
  class="piece"
  bind:this={rootEl}
  style="--dx:{scatter.dx}px; --dy:{scatter.dy}px; --rot:{scatter.rot}deg; --dur:{scatter.dur}s; --del:{scatter.del}s; --edel:{enterDelay}s"
>
  <div class="glow" style="transform:rotate(var(--rot))"></div>
  <div class={'bob' + (inView ? ' --in-view' : '')}>
    <div class="stage" bind:this={stageEl} onmousemove={handleTilt} onmouseleave={resetTilt} role="presentation">
      <div class="tilt" style="transform:rotateX({tiltX}deg) rotateY({tiltY}deg)">
        <div class="shard-stack">
          <svg class="slab" viewBox="0 0 100 120" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              {#if item.thumbUrl}
                <image
                  id="slab-photo-{item.id}"
                  href={item.thumbUrl}
                  x="0"
                  y="0"
                  width="100"
                  height="120"
                  preserveAspectRatio="xMidYMid slice"
                />
              {/if}
              {#each slabPanels as panel, i (i)}
                <clipPath id="slab-clip-{item.id}-{i}" clipPathUnits="userSpaceOnUse">
                  <polygon points={quadPoints(panel.quad)} />
                </clipPath>
                <linearGradient
                  id="slab-grad-{item.id}-{i}"
                  x1={panel.gradientFrom.x}
                  y1={panel.gradientFrom.y}
                  x2={panel.gradientTo.x}
                  y2={panel.gradientTo.y}
                  gradientUnits="userSpaceOnUse"
                >
                  {#each panel.stops as stop (stop.offset)}
                    <stop offset={stop.offset} stop-color={stop.color} stop-opacity={stop.opacity} />
                  {/each}
                </linearGradient>
              {/each}
            </defs>
            {#each slabPanels as panel, i (i)}
              <g clip-path="url(#slab-clip-{item.id}-{i})">
                {#if item.thumbUrl}
                  <use href="#slab-photo-{item.id}" transform={panel.photoTransform} opacity={panel.photoOpacity} />
                {/if}
                <polygon
                  points={quadPoints(panel.quad)}
                  fill="url(#slab-grad-{item.id}-{i})"
                  stroke={panel.strokeColor}
                  stroke-opacity={panel.strokeOpacity}
                  stroke-width={panel.strokeWidth}
                />
              </g>
            {/each}
          </svg>
          <div
            class="shard"
            style="clip-path:url(#shard-clip-{clipIdx}); view-transition-name: item-img-{item.id}"
          >
            {#if item.thumbUrl}
              <img class="photo" src={item.thumbUrl} alt={item.name ?? '名称未設定'} loading="lazy" />
            {:else}
              <div class="photo photo-empty">✦</div>
            {/if}
            <div class="tint"></div>
            <div class="grain"></div>
            <svg class="edgeline" viewBox="0 0 100 120" preserveAspectRatio="none" aria-hidden="true">
              {#each edges as edge, i (i)}
                <line
                  x1={edge.x1}
                  y1={edge.y1}
                  x2={edge.x2}
                  y2={edge.y2}
                  stroke={edge.color}
                  stroke-opacity={edge.opacity}
                  stroke-width={edge.width}
                  stroke-linecap="round"
                />
              {/each}
            </svg>
            <div class="glint" style="--gx:{glint.xPct}%; --gy:{glint.yPct}%"></div>
            <div class="sheen"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="meta">
    <div class="cat-row">
      <span class="cat">{kindLabel}</span>
      {#if isOwner && item.isPublic === 0}
        <svg
          class="lock-icon"
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      {/if}
    </div>
    <h2>{item.name ?? '名称未設定'}</h2>
    <p>{item.series ?? '—'}</p>
    {#if item.tags && item.tags.length > 0}
      <div class="tags">
        {#each item.tags as tag (tag.id)}
          <span class="tag-chip">{tag.name}</span>
        {/each}
      </div>
    {/if}
    <time class="mono">{formatDate(item.createdAt)}</time>
  </div>
</a>

<style>
  .piece {
    --rot: 0deg;
    --dx: 0px;
    --dy: 0px;
    --dur: 8s;
    --del: 0s;
    --edel: 0s;
    position: relative;
    display: block;
    /* 左右は%指定: 傾き・浮遊のはみ出しがカード幅に比例するため。上下は固定px。 */
    padding: 46px 9% 24px;
    text-decoration: none;
    color: inherit;
    transform: translate(var(--dx), var(--dy));
    animation: shard-enter 700ms var(--ease-out) both;
    animation-delay: var(--edel, 0s);
    content-visibility: auto;
    contain-intrinsic-size: 280px 560px;
  }
  @keyframes shard-enter {
    from {
      opacity: 0;
      transform: translate(var(--dx), calc(var(--dy) + 30px));
    }
    to {
      opacity: 1;
      transform: translate(var(--dx), var(--dy));
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .piece {
      animation: none;
      opacity: 1;
    }
  }

  .glow {
    position: absolute;
    inset: 6% 8%;
    border-radius: 50%;
    background: var(--shard-glow-bg);
    filter: blur(22px);
    z-index: 0;
    pointer-events: none;
  }
  .piece:hover .glow,
  .piece:focus-visible .glow {
    filter: blur(26px);
  }

  .bob {
    position: relative;
    z-index: 1;
    animation: shard-bob var(--dur) ease-in-out var(--del) infinite;
    animation-play-state: paused;
  }
  .bob.--in-view {
    animation-play-state: running;
  }
  .piece:hover .bob,
  .piece:focus-visible .bob {
    animation-play-state: paused;
  }
  @keyframes shard-bob {
    0%,
    100% {
      transform: translateY(0) rotate(var(--rot));
    }
    50% {
      transform: translateY(-12px) rotate(calc(var(--rot) * 0.55));
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .bob {
      animation: none;
    }
  }

  .stage {
    perspective: 700px;
  }
  .tilt {
    transition: transform 500ms var(--ease-out);
    transform-style: preserve-3d;
  }
  @media (prefers-reduced-motion: reduce) {
    .tilt {
      transition: none;
    }
  }

  .shard-stack {
    position: relative;
    width: 100%;
    aspect-ratio: 5 / 6;
    transition: transform 500ms var(--ease-out);
  }
  .piece:hover .shard-stack,
  .piece:focus-visible .shard-stack {
    transform: scale(1.03);
  }
  @media (prefers-reduced-motion: reduce) {
    .shard-stack {
      transition: none;
    }
  }

  .slab {
    position: absolute;
    inset: 0;
    z-index: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    display: block;
  }

  .shard {
    position: absolute;
    inset: 0;
    z-index: 1;
  }
  .shard .photo {
    position: absolute;
    inset: 0;
    z-index: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    filter: contrast(1.05) saturate(0.85) brightness(0.97);
  }
  .shard .photo-empty {
    display: grid;
    place-items: center;
    background: var(--bg-sunk);
    font-family: var(--f-display);
    font-size: 40px;
    opacity: 0.3;
    color: var(--fg);
  }
  .tint {
    position: absolute;
    inset: 0;
    z-index: 1;
    background: var(--shard-tint-gradient);
    opacity: var(--shard-tint-opacity);
    mix-blend-mode: soft-light;
    pointer-events: none;
  }
  .grain {
    position: absolute;
    inset: 0;
    z-index: 2;
    filter: url(#shard-grain);
    mix-blend-mode: overlay;
    opacity: var(--shard-grain-opacity);
    pointer-events: none;
  }
  .edgeline {
    position: absolute;
    inset: 0;
    z-index: 3;
    width: 100%;
    height: 100%;
    mix-blend-mode: screen;
    pointer-events: none;
  }
  .glint {
    position: absolute;
    inset: 0;
    z-index: 4;
    background: radial-gradient(circle at var(--gx, 50%) var(--gy, 0%), oklch(1 0 0 / 0.95), oklch(1 0 0 / 0) 7%);
    mix-blend-mode: screen;
    opacity: var(--shard-glint-opacity);
    pointer-events: none;
  }
  .sheen {
    position: absolute;
    inset: -40%;
    z-index: 5;
    background: var(--shard-sheen-gradient);
    transform: translateX(-18%);
    transition: transform 1100ms cubic-bezier(0.3, 0.7, 0.2, 1);
    pointer-events: none;
  }
  .piece:hover .sheen,
  .piece:focus-visible .sheen {
    transform: translateX(38%);
  }
  @media (prefers-reduced-motion: reduce) {
    .sheen {
      transition: none;
    }
  }

  .meta {
    position: relative;
    z-index: 1;
    margin: 18px 4px 40px;
    border-left: 1px solid var(--line);
    padding-left: 14px;
  }
  .cat-row {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .meta .cat {
    font-family: var(--f-mono);
    font-size: 10.5px;
    letter-spacing: 0.3em;
    color: var(--accent-amber);
    text-transform: uppercase;
  }
  .lock-icon {
    flex-shrink: 0;
    color: var(--fg-soft);
  }
  .meta h2 {
    font-family: var(--f-display);
    font-weight: 400;
    font-size: 17px;
    letter-spacing: 0.02em;
    color: var(--fg);
    margin: 6px 0 4px;
  }
  .meta p {
    font-size: 12px;
    line-height: 1.7;
    color: var(--fg-soft);
    margin: 0 0 8px;
  }
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 8px;
  }
  .tag-chip {
    font-family: var(--f-mono);
    font-size: 10px;
    letter-spacing: 0.04em;
    padding: 2px 8px;
    border-radius: var(--r-pill);
    background: var(--bg-sunk);
    color: var(--fg-soft);
    box-shadow: var(--neu-inset);
  }
  .meta time {
    display: block;
    font-size: 11px;
    letter-spacing: 0.1em;
    color: var(--fg-soft);
  }
</style>
