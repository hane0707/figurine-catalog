<!-- src/lib/components/InkLayer.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { hexControls } from '$lib/stores/hexControls';

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

  let introBlobs = $state<InkBlob[]>([]);
  let introFading = $state(false);
  let persistBlobs = $state<InkBlob[]>([]);
  let blobCounter = 0;

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

<!-- Intro ink layer (first page load only) -->
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

<!-- Persistent ink layer (inkMode: true) -->
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
