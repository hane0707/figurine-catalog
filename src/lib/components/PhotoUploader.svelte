<!-- src/lib/components/PhotoUploader.svelte -->
<script lang="ts">
  import { resizeImage } from '$lib/utils/image';
  import { generateId } from '$lib/utils/uuid';
  import { toast } from 'svelte-sonner';

  let {
    itemId,
    onUploaded,
  }: {
    itemId: string;
    onUploaded: (photo: { id: string; r2KeyOrig: string; r2KeyThumb: string }) => void;
  } = $props();

  let uploading = $state(false);
  let fileInput: HTMLInputElement;

  async function uploadWithRetry(url: string, blob: Blob, maxRetries = 3): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const res = await fetch(url, { method: 'PUT', body: blob, headers: { 'Content-Type': blob.type } });
        if (res.ok) return;
        throw new Error(`HTTP ${res.status}`);
      } catch (e) {
        if (i === maxRetries - 1) throw e;
        await new Promise((r) => setTimeout(r, 500 * (i + 1)));
      }
    }
  }

  async function handleFiles(files: FileList) {
    uploading = true;
    const limited = Array.from(files).slice(0, 20);

    for (const file of limited) {
      const photoId = generateId();
      try {
        const presignRes = await fetch('/api/photos/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId, photoId, contentType: file.type }),
        });
        const { origUrl, thumbUrl, origKey, thumbKey } = await presignRes.json() as {
          origUrl: string;
          thumbUrl: string;
          origKey: string;
          thumbKey: string;
        };

        const thumb = await resizeImage(file, 400);

        await Promise.all([
          uploadWithRetry(origUrl, file),
          uploadWithRetry(thumbUrl, thumb),
        ]);

        await fetch(`/api/photos/${photoId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId, r2KeyOrig: origKey, r2KeyThumb: thumbKey }),
        });

        onUploaded({ id: photoId, r2KeyOrig: origKey, r2KeyThumb: thumbKey });
      } catch {
        toast.error(`${file.name} のアップロードに失敗しました`);
      }
    }

    uploading = false;
  }

  function handleChange(e: Event) {
    const files = (e.target as HTMLInputElement).files;
    if (files?.length) handleFiles(files);
  }
</script>

<div>
  <input
    bind:this={fileInput}
    type="file"
    accept="image/jpeg,image/png,image/webp"
    multiple
    class="hidden"
    onchange={handleChange}
  />
  <button
    type="button"
    class="w-full border-2 border-dashed rounded-lg p-8 text-center hover:bg-accent transition-colors"
    disabled={uploading}
    onclick={() => fileInput.click()}
  >
    {#if uploading}
      <span>アップロード中...</span>
    {:else}
      <span>📷 写真を選ぶ（複数可）</span>
    {/if}
  </button>
</div>
