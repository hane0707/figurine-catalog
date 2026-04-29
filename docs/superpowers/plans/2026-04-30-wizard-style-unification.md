# 新規登録ウィザード スタイル統一 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新規登録ウィザードと SummaryCard の Tailwind ユーティリティクラスを、app.css 定義済みのプロジェクト CSS クラス・CSS 変数に置き換えて編集ページと視覚的に統一する。

**Architecture:** ロジック・構造の変更なし。Tailwind クラスをプロジェクト CSS（`.field`、`.type-picker`、`.type-card`、`.btn`）と CSS 変数（`var(--surface)`、`var(--fg-mute)` 等）に差し替えるのみ。ヘッダー行・プログレスバー・ステップバッジ等の純粋レイアウト要素は Tailwind のまま維持。

**Tech Stack:** SvelteKit 5 (runes)、app.css（プロジェクト独自 CSS）

---

## ファイルマップ

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `src/routes/items/new/+page.svelte` | 修正 | photo/basic/type/details/tags 各ステップのクラス置き換え |
| `src/lib/components/SummaryCard.svelte` | 修正 | 全 Tailwind クラスを CSS 変数 inline style + `.eyebrow` に置き換え |

---

### Task 1: photo ステップ・basic ステップのスタイル更新

**Files:**
- Modify: `src/routes/items/new/+page.svelte`

- [ ] **Step 1: photo ステップのボタンと写真グリッドを置き換える**

`src/routes/items/new/+page.svelte` の photo ステップ（`{#if step === 'photo'}` ブロック）内の以下を変更する:

**変更前（photo ステップ末尾のボタン行）:**
```svelte
    <div class="mt-4 flex gap-2">
      <button class="flex-1 border rounded-lg py-2" onclick={() => (step = 'basic')}>スキップ</button>
      {#if uploadedPhotos.length > 0}
        <button
          class="flex-1 bg-primary text-primary-foreground rounded-lg py-2"
          onclick={() => (step = 'basic')}
        >次へ →</button>
      {/if}
    </div>
```

**変更後:**
```svelte
    <div style="margin-top:16px; display:flex; gap:10px">
      <button class="btn --ghost" onclick={() => (step = 'basic')}>スキップ</button>
      {#if uploadedPhotos.length > 0}
        <button class="btn --primary" onclick={() => (step = 'basic')}>次へ →</button>
      {/if}
    </div>
```

また、写真サムネイルグリッドも置き換える:

**変更前:**
```svelte
      <div class="mt-3 grid grid-cols-4 gap-2">
        {#each uploadedPhotos as photo}
          <div class="aspect-square rounded-lg overflow-hidden bg-muted">
            <img src={photo.thumbViewUrl} alt="" class="w-full h-full object-cover" />
          </div>
        {/each}
      </div>
```

**変更後:**
```svelte
      <div style="margin-top:12px; display:grid; grid-template-columns:repeat(4,1fr); gap:8px">
        {#each uploadedPhotos as photo}
          <div style="aspect-ratio:1; border-radius:var(--radius-sm); overflow:hidden; background:var(--bg-sunk)">
            <img src={photo.thumbViewUrl} alt="" style="width:100%; height:100%; object-fit:cover; display:block" />
          </div>
        {/each}
      </div>
```

- [ ] **Step 2: basic ステップの入力フォームとボタンを置き換える**

`{:else if step === 'basic'}` ブロック全体を以下に置き換える:

**変更前:**
```svelte
  {:else if step === 'basic'}
    <h2 class="text-lg font-semibold mb-4">名前・シリーズ名</h2>
    <div class="space-y-3">
      <input
        bind:value={name}
        placeholder="アイテム名（スキップ可）"
        class="w-full border rounded-lg px-3 py-2 bg-background text-foreground"
      />
      <input
        bind:value={series}
        placeholder="シリーズ名（スキップ可）"
        class="w-full border rounded-lg px-3 py-2 bg-background text-foreground"
      />
    </div>
    <div class="mt-4 flex gap-2">
      <button class="flex-1 border rounded-lg py-2" onclick={() => (step = 'photo')}>← 戻る</button>
      <button
        class="flex-1 bg-primary text-primary-foreground rounded-lg py-2"
        onclick={() => (step = 'type')}
      >次へ →</button>
    </div>
```

