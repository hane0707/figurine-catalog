<script lang="ts">
	import '../app.css';
	import { Toaster } from '$lib/components/ui/sonner';
	import { ModeWatcher } from 'mode-watcher';

	let { children } = $props();
</script>

<ModeWatcher />
<svelte:head>
  <link rel="icon" href="/favicon.svg" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <meta name="theme-color" content="#1e1e2e" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
</svelte:head>
{@render children()}
<Toaster />
