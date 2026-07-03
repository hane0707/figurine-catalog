<!-- src/lib/components/Lightbox.svelte -->
<script lang="ts">
  type Photo = { id: string; thumbUrl: string; origUrl: string };
  let {
    photos,
    index = $bindable(0),
    open = $bindable(false),
  }: { photos: Photo[]; index?: number; open?: boolean } = $props();

  let dialogEl: HTMLDialogElement | undefined = $state();
  let loaded = $state(false);
  const current = $derived(photos[index]);

  $effect(() => {
    if (!dialogEl) return;
    if (open && !dialogEl.open) dialogEl.showModal();
    if (!open && dialogEl.open) dialogEl.close();
  });

  $effect(() => {
    // index が変わったらロード状態をリセット
    void index;
    loaded = false;
  });

  function prev() {
    index = (index - 1 + photos.length) % photos.length;
  }
  function next() {
    index = (index + 1) % photos.length;
  }
  function onKeydown(e: KeyboardEvent) {
    if (!open) return;
    if (e.altKey || e.metaKey || e.ctrlKey) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
  }
  function onBackdropClick(e: MouseEvent) {
    if (e.target === dialogEl) open = false;
  }
</script>

<svelte:window onkeydown={onKeydown} />

<dialog
  class="lightbox"
  bind:this={dialogEl}
  onclose={() => (open = false)}
  onclick={onBackdropClick}
  aria-label="写真の拡大表示"
>
  {#if current}
    <div class="lb-stage">
      <img
        class="lb-img"
        class:--loaded={loaded}
        src={current.origUrl}
        alt=""
        style="background-image: url({current.thumbUrl})"
        onload={() => (loaded = true)}
      />
      {#if !loaded}<div class="lb-spinner mono">LOADING…</div>{/if}
    </div>
    {#if photos.length > 1}
      <button class="lb-nav --prev" onclick={prev} aria-label="前の写真">←</button>
      <button class="lb-nav --next" onclick={next} aria-label="次の写真">→</button>
      <div class="lb-count mono">{index + 1} / {photos.length}</div>
    {/if}
    <button class="lb-close" onclick={() => (open = false)} aria-label="閉じる">×</button>
  {/if}
</dialog>

<style>
  .lightbox {
    border: none;
    padding: 0;
    background: transparent;
    max-width: 100vw;
    max-height: 100vh;
    width: 100vw;
    height: 100vh;
    outline: none;
  }
  .lightbox::backdrop {
    background: oklch(0.12 0.01 285 / 0.88);
    backdrop-filter: blur(10px);
  }
  .lb-stage {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    padding: 48px;
    pointer-events: none;
  }
  .lb-img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 12px;
    background-size: cover;
    background-position: center;
    opacity: 0.4;
    transition: opacity 320ms ease;
    box-shadow: 0 32px 80px oklch(0 0 0 / 0.5);
    pointer-events: auto;
  }
  .lb-img.--loaded {
    opacity: 1;
    background-image: none !important;
  }
  .lb-spinner {
    position: absolute;
    bottom: 28px;
    left: 50%;
    transform: translateX(-50%);
    color: oklch(1 0 0 / 0.7);
    font-size: 11px;
    letter-spacing: 0.16em;
  }
  .lb-nav,
  .lb-close {
    position: fixed;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1px solid oklch(1 0 0 / 0.25);
    background: oklch(0.2 0.01 285 / 0.6);
    color: oklch(1 0 0 / 0.9);
    font-size: 16px;
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: background 160ms ease;
  }
  .lb-nav:hover,
  .lb-close:hover {
    background: oklch(0.3 0.01 285 / 0.8);
  }
  .lb-nav.--prev { left: 20px; top: 50%; transform: translateY(-50%); }
  .lb-nav.--next { right: 20px; top: 50%; transform: translateY(-50%); }
  .lb-close { top: 20px; right: 20px; }
  .lb-count {
    position: fixed;
    top: 28px;
    left: 50%;
    transform: translateX(-50%);
    color: oklch(1 0 0 / 0.7);
    font-size: 11px;
    letter-spacing: 0.14em;
  }
  @media (max-width: 720px) {
    .lb-stage { padding: 16px; }
    .lb-nav.--prev { left: 8px; }
    .lb-nav.--next { right: 8px; }
  }
</style>
