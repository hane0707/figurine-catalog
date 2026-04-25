<script lang="ts">
	import '../app.css';
	import { Toaster } from '$lib/components/ui/sonner';
	import { page } from '$app/state';
	import type { LayoutData } from './$types';

	let { children, data }: { children: any; data: LayoutData } = $props();
	const isSecondary = $derived(page.url.pathname !== '/items');
</script>

<svelte:head>
  <link rel="icon" href="/favicon.svg" />
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
      <div class="brand-mark" aria-hidden="true"></div>
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
