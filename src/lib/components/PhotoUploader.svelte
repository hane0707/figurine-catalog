<!-- src/lib/components/PhotoUploader.svelte -->
<script lang="ts">
  import { resizeImage } from '$lib/utils/image';
  import { generateId } from '$lib/utils/uuid';
  import { toast } from 'svelte-sonner';

  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

  let {
    itemId,
    itemCreated,
    onUploaded,
    onSystemError,
  }: {
    itemId: string;
    itemCreated: boolean;
    onUploaded: (
      photo: { id: string; r2KeyOrig: string; r2KeyThumb: string; thumbViewUrl: string },
      isFirst: boolean,
    ) => void;
    onSystemError: () => void;
  } = $props();

  let uploading = $state(false);
  let fileInput: HTMLInputElement;

  function classifyError(e: unknown, status?: number): 'system' | 'file' {
    if (e instanceof TypeError) return 'system';
    if (status === 413) return 'file';
    if (status === 403 || (status !== undefined && status >= 500)) return 'system';
    return 'system';
  }

  async function uploadWithRetry(url: string, blob: Blob, maxRetries = 3): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const res = await fetch(url, {
          method: 'PUT',
          body: blob,
          headers: { 'Content-Type': blob.type },
        });
        if (res.ok) return;
        const err = new Error(`HTTP ${res.status}`);
        (err as any).status = res.status;
        throw err;
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
      // ファイルサイズチェック（ファイル固有エラー）
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} はサイズが大きすぎます（上限20MB）`);
        continue;
      }

      const photoId = generateId();
      try {
        const presignRes = await fetch('/api/photos/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId, photoId, contentType: file.type }),
        });
        if (!presignRes.ok) {
          const err = new Error(`HTTP ${presignRes.status}`);
          (err as any).status = presignRes.status;
          throw err;
        }
        const { origUrl, thumbUrl, origKey, thumbKey, thumbViewUrl } =
          (await presignRes.json()) as {
            origUrl: string;
            thumbUrl: string;
            origKey: string;
            thumbKey: string;
            thumbViewUrl: string;
          };

        const thumb = await resizeImage(file, 400);

        await Promise.all([uploadWithRetry(origUrl, file), uploadWithRetry(thumbUrl, thumb)]);

        onUploaded(
          { id: photoId, r2KeyOrig: origKey, r2KeyThumb: thumbKey, thumbViewUrl },
          !itemCreated,
        );
      } catch (e) {
        const status = (e as any)?.status as number | undefined;
        const kind = classifyError(e, status);
        console.error(`[PhotoUploader] ${file.name} upload failed (${kind}):`, e);
        if (kind === 'system') {
          onSystemError();
          break; // システムエラーは以降も失敗するため中断
        } else {
          toast.error(`${file.name} のアップロードに失敗しました`);
        }
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