**変更後:**
```svelte
  {:else if step === 'basic'}
    <h2 style="margin-bottom:16px">名前・シリーズ名</h2>
    <div style="display:flex; flex-direction:column; gap:12px">
      <div class="field">
        <label>Name</label>
        <input bind:value={name} placeholder="アイテム名（スキップ可）" />
      </div>
      <div class="field">
        <label>Series</label>
        <input bind:value={series} placeholder="シリーズ名（スキップ可）" />
      </div>
    </div>
    <div style="margin-top:16px; display:flex; gap:10px">
      <button class="btn --ghost" onclick={() => (step = 'photo')}>← 戻る</button>
      <button class="btn --primary" onclick={() => (step = 'type')}>次へ →</button>
    </div>
```

- [ ] **Step 3: コミット**

```bash
git add src/routes/items/new/+page.svelte
git commit -m "style: 新規登録ウィザードのphoto・basicステップをプロジェクトCSSに統一"
```

---

### Task 2: type ステップのスタイル更新

**Files:**
- Modify: `src/routes/items/new/+page.svelte`

- [ ] **Step 1: 種別ピッカーを `.type-picker` + `.type-card` に置き換える**

`{:else if step === 'type'}` ブロック全体を以下に置き換える:

**変更前:**
```svelte
  {:else if step === 'type'}
    <h2 class="text-lg font-semibold mb-4">購入品？自作品？</h2>
    <div class="space-y-3">
      <button
        class="w-full border rounded-xl p-4 text-left hover:bg-accent {isHandmade === 0
          ? 'border-primary'
          : ''}"
        onclick={() => {
          isHandmade = 0;
          step = 'details';
        }}
      >
        🛒 <strong>購入品</strong><br /><span class="text-sm text-muted-foreground"
          >店舗・EC・イベントで入手</span
        >
      </button>
      <button
        class="w-full border rounded-xl p-4 text-left hover:bg-accent {isHandmade === 1
          ? 'border-primary'
          : ''}"
        onclick={() => {
          isHandmade = 1;
          step = 'details';
        }}
      >
        🎨 <strong>自作品</strong><br /><span class="text-sm text-muted-foreground"
          >造形・塗装・改造など</span
        >
      </button>
    </div>
    <div class="mt-4 flex gap-2">
      <button class="flex-1 border rounded-lg py-2" onclick={() => (step = 'basic')}>← 戻る</button>
      <button class="flex-1 border rounded-lg py-2" onclick={() => (step = 'tags')}>スキップ</button>
    </div>
```

**変更後:**
```svelte
  {:else if step === 'type'}
    <h2 style="margin-bottom:16px">購入品？自作品？</h2>
    <div class="type-picker">
      <button
        class={'type-card --bought ' + (isHandmade === 0 ? '--active' : '')}
        onclick={() => { isHandmade = 0; step = 'details'; }}
      >
        <div class="mark"></div>
        <h4>購入品</h4>
        <p>店舗・EC・イベントで入手</p>
      </button>
      <button
        class={'type-card --handmade ' + (isHandmade === 1 ? '--active' : '')}
        onclick={() => { isHandmade = 1; step = 'details'; }}
      >
        <div class="mark"></div>
        <h4>自作品</h4>
        <p>造形・塗装・改造など</p>
      </button>
    </div>
    <div style="margin-top:16px; display:flex; gap:10px">
      <button class="btn --ghost" onclick={() => (step = 'basic')}>← 戻る</button>
      <button class="btn --ghost" onclick={() => (step = 'tags')}>スキップ</button>
    </div>
```

- [ ] **Step 2: コミット**

```bash
git add src/routes/items/new/+page.svelte
git commit -m "style: 新規登録ウィザードのtypeステップをtype-card/type-pickerに統一"
```

---

### Task 3: details ステップのスタイル更新

**Files:**
- Modify: `src/routes/items/new/+page.svelte`

- [ ] **Step 1: 購入品フォームを `.field` ラッパーに置き換える**

`{:else if step === 'details'}` ブロック内の購入品ブロック（`{#if isHandmade === 0}` 〜 `{:else}`）を以下に置き換える:

