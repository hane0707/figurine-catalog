<script lang="ts">
	import '../app.css';
	import { Toaster } from '$lib/components/ui/sonner';
	import { page } from '$app/state';
	import type { LayoutData } from './$types';
	import { hexControls } from '$lib/stores/hexControls';

	let { children, data }: { children: any; data: LayoutData } = $props();
	const isSecondary = $derived(page.url.pathname !== '/items');

	let panelOpen = $state(false);
	let panelEl: HTMLDivElement | undefined;

	function handleFocusOut(e: FocusEvent) {
		if (!e.relatedTarget || !panelEl?.contains(e.relatedTarget as Node)) {
			panelOpen = false;
		}
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
          <a href="/cdn-cgi/access/logout" class="btn --ghost" style="font-size:12px; letter-spacing:0.04em">
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
            <div class="hex-panel-row">
              <span class="eyebrow">SPEED</span>
              <input
                type="range"
                min="1"
                max="100"
                value={$hexControls.speed}
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
