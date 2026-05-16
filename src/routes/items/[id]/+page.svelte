<!-- src/routes/items/[id]/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { toast } from 'svelte-sonner';
  import { invalidateAll } from '$app/navigation';
  import TagPicker from '$lib/components/TagPicker.svelte';
  import PhotoUploader from '$lib/components/PhotoUploader.svelte';
  import GlitchText from '$lib/components/GlitchText.svelte';
  import { itemWriteSchema, purchaseInfoSchema, handmadeInfoBaseSchema, handmadeInfoSchema } from '$lib/validation/schemas';

  let { data }: { data: PageData } = $props();
  let item = $derived(data.item);
  let displayName = $derived(item.name ?? '名称未設定');

  let editing = $state(false);
  let saving = $state(false);

  let editName = $state('');
  let editSeries = $state('');
  let editIsPublic = $state(0);
  let editPurchaseInfoPublic = $state(0);
  let editHandmadeInfoPublic = $state(0);
  let editStatus = $state('owned');
  let editIsHandmade = $state<number | null>(null);
  let editStoreName = $state('');
  let editEventName = $state('');
  let editPurchaseDate = $state('');
  let editPurchasePrice = $state('');
  let editMaker = $state('');
  let editArtistName = $state('');
  let editProductionStart = $state('');
  let editProductionEnd = $state('');
  let editNotes = $state('');
  let editQuote = $state('');
  let editTags = $state<{ id: string; name: string }[]>([]);
  let editMaterials = $state<{ id: string; name: string }[]>([]);
  let editPhotos = $state<Array<{ id: string; thumbUrl: string; isCover: number }>>([]);

  let editNameError = $state('');
  let editSeriesError = $state('');
  let editStoreNameError = $state('');
  let editEventNameError = $state('');
  let editPurchaseDateError = $state('');
  let editPurchasePriceError = $state('');
  let editMakerError = $state('');
  let editArtistNameError = $state('');
  let editProductionStartError = $state('');
  let editProductionEndError = $state('');
  let editQuoteError = $state('');
  let editNotesError = $state('');

  function validateEditField<T>(schema: import('zod').ZodType<T>, value: T): string {
    const r = schema.safeParse(value);
    return r.success ? '' : (r.error.issues[0]?.message ?? '入力値が不正です');
  }

  function validateEditName() { editNameError = validateEditField(itemWriteSchema.shape.name, editName || null); }
  function validateEditSeries() { editSeriesError = validateEditField(itemWriteSchema.shape.series, editSeries || null); }
  function validateEditStoreName() { editStoreNameError = validateEditField(purchaseInfoSchema.shape.storeName, editStoreName || null); }
  function validateEditEventName() { editEventNameError = validateEditField(purchaseInfoSchema.shape.eventName, editEventName || null); }
  function validateEditPurchaseDate() { editPurchaseDateError = validateEditField(purchaseInfoSchema.shape.purchaseDate, editPurchaseDate || null); }
  function validateEditPurchasePrice() {
    const v = editPurchasePrice ? Number(editPurchasePrice) : null;
    editPurchasePriceError = validateEditField(purchaseInfoSchema.shape.purchasePrice, v);
  }
  function validateEditMaker() { editMakerError = validateEditField(purchaseInfoSchema.shape.maker, editMaker || null); }
  function validateEditArtistName() { editArtistNameError = validateEditField(purchaseInfoSchema.shape.artistName, editArtistName || null); }
  function validateEditProductionStart() { editProductionStartError = validateEditField(handmadeInfoBaseSchema.shape.productionStart, editProductionStart || null); validateEditProductionEnd(); }
  function validateEditProductionEnd() {
    const r = handmadeInfoSchema.safeParse({
      productionStart: editProductionStart || null,
      productionEnd: editProductionEnd || null,
    });
    editProductionEndError = r.success ? '' : (r.error.issues.find(e => e.path[0] === 'productionEnd')?.message ?? '');
  }
  function validateEditQuote() { editQuoteError = validateEditField(handmadeInfoBaseSchema.shape.quote, editQuote || null); }
  function validateEditNotes() { editNotesError = validateEditField(handmadeInfoBaseSchema.shape.notes, editNotes || null); }

  function hasEditErrors(): boolean {
    return !![editNameError, editSeriesError, editStoreNameError, editEventNameError,
      editPurchaseDateError, editPurchasePriceError, editMakerError, editArtistNameError,
      editProductionStartError, editProductionEndError, editQuoteError, editNotesError].find(Boolean);
  }

  function startEdit() {
    editName = item.name ?? '';
    editSeries = item.series ?? '';
    editIsPublic = item.isPublic;
    editPurchaseInfoPublic = item.purchaseInfoPublic;
    editHandmadeInfoPublic = item.handmadeInfoPublic;
    editStatus = item.status;
    editIsHandmade = item.isHandmade;
    editStoreName = item.purchaseInfo?.storeName ?? '';
    editEventName = item.purchaseInfo?.eventName ?? '';
    editPurchaseDate = item.purchaseInfo?.purchaseDate ?? '';
    editPurchasePrice = item.purchaseInfo?.purchasePrice?.toString() ?? '';
    editMaker = item.purchaseInfo?.maker ?? '';
    editArtistName = item.purchaseInfo?.artistName ?? '';
    editProductionStart = item.handmadeInfo?.productionStart ?? '';
    editProductionEnd = item.handmadeInfo?.productionEnd ?? '';
    editNotes = item.handmadeInfo?.notes ?? '';
    editQuote = item.handmadeInfo?.quote ?? '';
    editTags = item.itemTags?.map((t: any) => t.tag) ?? [];
    editMaterials = item.itemMaterials?.map((m: any) => m.material) ?? [];
    editPhotos = item.photos.map((p: any) => ({ id: p.id, thumbUrl: p.thumbUrl, isCover: p.isCover }));
    editing = true;
  }

  async function saveEdit() {
    saving = true;
    validateEditName(); validateEditSeries();
    if (editIsHandmade === 0) {
      validateEditStoreName(); validateEditEventName(); validateEditPurchaseDate();
      validateEditPurchasePrice(); validateEditMaker(); validateEditArtistName();
    } else if (editIsHandmade === 1) {
      validateEditProductionStart(); validateEditProductionEnd(); validateEditQuote(); validateEditNotes();
    }
    if (hasEditErrors()) { saving = false; return; }
    try {
      const body: Record<string, unknown> = {
        name: editName || null,
        series: editSeries || null,
        isPublic: editIsPublic,
        purchaseInfoPublic: editPurchaseInfoPublic,
        handmadeInfoPublic: editHandmadeInfoPublic,
        status: editStatus,
        isHandmade: editIsHandmade,
        tagIds: editTags.map((t) => t.id),
      };
      if (editIsHandmade === 0) {
        body.purchaseInfo = {
          storeName: editStoreName || null,
          eventName: editEventName || null,
          purchaseDate: editPurchaseDate || null,
          purchasePrice: editPurchasePrice ? Number(editPurchasePrice) : null,
          maker: editMaker || null,
          artistName: editArtistName || null,
        };
      } else if (editIsHandmade === 1) {
        body.handmadeInfo = {
          productionStart: editProductionStart || null,
          productionEnd: editProductionEnd || null,
          quote: editQuote || null,
          notes: editNotes || null,
        };
        body.materialIds = editMaterials.map((m) => m.id);
      }
      const res = await fetch(`/api/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`保存失敗: ${res.status}`);
      await invalidateAll();
      editing = false;
      toast.success('保存しました');
    } catch (e) {
      toast.error('保存に失敗しました');
      console.error(e);
    } finally {
      saving = false;
    }
  }

  async function createTag(tagName: string): Promise<{ id: string; name: string }> {
    const res = await fetch('/api/tags', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: tagName }),
    });
    if (!res.ok) throw new Error(`タグ作成失敗: ${res.status}`);
    return (await res.json()) as { id: string; name: string };
  }

  async function createMaterial(materialName: string): Promise<{ id: string; name: string }> {
    const res = await fetch('/api/materials', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: materialName }),
    });
    if (!res.ok) throw new Error(`素材作成失敗: ${res.status}`);
    return (await res.json()) as { id: string; name: string };
  }

  async function deleteEditPhoto(photoId: string) {
    try {
      const res = await fetch(`/api/photos/${photoId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`削除失敗: ${res.status}`);
      editPhotos = editPhotos.filter((p) => p.id !== photoId);
    } catch (e) {
      toast.error('写真の削除に失敗しました');
      console.error(e);
    }
  }

  async function setCover(photoId: string) {
    if (editPhotos.find((p) => p.id === photoId)?.isCover === 1) return;
    try {
      const res = await fetch(`/api/photos/${photoId}`, { method: 'PATCH' });
      if (!res.ok) throw new Error(`カバー変更失敗: ${res.status}`);
      editPhotos = editPhotos.map((p) => ({ ...p, isCover: p.id === photoId ? 1 : 0 }));
    } catch (e) {
      toast.error('カバー写真の変更に失敗しました');
      console.error(e);
    }
  }

  async function handlePhotoUploaded(
    photo: { id: string; r2KeyOrig: string; r2KeyThumb: string; thumbViewUrl: string },
  ) {
    try {
      const res = await fetch(`/api/photos/${photo.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, r2KeyOrig: photo.r2KeyOrig, r2KeyThumb: photo.r2KeyThumb }),
      });
      if (!res.ok) throw new Error(`登録失敗: ${res.status}`);
      editPhotos = [...editPhotos, { id: photo.id, thumbUrl: photo.thumbViewUrl, isCover: 0 }];
    } catch (e) {
      toast.error('写真の追加に失敗しました');
      console.error(e);
    }
  }

  async function deleteItem() {
    if (!confirm('削除しますか？写真も削除されます。')) return;
    try {
      const res = await fetch(`/api/items/${item.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`削除失敗: ${res.status}`);
      location.href = '/items';
    } catch (e) {
      toast.error('削除に失敗しました');
      console.error(e);
    }
  }

  let coverPhoto = $derived(item.photos.find((p: any) => p.isCover) ?? item.photos[0]);
  let selectedPhoto = $state<typeof coverPhoto | undefined>(undefined);
  $effect(() => { selectedPhoto = coverPhoto; });
  let otherPhotos = $derived(item.photos.filter((p: any) => p !== selectedPhoto).slice(0, 3));
  const kindLabel = $derived(item.isHandmade === 1 ? 'Handmade' : item.isHandmade === 0 ? 'Collected' : 'Item');
</script>

<svelte:head>
  <title>{item.name ?? '名称未設定'} — Haku's suitcase</title>
</svelte:head>

<div class="detail-page">
  <!-- ページアクション（編集・削除） -->
  {#if data.user}
    <div class="page-actions">
      {#if !editing}
        <button class="btn --ghost --danger" onclick={deleteItem}>削除</button>
        <button class="btn --primary" onclick={startEdit}>編集</button>
      {:else}
        <button class="btn --ghost" onclick={() => (editing = false)}>キャンセル</button>
        <button class="btn --primary" disabled={saving || hasEditErrors()} onclick={saveEdit}>
          {saving ? '保存中...' : '保存'}
        </button>
      {/if}
    </div>
  {/if}

  <!-- 2カラムレイアウト -->
  <div class="detail-layout">
    <!-- 左：画像パネル -->
    <div class="detail-img-panel">
      {#if selectedPhoto}
        <img src={selectedPhoto.thumbUrl} alt={item.name ?? ''} />
        <div class="overlay-tag">
          {kindLabel} · {item.createdAt?.slice(0, 10) ?? ''}
        </div>
        {#if otherPhotos.length > 0}
          <div class="thumbs">
            {#each otherPhotos as photo}
              <button
                class="t"
                onclick={() => (selectedPhoto = photo)}
                style="background:none; border:none; padding:0; cursor:pointer"
              >
                <img src={photo.thumbUrl} alt="" />
              </button>
            {/each}
          </div>
        {/if}
      {:else}
        <div style="width:100%; height:100%; display:grid; place-items:center; background:var(--bg-sunk)">
          <span style="font-family:var(--f-display); font-size:72px; opacity:0.15; color:var(--fg)">✦</span>
        </div>
        <div class="overlay-tag">{kindLabel}</div>
      {/if}
    </div>

    <!-- 右：情報パネル -->
    <div class="detail-info-panel">
      {#if !editing}
        <!-- 表示モード -->
        <div>
          <h1 style="display:flex; align-items:center; gap:8px">
            <GlitchText segments={[
              { text: displayName[0], stain: true, large: true },
              { text: displayName.slice(1) }
            ]} />
            {#if data.user && !item.isPublic}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                   style="color:var(--fg-mute); flex-shrink:0; margin-top:2px">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            {/if}
          </h1>
          {#if item.series}<p class="series">{item.series}</p>{/if}
          {#if item.status === 'parted'}
            <span style="display:inline-block; margin-top:8px; font-family:var(--f-mono); font-size:10px; letter-spacing:0.12em; padding:4px 12px; border-radius:var(--r-pill); background:var(--bg-sunk); box-shadow:var(--neu-inset); color:var(--fg-soft)">
              PARTED
            </span>
          {/if}
        </div>

        <!-- タグ -->
        {#if item.itemTags?.length}
          <div class="tag-list">
            {#each item.itemTags as t, i}
              <span class={'tag ' + (i % 2 === 0 ? '--amber' : '--haze')}>{(t as any).tag.name}</span>
            {/each}
          </div>
        {/if}

        <!-- 台詞ブロック（自作品かつ quote あり） -->
        {#if item.isHandmade === 1 && item.handmadeInfo?.quote}
          <div class="quote-block">
            &ldquo;{item.handmadeInfo.quote}&rdquo;
          </div>
        {/if}

        <!-- 購入情報 -->
        {#if item.isHandmade === 0 && item.purchaseInfo}
          <div>
            <div class="eyebrow" style="margin-bottom:10px">Acquisition</div>
            <dl class="meta-grid">
              <dt>Source</dt><dd>{item.purchaseInfo.storeName || item.purchaseInfo.eventName || '—'}</dd>
              <dt>Date</dt><dd>{item.purchaseInfo.purchaseDate ?? '—'}</dd>
              <dt>Price</dt><dd class="mono">{item.purchaseInfo.purchasePrice != null ? '¥' + item.purchaseInfo.purchasePrice.toLocaleString() : '—'}</dd>
              <dt>Maker</dt><dd>{item.purchaseInfo.maker ?? '—'}</dd>
              <dt>Artist</dt><dd>{item.purchaseInfo.artistName ?? '—'}</dd>
            </dl>
          </div>
        {/if}

        <!-- 制作情報 -->
        {#if item.isHandmade === 1 && item.handmadeInfo}
          <div>
            <div class="eyebrow" style="margin-bottom:10px">Production</div>
            <dl class="meta-grid">
              <dt>Started</dt><dd>{item.handmadeInfo.productionStart ?? '—'}</dd>
              <dt>Finished</dt><dd>{item.handmadeInfo.productionEnd ?? '—'}</dd>
              {#if item.itemMaterials?.length}
                <dt>Materials</dt><dd>{item.itemMaterials.map((m: any) => m.material.name).join(' · ')}</dd>
              {/if}
            </dl>
            {#if item.handmadeInfo.notes}
              <div style="margin-top:14px; font-size:13px; line-height:1.7; white-space:pre-wrap; color:var(--fg-mute)">{item.handmadeInfo.notes}</div>
            {/if}
          </div>
        {/if}

      {:else}
        <!-- 編集モード -->
        <div class="edit-panel">
          <div class="edit-section">
            <div class="edit-section-title">写真</div>
            {#if editPhotos.length > 0}
              <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(80px, 1fr)); gap:8px; margin-bottom:12px">
                {#each editPhotos as photo (photo.id)}
                  <div style="position:relative; aspect-ratio:1; border-radius:var(--r-sm); overflow:hidden; box-shadow:var(--neu-soft); border:{photo.isCover ? '2px solid var(--accent-haze)' : '2px solid transparent'}">
                    <button
                      type="button"
                      onclick={() => setCover(photo.id)}
                      style="position:absolute; inset:0; background:none; border:none; padding:0; cursor:pointer; display:block; width:100%; height:100%"
                    >
                      <img src={photo.thumbUrl} alt="" style="width:100%; height:100%; object-fit:cover; display:block" />
                    </button>
                    {#if photo.isCover}
                      <div style="position:absolute; top:4px; left:4px; background:var(--accent-haze); color:#fff; font-family:var(--f-mono); font-size:9px; letter-spacing:0.08em; padding:2px 5px; border-radius:3px; pointer-events:none">COVER</div>
                    {/if}
                    <button
                      type="button"
                      onclick={(e) => { e.stopPropagation(); deleteEditPhoto(photo.id); }}
                      style="position:absolute; top:4px; right:4px; width:20px; height:20px; border-radius:50%; background:rgba(0,0,0,0.6); color:#fff; border:none; cursor:pointer; display:grid; place-items:center; font-size:12px; line-height:1; padding:0"
                    >×</button>
                  </div>
                {/each}
              </div>
            {/if}
            <PhotoUploader
              itemId={item.id}
              itemCreated={true}
              onUploaded={handlePhotoUploaded}
              onSystemError={() => toast.error('アップロードに失敗しました')}
            />
          </div>

          <div class="edit-section">
            <div class="edit-section-title">基本情報</div>
            <div class="edit-field">
              <label>Name</label>
              <input type="text" bind:value={editName} placeholder="名前" onblur={validateEditName} />
              {#if editNameError}<p class="field-error">{editNameError}</p>{/if}
            </div>
            <div class="edit-field">
              <label>Series</label>
              <input type="text" bind:value={editSeries} placeholder="シリーズ名" onblur={validateEditSeries} />
              {#if editSeriesError}<p class="field-error">{editSeriesError}</p>{/if}
            </div>
          </div>

          <div class="edit-section">
            <div class="edit-section-title">種別</div>
            <div class="kind-picker">
              <button class={'kind-btn ' + (editIsHandmade === 0 ? '--active' : '')} onclick={() => (editIsHandmade = 0)}>
                <div class="kind-btn-label">購入品</div>
                <div class="kind-btn-desc">店舗・イベントで入手</div>
              </button>
              <button class={'kind-btn ' + (editIsHandmade === 1 ? '--active' : '')} onclick={() => (editIsHandmade = 1)}>
                <div class="kind-btn-label">自作品</div>
                <div class="kind-btn-desc">造形・塗装・制作</div>
              </button>
            </div>
          </div>

          {#if editIsHandmade === 0}
            <div class="edit-section">
              <div class="edit-section-title">購入情報</div>
              <div class="edit-field">
                <label>Store / Shop</label>
                <input type="text" bind:value={editStoreName} placeholder="店舗名・ECサイト名" onblur={validateEditStoreName} />
                {#if editStoreNameError}<p class="field-error">{editStoreNameError}</p>{/if}
              </div>
              <div class="edit-field">
                <label>Event</label>
                <input type="text" bind:value={editEventName} placeholder="イベント名" onblur={validateEditEventName} />
                {#if editEventNameError}<p class="field-error">{editEventNameError}</p>{/if}
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px">
                <div class="edit-field">
                  <label>Date</label>
                  <input type="date" bind:value={editPurchaseDate} onblur={validateEditPurchaseDate} />
                  {#if editPurchaseDateError}<p class="field-error">{editPurchaseDateError}</p>{/if}
                </div>
                <div class="edit-field">
                  <label>Price ¥</label>
                  <input type="number" bind:value={editPurchasePrice} placeholder="金額" onblur={validateEditPurchasePrice} />
                  {#if editPurchasePriceError}<p class="field-error">{editPurchasePriceError}</p>{/if}
                </div>
              </div>
              <div class="edit-field">
                <label>Maker</label>
                <input type="text" bind:value={editMaker} placeholder="メーカー名" onblur={validateEditMaker} />
                {#if editMakerError}<p class="field-error">{editMakerError}</p>{/if}
              </div>
              <div class="edit-field">
                <label>Artist</label>
                <input type="text" bind:value={editArtistName} placeholder="作家名・原型師名" onblur={validateEditArtistName} />
                {#if editArtistNameError}<p class="field-error">{editArtistNameError}</p>{/if}
              </div>
            </div>
          {:else if editIsHandmade === 1}
            <div class="edit-section">
              <div class="edit-section-title">制作情報</div>
              <div class="edit-field">
                <label>Quote</label>
                <textarea bind:value={editQuote} placeholder="台詞・印象的なセリフ" rows={2} onblur={validateEditQuote}></textarea>
                {#if editQuoteError}<p class="field-error">{editQuoteError}</p>{/if}
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px">
                <div class="edit-field">
                  <label>Started</label>
                  <input type="date" bind:value={editProductionStart} onblur={validateEditProductionStart} />
                  {#if editProductionStartError}<p class="field-error">{editProductionStartError}</p>{/if}
                </div>
                <div class="edit-field">
                  <label>Finished</label>
                  <input type="date" bind:value={editProductionEnd} onblur={validateEditProductionEnd} />
                  {#if editProductionEndError}<p class="field-error">{editProductionEndError}</p>{/if}
                </div>
              </div>
              <div class="edit-field">
                <label>Materials</label>
                <TagPicker bind:selected={editMaterials} suggestions={data.materials.all} frequent={data.materials.frequent} placeholder="素材を追加..." onCreate={createMaterial} />
              </div>
              <div class="edit-field">
                <label>Notes</label>
                <textarea bind:value={editNotes} placeholder="制作メモ・塗装記録" rows={3} onblur={validateEditNotes}></textarea>
                {#if editNotesError}<p class="field-error">{editNotesError}</p>{/if}
              </div>
            </div>
          {/if}

          <div class="edit-section">
            <div class="edit-section-title">タグ</div>
            <TagPicker bind:selected={editTags} suggestions={data.allTags} frequent={[]} placeholder="タグを追加..." onCreate={createTag} />
          </div>

          <div class="edit-section">
            <div class="edit-section-title">公開設定 / ステータス</div>
            <label class="edit-check">
              <input type="checkbox" checked={editIsPublic === 1} onchange={(e) => (editIsPublic = e.currentTarget.checked ? 1 : 0)} />
              このアイテムを公開する
            </label>
            {#if editIsPublic === 1}
              {#if editIsHandmade === 0}
                <label class="edit-check" style="margin-left:16px; color:var(--fg-mute)">
                  <input type="checkbox" checked={editPurchaseInfoPublic === 1} onchange={(e) => (editPurchaseInfoPublic = e.currentTarget.checked ? 1 : 0)} />
                  購入情報も公開する
                </label>
              {:else if editIsHandmade === 1}
                <label class="edit-check" style="margin-left:16px; color:var(--fg-mute)">
                  <input type="checkbox" checked={editHandmadeInfoPublic === 1} onchange={(e) => (editHandmadeInfoPublic = e.currentTarget.checked ? 1 : 0)} />
                  制作情報も公開する
                </label>
              {/if}
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- 全写真グリッド -->
  {#if item.photos.length > 1}
    <div style="margin-top:48px">
      <div class="eyebrow" style="margin-bottom:16px">All Photos</div>
      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(120px, 1fr)); gap:12px">
        {#each item.photos as photo}
          <button
            onclick={() => (selectedPhoto = photo)}
            style="aspect-ratio:1; border-radius:var(--r-sm); overflow:hidden; box-shadow:var(--neu-soft); background:none; border:none; padding:0; cursor:pointer; display:block; width:100%"
          >
            <img src={photo.thumbUrl} alt="" style="width:100%; height:100%; object-fit:cover; display:block" />
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .page-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-bottom: 24px;
  }

  .quote-block {
    font-size: 1.2rem;
    font-style: italic;
    line-height: 1.65;
    color: var(--fg-mute);
    overflow-wrap: break-word;
    word-break: break-word;
  }
</style>
