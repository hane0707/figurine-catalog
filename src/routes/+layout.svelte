<script lang="ts">
	import '../app.css';
	import { Toaster } from '$lib/components/ui/sonner';
	import { page } from '$app/state';
	import type { LayoutData } from './$types';
	import { hexControls, speedToDuration } from '$lib/stores/hexControls';
	import HexToggleRow from '$lib/components/HexToggleRow.svelte';
	import InkLayer from '$lib/components/InkLayer.svelte';

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

	$effect(() => {
		document.documentElement.classList.toggle('dark', $hexControls.darkMode);
		document
			.querySelector('meta[name="theme-color"]')
			?.setAttribute('content', $hexControls.darkMode ? '#2a292e' : '#e4e1e9');
	});
</script>

<svelte:head>
  <link rel="icon" href="/favicon.png" type="image/png" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <meta name="theme-color" content="#e4e1e9" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,300..700,50..100;1,9..144,300..700,50..100&family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet" />
</svelte:head>

<InkLayer />

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
            <HexToggleRow
              label="RAINBOW"
              value={$hexControls.rainbow}
              onchange={(v) => hexControls.setRainbow(v)}
            />
            <HexToggleRow
              label="INK MODE"
              value={$hexControls.inkMode}
              onchange={(v) => hexControls.setInkMode(v)}
            />
            <HexToggleRow
              label="DARK MODE"
              value={$hexControls.darkMode}
              onchange={(v) => hexControls.setDarkMode(v)}
            />
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