**変更前:**
```svelte
    {#if isHandmade === 0}
      <h2 class="text-lg font-semibold mb-4">購入情報</h2>
      <div class="space-y-3">
        <input
          bind:value={storeName}
          placeholder="店舗名 / ECサイト名"
          class="w-full border rounded-lg px-3 py-2 bg-background text-foreground"
        />
        <input
          bind:value={eventName}
          placeholder="イベント名（例: ワンフェス2024夏）"
          class="w-full border rounded-lg px-3 py-2 bg-background text-foreground"
        />
        <div class="flex gap-2">
          <input
            bind:value={purchaseDate}
            type="date"
            class="flex-1 border rounded-lg px-3 py-2 bg-background text-foreground"
          />
          <input
            bind:value={purchasePrice}
            type="number"
            placeholder="金額 ¥"
            class="flex-1 border rounded-lg px-3 py-2 bg-background text-foreground"
          />
        </div>
        <input
          bind:value={maker}
          placeholder="メーカー名"
          class="w-full border rounded-lg px-3 py-2 bg-background text-foreground"
        />
        <input
          bind:value={artistName}
          placeholder="作家名・原型師名"
          class="w-full border rounded-lg px-3 py-2 bg-background text-foreground"
        />
      </div>
```

**変更後:**
```svelte
    {#if isHandmade === 0}
      <h2 style="margin-bottom:16px">購入情報</h2>
      <div style="display:flex; flex-direction:column; gap:12px">
        <div class="field">
          <label>Store / Shop</label>
          <input bind:value={storeName} placeholder="店舗名 / ECサイト名" />
        </div>
        <div class="field">
          <label>Event</label>
          <input bind:value={eventName} placeholder="イベント名（例: ワンフェス2024夏）" />
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px">
          <div class="field">
            <label>Date</label>
            <input bind:value={purchaseDate} type="date" />
          </div>
          <div class="field">
            <label>Price ¥</label>
            <input bind:value={purchasePrice} type="number" placeholder="金額" />
          </div>
        </div>
        <div class="field">
          <label>Maker</label>
          <input bind:value={maker} placeholder="メーカー名" />
        </div>
        <div class="field">
          <label>Artist</label>
          <input bind:value={artistName} placeholder="作家名・原型師名" />
        </div>
      </div>
```

- [ ] **Step 2: 自作品フォームを `.field` ラッパーに置き換える**

`{:else}` ブロック（自作品）を以下に置き換える:

**変更前:**
```svelte
    {:else}
      <h2 class="text-lg font-semibold mb-4">制作情報</h2>
      <div class="space-y-3">
        <textarea
          bind:value={quote}
          placeholder="台詞・印象的なセリフ（スキップ可）"
          rows={2}
          class="w-full border rounded-lg px-3 py-2 bg-background text-foreground resize-none"
        ></textarea>
        <div class="flex gap-2">
          <input
            bind:value={productionStart}
            type="date"
            class="flex-1 border rounded-lg px-3 py-2 bg-background text-foreground"
          />
          <input
            bind:value={productionEnd}
            type="date"
            class="flex-1 border rounded-lg px-3 py-2 bg-background text-foreground"
          />
        </div>
        <div>
          <p class="text-sm text-muted-foreground mb-2">使用素材</p>
          <TagPicker
            bind:selected={selectedMaterials}
            suggestions={data.materials.all}
            frequent={data.materials.frequent}
            placeholder="素材を追加..."
            onCreate={createMaterial}
          />
        </div>
        <textarea
          bind:value={notes}
          placeholder="制作メモ・塗装記録（自由記述）"
          rows={4}
          class="w-full border rounded-lg px-3 py-2 bg-background text-foreground resize-none"
        ></textarea>
      </div>
    {/if}
```

