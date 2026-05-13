<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { Toaster } from '$lib/components/ui/sonner';
	import { page } from '$app/state';
	import type { LayoutData } from './$types';
	import { hexControls, speedToDuration } from '$lib/stores/hexControls';

	let { children, data }: { children: any; data: LayoutData } = $props();
	const isSecondary = $derived(page.url.pathname !== '/items');
	const r1Duration = $derived(speedToDuration($hexControls.speed).r1);
	const r2Duration = $derived(speedToDuration($hexControls.speed).r2);

	let panelOpen = $state(false);
	let panelEl: HTMLDivElement | undefined;

	function handleFocusOut(e: FocusEvent) {
		if (!e.relatedTarget || !panelEl?.contains(e.relatedTarget as Node)) {
			panelOpen = false;
		}
	}

	// --- ink drop ---
	interface BlobCircle { dx: number; dy: number; scale: number; }

	interface InkBlob {
		id: number;
		x: number;
		y: number;
		size: number;
		color: string;
		dur: number;
		circles: BlobCircle[];
	}

	function makeCircles(size: number): BlobCircle[] {
		const count = 2 + Math.floor(Math.random() * 2);
		const extras: BlobCircle[] = Array.from({ length: count - 1 }, () => {
			const angle = Math.random() * Math.PI * 2;
			const dist = size * (0.25 + Math.random() * 0.25);
			return {
				dx: Math.cos(angle) * dist,
				dy: Math.sin(angle) * dist,
				scale: 0.55 + Math.random() * 0.35,
			};
		});
		return [{ dx: 0, dy: 0, scale: 1 }, ...extras];
	}

	let introBlobs = $state<InkBlob[]>([]);
	let introFading = $state(false);
	let persistBlobs = $state<InkBlob[]>([]);
	let blobCounter = 0;

	function blobColor(index: number, rainbow: boolean): string {
		if (!rainbow) return 'oklch(0.3 0.01 285 / 0.3)';
		const hues = [55, 230, 140, 285];
		return `oklch(0.6 0.18 ${hues[index % hues.length]} / 0.45)`;
	}

	function makeBlob(index: number, rainbow: boolean): InkBlob {
		const size = 200 + Math.random() * 300;
		return {
			id: ++blobCounter,
			x: 10 + Math.random() * 80,
			y: 10 + Math.random() * 80,
			size,
			color: blobColor(index, rainbow),
			dur: 14 + Math.random() * 4,
			circles: makeCircles(size),
		};
	}

	onMount(() => {
		if (sessionStorage.getItem('ink-intro-shown')) return;
		sessionStorage.setItem('ink-intro-shown', '1');

		const rainbow = $hexControls.rainbow;
		const ids: ReturnType<typeof setTimeout>[] = [];
		const count = 4 + Math.floor(Math.random() * 2);

		for (let i = 0; i < count; i++) {
			ids.push(setTimeout(() => {
				introBlobs = [...introBlobs, makeBlob(i, rainbow)];
			}, i * 300));
		}

		ids.push(setTimeout(() => {
			introFading = true;
			ids.push(setTimeout(() => {
				introBlobs = [];
				introFading = false;
			}, 1200));
		}, (count - 1) * 300 + 3000));

		return () => ids.forEach(clearTimeout);
	});

	$effect(() => {
		if ($hexControls.inkMode) {
			const rainbow = $hexControls.rainbow;
			persistBlobs = [];
			const id = setInterval(() => {
				if (persistBlobs.length >= 12) return;
				persistBlobs = [...persistBlobs, makeBlob(persistBlobs.length, rainbow)];
			}, 1500);
			return () => clearInterval(id);
		} else {
			persistBlobs = [];
		}
	});

	function removeBlob(id: number) {
		persistBlobs = persistBlobs.filter(b => b.id !== id);
	}
</script>

<svelte:head>
  <link rel="icon" href="/favicon.png" type="image/png" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <meta name="theme-color" content="#f0edf8" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,300..700,50..100;1,9..144,300..700,50..100&family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet" />
</svelte:head>

<!-- Gooey SVG filter (hidden, must be in DOM before ink layers render) -->
<svg style="display:none" aria-hidden="true">
  <defs>
    <filter id="ink-gooey">
      <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
      <feColorMatrix in="blur" type="matrix"
        values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 6 -1" />
    </filter>
  </defs>
</svg>

<div class="ambient {$hexControls.rainbow ? '--rainbow' : ''} {$hexControls.inkMode ? '--ink' : ''}" aria-hidden="true">
  <div class="blob b1"></div>
  <div class="blob b2"></div>
  <div class="blob b3"></div>
  <svg class="amb-ring r1" style="animation-duration: {r1Duration}s" viewBox="-350 -350 700 700" aria-hidden="true">
    <polygon
      points="0,-350 303,-175 303,175 0,350 -303,175 -303,-175"
      fill="none"
      stroke="var(--line)"
      stroke-width="1"
      transform="rotate(12)"
    />
  </svg>
  <svg class="amb-ring r2" style="animation-duration: {r2Duration}s" viewBox="-210 -210 420 420" aria-hidden="true">
    <polygon
      points="0,-210 182,-105 182,105 0,210 -182,105 -182,-105"
      fill="none"
      stroke="var(--line)"
      stroke-width="1"
      transform="rotate(12)"
    />
  </svg>
