<!-- src/lib/components/HexToggleRow.svelte -->
<script lang="ts">
  let { label, value, onchange }: {
    label: string;
    value: boolean;
    onchange: (v: boolean) => void;
  } = $props();
</script>

<div class="hex-panel-row --switch">
  <span class="eyebrow">{label}</span>
  <button
    class="toggle-chip"
    class:--on={value}
    onclick={() => onchange(!value)}
    aria-pressed={value}
  >
    <span class="toggle-dot"></span>
  </button>
</div>
