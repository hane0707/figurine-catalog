# Glitch Text Effect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `GlitchText.svelte` コンポーネントを作成し、items ページと about ページの見出しにページ読み込み時のキャラクター単位グリッチアニメーションを適用する。

**Architecture:** Svelte 5 の `$props()` + `onMount` を使ったコンポーネント。`segments` プロップでテキスト構造（通常 / em / 改行）を受け取り、各文字を `<span class="glitch-ch">` に分解してアニメーションを実行する。アニメーションロジックは `docs/glitch-text-v4.html` の実装を移植し、マスクカラーだけアプリの OKLCH hue 285 系に統一する。

**Tech Stack:** SvelteKit, Svelte 5 (runes), TypeScript

---

## File Map

| ファイル | 変更 |
|---|---|
| `src/lib/components/GlitchText.svelte` | 新規作成 |
| `src/routes/items/+page.svelte` | h1の中身を GlitchText に置き換え（132〜135行目） |
| `src/routes/about/+page.svelte` | h1の中身を GlitchText に置き換え（16〜18行目） |

---

### Task 1: GlitchText.svelte を作成する

**Files:**
- Create: `src/lib/components/GlitchText.svelte`

- [ ] **Step 1: ファイルを作成する**

`src/lib/components/GlitchText.svelte` を以下の内容で作成する:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  type Segment = {
    text: string;
    em?: boolean;
    breakAfter?: boolean;
  };

  let { segments }: { segments: Segment[] } = $props();

  const PUNCT = new Set(['、', '。']);

  const MASK_COLORS = [
    'oklch(0.62 0.20 285 / 0.80)',
    'oklch(0.52 0.22 285 / 0.82)',
    'oklch(0.72 0.16 285 / 0.75)',
    'oklch(0.45 0.20 285 / 0.85)',
    'oklch(0.58 0.10 230 / 0.78)',
  ];

  const rand = (a: number, b: number) => Math.random() * (b - a) + a;
  const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

  async function animateChar(el: HTMLElement): Promise<void> {
    // Phase 1: random blink reveal
    const blinkCount = randInt(2, 6);
    const blinkInterval = rand(40, 120);
    for (let i = 0; i < blinkCount; i++) {
      el.style.opacity = String(i % 2 === 0 ? rand(0.05, 0.45) : 0);
      await sleep(blinkInterval);
    }

    // Phase 2: settle at partial opacity, maybe add mask
    el.style.opacity = String(rand(0.6, 0.9));

    if (Math.random() < 0.55) {
      const maskIsCircle = Math.random() < 0.4;
      const maskColor = pick(MASK_COLORS);
      const mask = document.createElement('span');

      if (maskIsCircle) {
        const size = rand(60, 110);
        const ox = rand(-20, 20);
        const oy = rand(-20, 20);
        mask.style.cssText = `position:absolute;width:${size}%;aspect-ratio:1/1;top:50%;left:50%;transform:translate(calc(-50% + ${ox}%),calc(-50% + ${oy}%));background:${maskColor};opacity:1;border-radius:50%;pointer-events:none;`;
      } else {
        const top    = rand(0, 30);
        const left   = rand(0, 30);
        const bottom = rand(0, Math.min(30, 55 - top));
        const right  = rand(0, Math.min(30, 55 - left));
        mask.style.cssText = `position:absolute;top:${top}%;left:${left}%;right:${right}%;bottom:${bottom}%;background:${maskColor};opacity:1;border-radius:${randInt(0, 3)}px;pointer-events:none;`;
      }

      el.appendChild(mask);

      // Phase 3: dissolve mask
      const dissolveSteps = randInt(3, 8);
      const dissolveDelay = rand(60, 180);
      let opacity = 1;
      for (let s = 0; s < dissolveSteps; s++) {
        await sleep(dissolveDelay);
        opacity -= opacity / (dissolveSteps - s);
        mask.style.opacity = String(Math.max(0, opacity));
      }
      mask.remove();
    }

    // Phase 4: snap to full opacity, occasional extra flash
    await sleep(rand(30, 80));
    el.style.opacity = '1';
    if (Math.random() < 0.25) {
      await sleep(rand(200, 600));
      el.style.opacity = String(rand(0.3, 0.7));
      await sleep(rand(30, 80));
      el.style.opacity = '1';
    }
  }

  let container: HTMLElement;

  onMount(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const chars = Array.from(container.querySelectorAll<HTMLElement>('.glitch-ch'));

    if (prefersReduced) {
      chars.forEach(el => { el.style.opacity = '1'; });
      return;
    }

    const BASE = 120;
    const JITTER = 180;
    Promise.all(
      chars.map((el, i) => {
        const delay = i * BASE + rand(-JITTER * 0.3, JITTER);
        return sleep(Math.max(0, delay)).then(() => animateChar(el));
      })
    );
  });
