<script lang="ts">
  import { onMount } from 'svelte';

  type Segment = {
    text: string;
    em?: boolean;
    small?: boolean;
    large?: boolean;
    stain?: boolean;
    breakAfter?: boolean;
  };

  let { segments }: { segments: Segment[] } = $props();

  const PUNCT = new Set(['、', '。']);

  const MASK_COLORS = [
    'oklch(0.62 0.14 70 / 0.80)',
    'oklch(0.52 0.15 65 / 0.82)',
    'oklch(0.72 0.12 78 / 0.75)',
    'oklch(0.58 0.10 230 / 0.78)',
    'oklch(0.50 0.12 285 / 0.80)',
  ];

  const rand = (a: number, b: number) => Math.random() * (b - a) + a;
  const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

  async function animateChar(el: HTMLElement): Promise<void> {
    const isStain = el.dataset.stain === 'true';

    // Phase 1: random blink reveal
    const blinkCount = randInt(2, 6);
    const blinkInterval = rand(40, 120);
    for (let i = 0; i < blinkCount; i++) {
      el.style.opacity = String(i % 2 === 0 ? rand(0.05, 0.45) : 0);
      await sleep(blinkInterval);
    }

    // Phase 2: settle at partial opacity, maybe add mask
    el.style.opacity = String(rand(0.6, 0.9));

    if (isStain || Math.random() < 0.55) {
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

      // Phase 3: dissolve mask (stain: stop at residual opacity)
      const floor = isStain ? rand(0.18, 0.26) : 0;
      const dissolveSteps = randInt(3, 8);
      const dissolveDelay = rand(60, 180);
      let opacity = 1;
      for (let s = 0; s < dissolveSteps; s++) {
        await sleep(dissolveDelay);
        opacity -= opacity / (dissolveSteps - s);
        mask.style.opacity = String(Math.max(floor, opacity));
      }
      if (!isStain) mask.remove();
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

<!-- WARNING: ブロック間に改行・スペースを入れないこと。インライン要素間の空白テキストノードになりセグメント間に不要スペースが生じる -->
<span bind:this={container}>{#each segments as seg}{#if seg.em}<em>{#each [...seg.text] as char}<span class="glitch-ch" class:punct={PUNCT.has(char)}>{char}</span>{/each}</em>{:else}{#each [...seg.text] as char}{#if char === ' '}{' '}{:else}<span
        class="glitch-ch"
        class:punct={PUNCT.has(char)}
        class:small-ch={seg.small}
        class:large-ch={seg.large}
        data-stain={seg.stain ? 'true' : undefined}
      >{char}</span>{/if}{/each}{/if}{#if seg.breakAfter}<br />{/if}{/each}</span>

<style>
  .glitch-ch {
    position: relative;
    display: inline-block;
    opacity: 0;
  }
  .punct {
    font-size: 0.75em;
  }
  .small-ch {
    font-size: 0.65em;
  }
  .large-ch {
    font-size: 1.3em;
  }
</style>