</div>

<!-- Intro ink layer (first page load only, z-index: 0 — after .ambient = renders on top) -->
{#if introBlobs.length > 0}
  <div class="ink-intro" class:--fading={introFading}>
    {#each introBlobs as blob (blob.id)}
      <div class="ink-blob" style="left:{blob.x}vw;top:{blob.y}vh;--ink-dur:{blob.dur}s">
        {#each blob.circles as c}
          <div
            class="ink-circle"
            style="width:{blob.size * c.scale}px;height:{blob.size * c.scale}px;background:{blob.color};left:{c.dx}px;top:{c.dy}px;margin-left:{-(blob.size * c.scale / 2)}px;margin-top:{-(blob.size * c.scale / 2)}px"
          ></div>
        {/each}
      </div>
    {/each}
  </div>
{/if}

<!-- Persistent ink layer (inkMode: true), z-index: 0 — after .ambient = renders on top -->
<div class="ink-layer" class:--active={$hexControls.inkMode}>
  {#each persistBlobs as blob (blob.id)}
    <div
      class="ink-blob"
      style="left:{blob.x}vw;top:{blob.y}vh;--ink-dur:{blob.dur}s"
      onanimationend={(e) => { if (e.animationName === 'ink-fade') removeBlob(blob.id); }}
    >
      {#each blob.circles as c}
        <div
          class="ink-circle"
          style="width:{blob.size * c.scale}px;height:{blob.size * c.scale}px;background:{blob.color};left:{c.dx}px;top:{c.dy}px;margin-left:{-(blob.size * c.scale / 2)}px;margin-top:{-(blob.size * c.scale / 2)}px"
        ></div>
      {/each}
    </div>
  {/each}
</div>

<nav class="nav" aria-label="Main">
  <div class="nav-inner">
    <a href="/items" class="brand" style="text-decoration:none; color:inherit">
      <img src="/brand-mark.png" alt="" class="brand-mark" width="44" height="44" aria-hidden="true" />
      <div class="brand-name">Haku's suitcase</div>
    </a>
    <div class="nav-actions">
      {#if isSecondary}
        <a href="/items" class="btn --ghost" style="gap:6px; padding:8px 14px">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          <span style="font-family:var(--f-mono); font-size:11px; letter-spacing:0.1em">COLLECTION</span>
        </a>
      {:else if data.user}
        {#if data.isDevMode}
          <form method="POST" action="/admin?/logout" style="display:contents">
            <button type="submit" class="btn --ghost" style="font-size:12px; letter-spacing:0.04em">
              ログアウト
            </button>
          </form>
        {:else}
          <a href="https://{data.cfTeamDomain}.cloudflareaccess.com/cdn-cgi/access/logout?return_to={page.url.origin}/items" class="btn --ghost" style="font-size:12px; letter-spacing:0.04em">
            ログアウト
          </a>
        {/if}
      {/if}

      <!-- hex control panel trigger -->
      <div
        class="hex-panel-wrap"
        bind:this={panelEl}
        onfocusout={handleFocusOut}
      >
        <button
          class="btn --ghost --icon hex-toggle"
          class:--active={panelOpen}
          onclick={() => (panelOpen = !panelOpen)}
          aria-label="背景エフェクトの設定"
          aria-expanded={panelOpen}
        >⬡</button>

        {#if panelOpen}
          <div class="hex-panel" tabindex="-1">
            <div class="hex-panel-row" class:--disabled={$hexControls.inkMode}>
              <span class="eyebrow">SPEED</span>
              <input
                type="range"
                min="1"
                max="100"
                value={$hexControls.speed}
                disabled={$hexControls.inkMode}
                oninput={(e) =>
                  hexControls.setSpeed(
                    Number((e.target as HTMLInputElement).value),
                  )}
              />
              <div class="hex-panel-labels">
                <span>Fast</span><span>Slow</span>
              </div>
            </div>
            <div class="hex-panel-row --switch">
              <span class="eyebrow">RAINBOW</span>
              <button
                class="toggle-chip"
                class:--on={$hexControls.rainbow}
                onclick={() => hexControls.setRainbow(!$hexControls.rainbow)}
                aria-pressed={$hexControls.rainbow}
              >
                <span class="toggle-dot"></span>
              </button>
            </div>
            <div class="hex-panel-row --switch">
              <span class="eyebrow">INK MODE</span>
              <button
                class="toggle-chip"
                class:--on={$hexControls.inkMode}
                onclick={() => hexControls.setInkMode(!$hexControls.inkMode)}
                aria-pressed={$hexControls.inkMode}
              >
                <span class="toggle-dot"></span>
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</nav>

{@render children()}

<footer class="site-footer">
  <a href="/items">Collection</a>
  <span>·</span>
  <a href="/about">About</a>
  <span>·</span>
  <a href="/privacy">Privacy Policy</a>
</footer>
<Toaster />