**変更後:**
```svelte
    {:else}
      <h2 style="margin-bottom:16px">制作情報</h2>
      <div style="display:flex; flex-direction:column; gap:12px">
        <div class="field">
          <label>Quote</label>
          <textarea bind:value={quote} placeholder="台詞・印象的なセリフ（スキップ可）" rows={2}></textarea>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px">
          <div class="field">
            <label>Started</label>
            <input bind:value={productionStart} type="date" />
          </div>
          <div class="field">
            <label>Finished</label>
            <input bind:value={productionEnd} type="date" />
          </div>
        </div>
        <div class="field">
          <label>Materials</label>
          <TagPicker
            bind:selected={selectedMaterials}
            suggestions={data.materials.all}
            frequent={data.materials.frequent}
            placeholder="素材を追加..."
            onCreate={createMaterial}
          />
        </div>
        <div class="field">
          <label>Notes</label>
          <textarea bind:value={notes} placeholder="制作メモ・塗装記録（自由記述）" rows={4}></textarea>
        </div>
      </div>
    {/if}
```

- [ ] **Step 3: details ステップのナビゲーションボタンを置き換える**

details ステップ末尾のボタン行を置き換える:

**変更前:**
```svelte
    <div class="mt-4 flex gap-2">
      <button class="flex-1 border rounded-lg py-2" onclick={() => (step = 'type')}>← 戻る</button>
      <button
        class="flex-1 bg-primary text-primary-foreground rounded-lg py-2"
        onclick={() => (step = 'tags')}
      >次へ →</button>
    </div>
```

**変更後:**
```svelte
    <div style="margin-top:16px; display:flex; gap:10px">
      <button class="btn --ghost" onclick={() => (step = 'type')}>← 戻る</button>
      <button class="btn --primary" onclick={() => (step = 'tags')}>次へ →</button>
    </div>
```

- [ ] **Step 4: コミット**

```bash
git add src/routes/items/new/+page.svelte
git commit -m "style: 新規登録ウィザードのdetailsステップをfieldクラスに統一"
```

---

### Task 4: tags ステップのスタイル更新

**Files:**
- Modify: `src/routes/items/new/+page.svelte`

- [ ] **Step 1: tags ステップのボタンと見出しを置き換える**

`{:else if step === 'tags'}` ブロック内の見出し・ボタン行を以下に置き換える:

**変更前（見出し2つとボタン行）:**
```svelte
    <h2 class="text-lg font-semibold mb-4">入力内容の確認</h2>
    ...SummaryCard...
    <h2 class="text-lg font-semibold mb-4">タグを設定</h2>
    ...TagPicker...
    <div class="mt-4 flex gap-2">
      <button
        class="flex-1 border rounded-lg py-2"
        onclick={() => (step = isHandmade !== null ? 'details' : 'type')}
      >← 戻る</button>
      <button
        class="flex-1 bg-primary text-primary-foreground rounded-lg py-2"
        disabled={isSaving}
        onclick={saveAndFinish}
      >{isSaving ? '保存中...' : '完了 ✓'}</button>
    </div>
```

**変更後:**
```svelte
    <h2 style="margin-bottom:16px">入力内容の確認</h2>
    ...SummaryCard（変更なし）...
    <h2 style="margin-bottom:16px">タグを設定</h2>
    ...TagPicker（変更なし）...
    <div style="margin-top:16px; display:flex; gap:10px">
      <button class="btn --ghost" onclick={() => (step = isHandmade !== null ? 'details' : 'type')}>← 戻る</button>
      <button class="btn --primary" disabled={isSaving} onclick={saveAndFinish}>
        {isSaving ? '保存中...' : '完了 ✓'}
      </button>
    </div>
```

実際の差分（SummaryCard と TagPicker は中身そのまま）:

```svelte
  {:else if step === 'tags'}
    <h2 style="margin-bottom:16px">入力内容の確認</h2>
    <SummaryCard
      {uploadedPhotos}
      {name}
      {series}
      {isHandmade}
      {storeName}
      {eventName}
      {purchaseDate}
      {purchasePrice}
      {maker}
      {artistName}
      {productionStart}
      {productionEnd}
      {selectedMaterials}
      {quote}
      {notes}
      onEdit={(s) => (step = s)}
    />
    <h2 style="margin-bottom:16px">タグを設定</h2>
    <TagPicker
      bind:selected={selectedTags}
      suggestions={data.allTags}
      frequent={[]}
      placeholder="タグを追加..."
      onCreate={createTag}
    />
    <div style="margin-top:16px; display:flex; gap:10px">
      <button class="btn --ghost" onclick={() => (step = isHandmade !== null ? 'details' : 'type')}>← 戻る</button>
      <button class="btn --primary" disabled={isSaving} onclick={saveAndFinish}>
        {isSaving ? '保存中...' : '完了 ✓'}
      </button>
    </div>
  {/if}
```

