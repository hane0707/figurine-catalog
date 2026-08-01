<!-- src/lib/components/DustField.svelte -->
<!-- ちり光（前景 depth-fx）。固定 seed で決定論生成、常時 ON。 -->
<script lang="ts">
  import { buildDust } from '$lib/shards/geometry';

  const DUST_SEED = 4242;
  const DUST_COUNT = 22;
  const motes = buildDust(DUST_SEED, DUST_COUNT);
</script>

<div class="dust-field" aria-hidden="true">
  {#each motes as mote, i (i)}
    <span
      class="mote"
      style="left:{mote.xVw}vw; top:{mote.yVh}vh; width:{mote.size}px; height:{mote.size}px; --tw-dur:{mote.dur}s; --tw-delay:{mote.delay}s; --tw-peak:{mote.peak};"
    ></span>
  {/each}
</div>

<style>
  .dust-field {
    position: fixed;
    inset: 0;
    z-index: 6;
    pointer-events: none;
    opacity: var(--shard-dust-opacity);
  }
  .mote {
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      var(--shard-dust-color) 0%,
      color-mix(in oklch, var(--shard-dust-color) 70%, transparent) 45%,
      transparent 75%
    );
    box-shadow: 0 0 4px 1px color-mix(in oklch, var(--shard-dust-color) 55%, transparent);
    opacity: 0;
    animation: mote-twinkle var(--tw-dur, 5s) ease-in-out var(--tw-delay, 0s) infinite;
  }
  @keyframes mote-twinkle {
    0%,
    96%,
    100% {
      opacity: 0;
      transform: scale(0.6);
    }
    98% {
      opacity: var(--tw-peak, 0.85);
      transform: scale(1);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .mote {
      animation: none !important;
      opacity: 0.3 !important;
    }
  }
</style>
