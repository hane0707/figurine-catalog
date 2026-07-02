<script lang="ts">
  import { page } from '$app/state';
  import GlitchText from '$lib/components/GlitchText.svelte';

  const is404 = $derived(page.status === 404);
</script>

<svelte:head>
  <title>{page.status} — Haku's suitcase</title>
</svelte:head>

<div class="error-page">
  <div class="error-code mono">{page.status}</div>
  <h1 class="display error-title">
    {#if is404}
      <GlitchText
        segments={[
          { text: 'この', small: true },
          { text: 'スーツケース', em: true },
          { text: 'には', breakAfter: true },
          { text: '入っていないようです。' },
        ]}
      />
    {:else}
      <GlitchText
        segments={[
          { text: '雨', large: true, stain: true },
          { text: 'が入り込んだようです。' },
        ]}
      />
    {/if}
  </h1>
  <p class="error-lede">
    {#if is404}
      お探しのものは、別の場所にしまわれているかもしれません。
    {:else}
      少し時間をおいて、もう一度お試しください。
    {/if}
  </p>
  <a href="/items" class="btn --primary">コレクションへ戻る</a>
</div>

<style>
  .error-page {
    position: relative;
    z-index: 1;
    min-height: 70vh;
    max-width: 720px;
    margin: 0 auto;
    padding: 80px 40px 120px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 20px;
  }
  .error-code {
    font-size: 13px;
    letter-spacing: 0.2em;
    color: var(--fg-soft);
  }
  .error-title {
    font-size: clamp(32px, 5.5vw, 64px);
    margin: 0;
  }
  .error-lede {
    color: var(--fg-mute);
    font-size: 15px;
    line-height: 1.7;
    margin: 0 0 12px;
  }
  @media (max-width: 720px) {
    .error-page { padding: 60px 16px 100px; }
  }
</style>