- [ ] **Step 2: コミット**

```bash
git add src/routes/items/new/+page.svelte
git commit -m "style: 新規登録ウィザードのtagsステップをプロジェクトCSSに統一"
```

---

### Task 5: SummaryCard のスタイル更新

**Files:**
- Modify: `src/lib/components/SummaryCard.svelte`

- [ ] **Step 1: SummaryCard 全体を書き換える**

`src/lib/components/SummaryCard.svelte` の `<script>` タグより下（テンプレート部分）を以下に完全置き換える:

**変更前（テンプレート全体）:**
```svelte
<div class="border rounded-xl p-4 mb-4 bg-background text-sm">
  <!-- 写真セクション -->
  <div class="border-b pb-3 mb-3">
    <div class="flex justify-between items-center mb-2">
      <span>📷 写真</span>
      <button
        class="text-xs text-muted-foreground hover:text-primary transition-colors"
        onclick={() => onEdit('photo')}
      >
        ← 編集
      </button>
    </div>
    {#if uploadedPhotos.length === 0}
      <span class="text-muted-foreground">未登録</span>
    {:else}
      <div class="grid grid-cols-4 gap-1">
        {#each uploadedPhotos.slice(0, 4) as photo (photo.id)}
          <img src={photo.thumbViewUrl} alt="" class="w-full aspect-square object-cover" />
        {/each}
      </div>
      <span>{uploadedPhotos.length}枚</span>
    {/if}
  </div>

  <!-- 基本情報セクション -->
  <div class="border-b pb-3 mb-3">
    <div class="flex justify-between items-center mb-2">
      <span>📋 基本情報</span>
      <button
        class="text-xs text-muted-foreground hover:text-primary transition-colors"
        onclick={() => onEdit('basic')}
      >
        ← 編集
      </button>
    </div>
    <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
      <dt>名前</dt>
      <dd data-testid="name-value">
        {#if name}
          {name}
        {:else}
          <span class="text-muted-foreground">—</span>
        {/if}
      </dd>
      <dt>シリーズ</dt>
      <dd data-testid="series-value">
        {#if series}
          {series}
        {:else}
          <span class="text-muted-foreground">—</span>
        {/if}
      </dd>
    </dl>
  </div>

  <!-- 詳細セクション -->
  {#if isHandmade === 0}
    <div data-testid="details-section">
      <div class="flex justify-between items-center mb-2">
        <span>🛒 購入情報</span>
        <button
          class="text-xs text-muted-foreground hover:text-primary transition-colors"
          onclick={() => onEdit('details')}
        >
          ← 編集
        </button>
      </div>
      <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt>店舗名</dt>
        <dd data-testid="storeName-value">
          {#if storeName}
            {storeName}
          {:else}
            <span class="text-muted-foreground">—</span>
          {/if}
        </dd>
        <dt>イベント名</dt>
        <dd data-testid="eventName-value">
          {#if eventName}
            {eventName}
          {:else}
            <span class="text-muted-foreground">—</span>
          {/if}
        </dd>
        <dt>購入日</dt>
        <dd data-testid="purchaseDate-value">
          {#if purchaseDate}
            {purchaseDate}
          {:else}
            <span class="text-muted-foreground">—</span>
          {/if}
        </dd>
        <dt>金額</dt>
        <dd data-testid="purchasePrice-value">
          {#if purchasePrice}
            ¥{purchasePrice}
          {:else}
            <span class="text-muted-foreground">—</span>
          {/if}
        </dd>
        <dt>メーカー名</dt>
        <dd data-testid="maker-value">
          {#if maker}
            {maker}
          {:else}
            <span class="text-muted-foreground">—</span>
          {/if}
        </dd>
        <dt>作家名</dt>
        <dd data-testid="artistName-value">
          {#if artistName}
            {artistName}
          {:else}
            <span class="text-muted-foreground">—</span>
          {/if}
        </dd>
      </dl>
    </div>
  {:else if isHandmade === 1}
    <div data-testid="details-section">
      <div class="flex justify-between items-center mb-2">
        <span>🎨 制作情報</span>
        <button
          class="text-xs text-muted-foreground hover:text-primary transition-colors"
          onclick={() => onEdit('details')}
        >
          ← 編集
        </button>
      </div>
      <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt>開始日</dt>
        <dd data-testid="productionStart-value">
          {#if productionStart}
            {productionStart}
          {:else}
            <span class="text-muted-foreground">—</span>
          {/if}
        </dd>
        <dt>終了日</dt>
        <dd data-testid="productionEnd-value">
          {#if productionEnd}
            {productionEnd}
          {:else}
            <span class="text-muted-foreground">—</span>
          {/if}
        </dd>
        <dt>素材</dt>
        <dd data-testid="materials-value">
          {#if selectedMaterials.length > 0}
            <div class="flex flex-wrap gap-1">
              {#each selectedMaterials as material (material.id)}
                <span class="inline-block border rounded px-1 py-0.5 text-xs">{material.name}</span>
              {/each}
            </div>
          {:else}
            <span class="text-muted-foreground">—</span>
          {/if}
        </dd>
        <dt>台詞</dt>
        <dd data-testid="quote-value">
          {#if quote}
            {quote}
          {:else}
            <span class="text-muted-foreground">—</span>
          {/if}
        </dd>
        <dt>メモ</dt>
        <dd data-testid="notes-value">
          {#if notes}
            {notes}
          {:else}
            <span class="text-muted-foreground">—</span>
          {/if}
        </dd>
      </dl>
    </div>
  {/if}
</div>
```