</script>

<span bind:this={container}>
  {#each segments as seg}
    {#if seg.em}
      <em>
        {#each [...seg.text] as char}
          <span class="glitch-ch" class:punct={PUNCT.has(char)}>{char}</span>
        {/each}
      </em>
    {:else}
      {#each [...seg.text] as char}
        <span class="glitch-ch" class:punct={PUNCT.has(char)}>{char}</span>
      {/each}
    {/if}
    {#if seg.breakAfter}<br />{/if}
  {/each}
</span>

<style>
  .glitch-ch {
    position: relative;
    display: inline-block;
    opacity: 0;
  }
  .punct {
    font-size: 0.75em;
  }
</style>
```

- [ ] **Step 2: ビルドチェックを実行する**

```bash
npm run build 2>&1 | head -40
```

TypeScript エラーがないことを確認する。エラーがあれば修正する。

- [ ] **Step 3: コミットする**

```bash
git add src/lib/components/GlitchText.svelte
git commit -m "feat: GlitchTextコンポーネントを追加"
```

---

### Task 2: items ページの h1 に GlitchText を適用する

**Files:**
- Modify: `src/routes/items/+page.svelte` (1〜5行目の import ブロック、132〜135行目の h1)

- [ ] **Step 1: GlitchText を import して h1 を置き換える**

`src/routes/items/+page.svelte` の先頭 import ブロック（5行目付近）に追加:

```svelte
import GlitchText from '$lib/components/GlitchText.svelte';
```

132〜135行目の h1 の中身を置き換える:

```svelte
<!-- Before -->
<h1 class="display hero-title">
  雨のあたらない、<br />
  <em>スーツケース</em>の中。
</h1>

<!-- After -->
<h1 class="display hero-title">
  <GlitchText segments={[
    { text: '雨のあたらない、', breakAfter: true },
    { text: 'スーツケース', em: true },
    { text: 'の中。' }
  ]} />
</h1>
```

- [ ] **Step 2: ブラウザで動作確認する**

```bash
npm run dev
```

`http://localhost:5173/items` を開き、ページ読み込み時に「雨のあたらない、スーツケースの中。」が文字単位でグリッチしながら現れることを確認する。`<em>スーツケース</em>` のイタリック体が維持されていることも確認する。

- [ ] **Step 3: コミットする**

```bash
git add src/routes/items/+page.svelte
git commit -m "feat: itemsページのヒーロー見出しにグリッチテキストを適用"
```

---

### Task 3: about ページの h1 に GlitchText を適用する

**Files:**
- Modify: `src/routes/about/+page.svelte` (script タグ追加、16〜18行目の h1)

- [ ] **Step 1: script タグと GlitchText の import を追加して h1 を置き換える**

`src/routes/about/+page.svelte` の先頭（`<svelte:head>` の前）に追加:

```svelte
<script lang="ts">
  import GlitchText from '$lib/components/GlitchText.svelte';
</script>
```

16〜18行目の h1 の中身を置き換える:

```svelte
<!-- Before -->
<h1 class="display" style="font-size: clamp(32px, 5vw, 64px); margin-bottom: 32px; line-height: 1.1">
  Haku's suitcase
</h1>

<!-- After -->
<h1 class="display" style="font-size: clamp(32px, 5vw, 64px); margin-bottom: 32px; line-height: 1.1">
  <GlitchText segments={[{ text: "Haku's suitcase" }]} />
</h1>
```

- [ ] **Step 2: ブラウザで動作確認する**

`http://localhost:5173/about` を開き、ページ読み込み時に「Haku's suitcase」が文字単位でグリッチしながら現れることを確認する。

- [ ] **Step 3: コミットする**

```bash
git add src/routes/about/+page.svelte
git commit -m "feat: aboutページの見出しにグリッチテキストを適用"
```
