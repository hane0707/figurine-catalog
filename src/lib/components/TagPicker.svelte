<!-- src/lib/components/TagPicker.svelte -->
<script lang="ts">
  import { Badge } from '$lib/components/ui/badge';
  import { Input } from '$lib/components/ui/input';

  type TagItem = { id: string; name: string };

  let {
    selected = $bindable([]),
    suggestions = [],
    frequent = [],
    placeholder = 'タグを追加...',
    onCreate,
  }: {
    selected?: TagItem[];
    suggestions?: TagItem[];
    frequent?: TagItem[];
    placeholder?: string;
    onCreate: (name: string) => Promise<TagItem>;
  } = $props();

  let input = $state('');

  function toggle(item: TagItem) {
    const exists = selected.find((s) => s.id === item.id);
    selected = exists ? selected.filter((s) => s.id !== item.id) : [...selected, item];
  }

  function isSelected(id: string) {
    return selected.some((s) => s.id === id);
  }

  async function handleAdd() {
    const name = input.trim();
    if (!name) return;
    const existing = suggestions.find((s) => s.name.toLowerCase() === name.toLowerCase());
    const item = existing ?? (await onCreate(name));
    if (!isSelected(item.id)) selected = [...selected, item];
    input = '';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
  }
</script>

<div class="space-y-3">
  {#if selected.length > 0}
    <div class="flex flex-wrap gap-2">
      {#each selected as item}
        <Badge variant="secondary" class="cursor-pointer" onclick={() => toggle(item)}>
          {item.name} ✕
        </Badge>
      {/each}
    </div>
  {/if}

  {#if frequent.length > 0}
    <div>
      <p class="text-xs text-muted-foreground mb-1">⭐ よく使うもの</p>
      <div class="flex flex-wrap gap-2">
        {#each frequent as item}
          <Badge
            variant={isSelected(item.id) ? 'default' : 'outline'}
            class="cursor-pointer"
            onclick={() => toggle(item)}
          >{item.name}</Badge>
        {/each}
      </div>
    </div>
  {/if}

  <div class="flex flex-wrap gap-2">
    {#each suggestions.filter((s) => !frequent.find((f) => f.id === s.id)) as item}
      <Badge
        variant={isSelected(item.id) ? 'default' : 'outline'}
        class="cursor-pointer"
        onclick={() => toggle(item)}
      >{item.name}</Badge>
    {/each}
  </div>

  <div class="flex gap-2">
    <Input bind:value={input} {placeholder} onkeydown={handleKeydown} />
    <button
      type="button"
      class="px-3 py-2 text-sm border rounded-md hover:bg-accent"
      onclick={handleAdd}
    >追加</button>
  </div>
</div>