**変更後（テンプレート全体）:**
```svelte
<div style="background:var(--surface); box-shadow:var(--neu-soft); border-radius:var(--radius); padding:20px; margin-bottom:16px; font-size:13px">
  <!-- 写真セクション -->
  <div style="border-bottom:1px solid var(--line); padding-bottom:12px; margin-bottom:12px">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
      <span class="eyebrow">📷 写真</span>
      <button
        style="font-size:11px; color:var(--fg-mute); background:none; border:none; cursor:pointer; font-family:var(--f-mono)"
        onclick={() => onEdit('photo')}
      >← 編集</button>
    </div>
    {#if uploadedPhotos.length === 0}
      <span style="color:var(--fg-mute)">未登録</span>
    {:else}
      <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:4px; margin-bottom:4px">
        {#each uploadedPhotos.slice(0, 4) as photo (photo.id)}
          <img src={photo.thumbViewUrl} alt="" style="width:100%; aspect-ratio:1; object-fit:cover; display:block" />
        {/each}
      </div>
      <span style="font-size:12px; color:var(--fg-mute)">{uploadedPhotos.length}枚</span>
    {/if}
  </div>

  <!-- 基本情報セクション -->
  <div style="border-bottom:1px solid var(--line); padding-bottom:12px; margin-bottom:12px">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
      <span class="eyebrow">📋 基本情報</span>
      <button
        style="font-size:11px; color:var(--fg-mute); background:none; border:none; cursor:pointer; font-family:var(--f-mono)"
        onclick={() => onEdit('basic')}
      >← 編集</button>
    </div>
    <dl style="display:grid; grid-template-columns:auto 1fr; gap:3px 12px; font-size:12px; color:var(--fg-soft)">
      <dt>名前</dt>
      <dd data-testid="name-value" style="color:var(--fg)">
        {#if name}{name}{:else}<span style="color:var(--fg-mute)">—</span>{/if}
      </dd>
      <dt>シリーズ</dt>
      <dd data-testid="series-value" style="color:var(--fg)">
        {#if series}{series}{:else}<span style="color:var(--fg-mute)">—</span>{/if}
      </dd>
    </dl>
  </div>

  <!-- 詳細セクション -->
  {#if isHandmade === 0}
    <div data-testid="details-section">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
        <span class="eyebrow">🛒 購入情報</span>
        <button
          style="font-size:11px; color:var(--fg-mute); background:none; border:none; cursor:pointer; font-family:var(--f-mono)"
          onclick={() => onEdit('details')}
        >← 編集</button>
      </div>
      <dl style="display:grid; grid-template-columns:auto 1fr; gap:3px 12px; font-size:12px; color:var(--fg-soft)">
        <dt>店舗名</dt>
        <dd data-testid="storeName-value" style="color:var(--fg)">
          {#if storeName}{storeName}{:else}<span style="color:var(--fg-mute)">—</span>{/if}
        </dd>
        <dt>イベント名</dt>
        <dd data-testid="eventName-value" style="color:var(--fg)">
          {#if eventName}{eventName}{:else}<span style="color:var(--fg-mute)">—</span>{/if}
        </dd>
        <dt>購入日</dt>
        <dd data-testid="purchaseDate-value" style="color:var(--fg)">
          {#if purchaseDate}{purchaseDate}{:else}<span style="color:var(--fg-mute)">—</span>{/if}
        </dd>
        <dt>金額</dt>
        <dd data-testid="purchasePrice-value" style="color:var(--fg)">
          {#if purchasePrice}¥{purchasePrice}{:else}<span style="color:var(--fg-mute)">—</span>{/if}
        </dd>
        <dt>メーカー名</dt>
        <dd data-testid="maker-value" style="color:var(--fg)">
          {#if maker}{maker}{:else}<span style="color:var(--fg-mute)">—</span>{/if}
        </dd>
        <dt>作家名</dt>
        <dd data-testid="artistName-value" style="color:var(--fg)">
          {#if artistName}{artistName}{:else}<span style="color:var(--fg-mute)">—</span>{/if}
        </dd>
      </dl>
    </div>
  {:else if isHandmade === 1}
    <div data-testid="details-section">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
        <span class="eyebrow">🎨 制作情報</span>
        <button
          style="font-size:11px; color:var(--fg-mute); background:none; border:none; cursor:pointer; font-family:var(--f-mono)"
          onclick={() => onEdit('details')}
        >← 編集</button>
      </div>
      <dl style="display:grid; grid-template-columns:auto 1fr; gap:3px 12px; font-size:12px; color:var(--fg-soft)">
        <dt>台詞</dt>
        <dd data-testid="quote-value" style="color:var(--fg)">
          {#if quote}{quote}{:else}<span style="color:var(--fg-mute)">—</span>{/if}
        </dd>
        <dt>開始日</dt>
        <dd data-testid="productionStart-value" style="color:var(--fg)">
          {#if productionStart}{productionStart}{:else}<span style="color:var(--fg-mute)">—</span>{/if}
        </dd>
        <dt>終了日</dt>
        <dd data-testid="productionEnd-value" style="color:var(--fg)">
          {#if productionEnd}{productionEnd}{:else}<span style="color:var(--fg-mute)">—</span>{/if}
        </dd>
        <dt>素材</dt>
        <dd data-testid="materials-value" style="color:var(--fg)">
          {#if selectedMaterials.length > 0}
            <div style="display:flex; flex-wrap:wrap; gap:4px">
              {#each selectedMaterials as material (material.id)}
                <span style="border:1px solid var(--line); border-radius:var(--radius-sm); padding:1px 6px; font-size:11px">{material.name}</span>
              {/each}
            </div>
          {:else}
            <span style="color:var(--fg-mute)">—</span>
          {/if}
        </dd>
        <dt>メモ</dt>
        <dd data-testid="notes-value" style="color:var(--fg)">
          {#if notes}{notes}{:else}<span style="color:var(--fg-mute)">—</span>{/if}
        </dd>
      </dl>
    </div>
  {/if}
</div>
```

- [ ] **Step 2: 既存テストが通ることを確認する**

SummaryCard のテストが `data-testid` 属性で動作確認するため、`data-testid` は維持されていることを確認済み。テストを実行:

```bash
npm test -- --run
```

エラーがなければ OK。テストファイルが Tailwind クラス名を直接チェックしている場合はそのアサーションを削除する（CSS クラス名はテスト対象外）。

- [ ] **Step 3: コミット**

```bash
git add src/lib/components/SummaryCard.svelte
git commit -m "style: SummaryCardをプロジェクトCSSデザインシステムに統一"
```
