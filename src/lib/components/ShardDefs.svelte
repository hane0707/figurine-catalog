<!-- src/lib/components/ShardDefs.svelte -->
<!-- 一覧ページに1回だけ設置する共有 SVG defs。clipPath ×6 と紙グレイン用フィルタ。 -->
<script lang="ts">
  import { CLIP_SHAPES } from '$lib/shards/geometry';
</script>

<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    {#each CLIP_SHAPES as shape, i (i)}
      <clipPath id="shard-clip-{i}" clipPathUnits="objectBoundingBox">
        <polygon points={shape} />
      </clipPath>
    {/each}
    <filter id="shard-grain" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.012 0.75" numOctaves="3" seed="11" stitchTiles="stitch" result="n" />
      <feColorMatrix
        in="n"
        type="matrix"
        values="0.33 0.33 0.33 0 0
                0.33 0.33 0.33 0 0
                0.33 0.33 0.33 0 0
                0    0    0    0 1"
      />
    </filter>
  </defs>
</svg>
