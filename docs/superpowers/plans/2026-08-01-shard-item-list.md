# シャード型作品一覧（Mirror Shards 移植）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 作品一覧の Collection セクションを、モック「鏡片一覧 — SHARD INDEX」の不定形クリップ鏡片カード（厚み・稜線・グリント・散逸配置・浮遊・ポインタチルト・ちり光・グレイン）に作り替える。

**Architecture:** 幾何計算（クリップ形状・厚みパネル・稜線・散逸配置・ちり光）を DOM 非依存の純 TS モジュール `src/lib/shards/geometry.ts` に分離し、`ShardCard.svelte` / `DustField.svelte` が `#each` でその結果を宣言的に SVG/DOM へ描画する。配色はモックの cyan→magenta スイープを紫アクセント中心の hue レンジに翻訳し、既存デザイントークン（`src/app.css`）に統合する。

**Tech Stack:** SvelteKit 2 + Svelte 5 runes（`$state`/`$derived`/`$effect`/`$props`、イベントは `onclick`/`onmousemove` 形式）、Tailwind CSS 4、vitest（jsdom + @testing-library/svelte）。

## Global Constraints

- スタック: SvelteKit 2 + Svelte 5 runes 構文、イベントは `onclick` 形式。TypeScript strict。
- 検証基準: `npm run check` は既存負債 **75 エラー / 28 警告** があり、合格基準は「新規に増やさない」（絶対数では判断しない）。
- 検証基準: `npm test` は既存 **102 件全 PASS** が基準。新規テストも全 PASS のこと。
- サンドボックス内では `npm run dev` は起動不可（`.dev.vars` 読み取り拒否 + D1/R2 バインディング）。`npm run build` は静的コンパイルのみで動作確認済み（本セッションで実行確認済み、ビルド成功）。視覚確認はユーザーに依頼する。
- CSS の `transition` はマージされない — 同詳細度セレクタの `transition: all` がソース順で後置ユーティリティの transition を上書きする。リビール系（enter 出現）は **animation 方式** を使う。
- アクセントは紫。トークン名 `--accent-amber` は歴史的経緯で琥珀を意味するが実色は紫（`oklch 0.52 0.22 285`）が正。変更提案は不可。
- `{@html}` は使わない。SVG は `#each` で宣言的に描画する。
- グラデーション・クリップの SVG id は `item.id` ベースで一意化する（カード間の衝突を避ける）。
- ポインタチルトは `pointer: fine` かつ非 `prefers-reduced-motion: reduce` のときのみ、**イベント発生ごとに** 能力を再評価する（タッチ端末でチルト・グレアが固定表示される既修正バグと同じガード。`src/routes/items/+page.svelte` の `handleTilt` が実例）。
- 表示切替（グリッド/リスト）は維持する。**リスト表示（`.row-list`）は現状のまま変更しない。**
- 空状態文言:「この分類の欠片はまだ拾われていません。」（承認済み）
- 採用しない（YAGNI）: モックの「散逸」ソートオプション、「N / M PIECES」件数表示、奥行き演出の比較トグル UI。
- コミットメッセージは日本語。各タスクのコミットには以下のフッターを含める:
  ```
  Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_0138fUVSy7GzXdg5cjhWhZg2
  ```

---

## File Structure

| ファイル | 種別 | 責務 |
|---|---|---|
| `src/lib/shards/geometry.ts` | 新規 | 純関数の幾何モジュール。seed 導出・LCG 乱数・クリップ形状・厚みパネル・稜線・グリント座標・散逸配置・ちり光。DOM 非依存。 |
| `src/lib/shards/geometry.test.ts` | 新規 | 上記の決定論性・値域・連結性のテスト。 |
| `src/lib/components/ShardDefs.svelte` | 新規 | 共有 SVG defs（clipPath ×6 + grain フィルタ）。一覧ページに 1 回だけ設置。 |
| `src/lib/components/ShardCard.svelte` | 新規 | 鏡片カード 1 枚。glow/bob/stage/tilt/shard-stack(slab SVG + shard)/meta。 |
| `src/lib/components/DustField.svelte` | 新規 | ちり光（前景 depth-fx）。固定 seed、`position:fixed`、`aria-hidden`。 |
| `src/lib/components/DustField.test.ts` | 新規 | レンダリングのスモークテスト（IntersectionObserver 非依存のため実施可能）。 |
| `src/app.css` | 変更 | シャード用トークン追加（Task 2）、`.items-grid`/`.skel-grid` を auto-fill グリッドに変更（Task 5）。 |
| `src/routes/items/+page.svelte` | 変更 | グリッド表示を ShardCard に置換。列分割 JS 撤去。ShardDefs/DustField 設置。空状態文言変更。 |
| `src/lib/components/ItemCard.svelte` | **削除** | 使用箇所が一覧グリッドのみのため ShardCard に置換して削除（Task 5）。 |

**命名についての補足:** 設計書は「クリップ形状 6 種（0–1 座標の polygon 文字列と、100×120 単位箱の頂点配列の両方）」と述べているが具体名は指定していない。本計画では前者を `CLIP_SHAPES`、後者を `SHARD_POLYS` と命名する。

---

## Task 1: 幾何計算モジュール（geometry.ts）

**Files:**
- Create: `src/lib/shards/geometry.ts`
- Test: `src/lib/shards/geometry.test.ts`

**Interfaces:**
- Consumes: なし（このタスクが幾何計算の基盤）。
- Produces（以降の全タスクが利用する公開 API）:
  ```ts
  export interface Vec2 { x: number; y: number }
  export interface Edge { x1: number; y1: number; x2: number; y2: number }
  export interface GradientStop { offset: string; color: string; opacity: number }
  export interface SlabPanel {
    quad: [Vec2, Vec2, Vec2, Vec2]; // [front1, front2, back2, back1]
    gradientFrom: Vec2;
    gradientTo: Vec2;
    stops: GradientStop[];
    strokeColor: string;
    strokeOpacity: number;
    strokeWidth: number;
    photoTransform: string; // 例: "rotate(42.3 20.00 60.00)"
    photoOpacity: number;
  }
  export interface EdgeLine {
    x1: number; y1: number; x2: number; y2: number;
    color: string; opacity: number; width: number;
  }
  export interface GlintPos { xPct: number; yPct: number }
  export interface ScatterParams { dx: number; dy: number; rot: number; dur: number; del: number }
  export interface DustMote {
    xVw: number; yVh: number; size: number; dur: number; delay: number; peak: number;
  }

  export function hashSeed(id: string): number;
  export function rng(seed: number): () => number;
  export const CLIP_SHAPES: string[]; // 6要素
  export const SHARD_POLYS: Vec2[][]; // 6要素、各7頂点（100x120単位箱）
  export function edgeExposure(edge: Edge): number;
  export function buildSlab(polyIdx: number, seed: number): SlabPanel[];
  export function buildEdges(polyIdx: number): EdgeLine[];
  export function glintPos(polyIdx: number): GlintPos;
  export function scatterParams(seed: number): ScatterParams;
  export function buildDust(seed: number, count: number): DustMote[];
  ```

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/shards/geometry.test.ts` を作成する:

```ts
import { describe, it, expect } from 'vitest';
import {
  hashSeed,
  rng,
  CLIP_SHAPES,
  SHARD_POLYS,
  edgeExposure,
  buildSlab,
  buildEdges,
  glintPos,
  scatterParams,
  buildDust,
} from './geometry';

describe('hashSeed', () => {
  it('同じ id は常に同じ seed を返す', () => {
    expect(hashSeed('item-001')).toBe(hashSeed('item-001'));
  });

  it('異なる id は異なる seed に分散する', () => {
    const seeds = ['a', 'b', 'c', 'd', 'e'].map(hashSeed);
    expect(new Set(seeds).size).toBe(seeds.length);
  });

  it('非負の32bit整数を返す', () => {
    const seed = hashSeed('some-uuid-like-id-1234');
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(2 ** 32);
  });
});

describe('rng', () => {
  it('同じ seed は同じ乱数列を返す', () => {
    const a = rng(12345);
    const b = rng(12345);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('異なる seed は異なる乱数列を返す', () => {
    expect(rng(1)()).not.toBe(rng(2)());
  });

  it('[0, 1) の範囲の値を返す', () => {
    const r = rng(999);
    for (let i = 0; i < 20; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('CLIP_SHAPES / SHARD_POLYS', () => {
  it('6種の形状を持つ', () => {
    expect(CLIP_SHAPES).toHaveLength(6);
    expect(SHARD_POLYS).toHaveLength(6);
  });

  it('分数座標の頂点数と100x120頂点配列の頂点数が一致する', () => {
    CLIP_SHAPES.forEach((shape, i) => {
      const fractionCount = shape.trim().split(' ').length;
      expect(SHARD_POLYS[i]).toHaveLength(fractionCount);
    });
  });
});

describe('edgeExposure', () => {
  it('全形状・全辺で値域が 0–1 に収まる', () => {
    SHARD_POLYS.forEach((poly) => {
      const n = poly.length;
      for (let i = 0; i < n; i++) {
        const p1 = poly[i];
        const p2 = poly[(i + 1) % n];
        const t = edgeExposure({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
        expect(t).toBeGreaterThanOrEqual(0);
        expect(t).toBeLessThanOrEqual(1);
      }
    });
  });
});

describe('buildSlab', () => {
  it('決定論的である（同じ polyIdx・seed で同じ結果）', () => {
    expect(buildSlab(0, 777)).toEqual(buildSlab(0, 777));
  });

  it('隣接パネルが頂点を共有し、帯として連結する', () => {
    for (let polyIdx = 0; polyIdx < SHARD_POLYS.length; polyIdx++) {
      const panels = buildSlab(polyIdx, 555 + polyIdx);
      const n = panels.length;
      for (let i = 0; i < n; i++) {
        const next = (i + 1) % n;
        // 前面側の共有頂点: panel[i] の2番目の頂点 == panel[next] の1番目の頂点
        expect(panels[i].quad[1]).toEqual(panels[next].quad[0]);
        // 背面側の共有頂点: panel[i] の3番目の頂点 == panel[next] の4番目の頂点
        expect(panels[i].quad[2]).toEqual(panels[next].quad[3]);
      }
    }
  });

  it('形状の辺の数だけパネルを返す', () => {
    expect(buildSlab(2, 42)).toHaveLength(SHARD_POLYS[2].length);
  });
});

describe('buildEdges', () => {
  it('形状の辺の数だけ EdgeLine を返す', () => {
    expect(buildEdges(3)).toHaveLength(SHARD_POLYS[3].length);
  });

  it('opacity と width が正の値である', () => {
    buildEdges(1).forEach((edge) => {
      expect(edge.opacity).toBeGreaterThan(0);
      expect(edge.width).toBeGreaterThan(0);
    });
  });
});

describe('glintPos', () => {
  it('形状の第一頂点に対応する座標を返す', () => {
    const pos = glintPos(0);
    const first = SHARD_POLYS[0][0];
    expect(pos.xPct).toBeCloseTo((first.x / 100) * 100);
    expect(pos.yPct).toBeCloseTo((first.y / 120) * 100);
  });

  it('0–100 の範囲に収まる', () => {
    for (let i = 0; i < SHARD_POLYS.length; i++) {
      const pos = glintPos(i);
      expect(pos.xPct).toBeGreaterThanOrEqual(0);
      expect(pos.xPct).toBeLessThanOrEqual(100);
      expect(pos.yPct).toBeGreaterThanOrEqual(0);
      expect(pos.yPct).toBeLessThanOrEqual(100);
    }
  });
});

describe('scatterParams', () => {
  it('決定論的である', () => {
    expect(scatterParams(123)).toEqual(scatterParams(123));
  });

  it('dur が浮遊時間の範囲(6.5–11s)に収まる', () => {
    for (let seed = 0; seed < 50; seed++) {
      const { dur } = scatterParams(seed * 97);
      expect(dur).toBeGreaterThanOrEqual(6.5);
      expect(dur).toBeLessThanOrEqual(11);
    }
  });
});

describe('buildDust', () => {
  it('決定論的である', () => {
    expect(buildDust(4242, 22)).toEqual(buildDust(4242, 22));
  });

  it('指定した count 件を返す', () => {
    expect(buildDust(4242, 22)).toHaveLength(22);
    expect(buildDust(1, 5)).toHaveLength(5);
  });

  it('size と peak が期待範囲に収まる', () => {
    buildDust(4242, 22).forEach((mote) => {
      expect(mote.size).toBeGreaterThanOrEqual(1.5);
      expect(mote.size).toBeLessThanOrEqual(3.7);
      expect(mote.peak).toBeGreaterThanOrEqual(0.45);
      expect(mote.peak).toBeLessThanOrEqual(0.9);
    });
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npm test -- geometry`
Expected: FAIL（`./geometry` モジュールが存在しないため import エラー）

- [ ] **Step 3: geometry.ts を実装する**

`src/lib/shards/geometry.ts` を作成する:

```ts
// src/lib/shards/geometry.ts
// 鏡片カードの幾何計算（純関数・DOM 非依存）。
// Svelte コンポーネント側はここが返すデータを #each で SVG に描画する。

export interface Vec2 {
  x: number;
  y: number;
}

export interface Edge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface GradientStop {
  offset: string;
  color: string;
  opacity: number;
}

export interface SlabPanel {
  /** 前面2頂点+背面2頂点からなる四辺形。[front1, front2, back2, back1] の順。
   *  隣接パネルの quad[1]/quad[2] は次パネルの quad[0]/quad[3] とそれぞれ同一座標になり、
   *  帯が連結する。 */
  quad: [Vec2, Vec2, Vec2, Vec2];
  gradientFrom: Vec2;
  gradientTo: Vec2;
  stops: GradientStop[];
  strokeColor: string;
  strokeOpacity: number;
  strokeWidth: number;
  /** 写真の映り込み用 SVG transform 属性値（例: "rotate(42.3 20.00 60.00)"）。 */
  photoTransform: string;
  photoOpacity: number;
}

export interface EdgeLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  opacity: number;
  width: number;
}

export interface GlintPos {
  xPct: number;
  yPct: number;
}

export interface ScatterParams {
  dx: number;
  dy: number;
  rot: number;
  dur: number;
  del: number;
}

export interface DustMote {
  xVw: number;
  yVh: number;
  size: number;
  dur: number;
  delay: number;
  peak: number;
}

/** FNV-1a 32bit ハッシュ。item.id から決定論的な seed を導出する。
 *  同じ id は常に同じ seed になり、再訪しても形・傾き・浮遊周期が変わらない。 */
export function hashSeed(id: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** モックと同じ線形合同法(LCG)。呼ぶたびに [0, 1) の疑似乱数を返す関数を生成する。 */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

const VB_W = 100;
const VB_H = 120;

/** 6種の不定形クリップ形状。0–1 の分数座標（SVG clipPath の polygon points 用）。
 *  モックの CLIP_POINTS をそのまま移植。 */
export const CLIP_SHAPES: string[] = [
  '0.48,0 0.96,0.14 1,0.62 0.78,1 0.12,0.92 0,0.55 0.14,0.18',
  '0.20,0.04 0.88,0 1,0.40 0.92,0.96 0.34,1 0,0.78 0.06,0.26',
  '0.60,0 1,0.30 0.90,0.88 0.55,1 0.08,0.84 0,0.34 0.26,0.06',
  '0.35,0 0.92,0.08 1,0.55 0.70,1 0.20,0.96 0,0.60 0.08,0.14',
  '0.50,0 1,0.22 0.96,0.70 0.62,1 0.06,0.94 0,0.44 0.18,0.08',
  '0.28,0 0.84,0.06 1,0.48 0.84,0.92 0.40,1 0.04,0.70 0,0.22',
];

function parseShape(points: string): Vec2[] {
  return points
    .trim()
    .split(' ')
    .map((pair) => {
      const [x, y] = pair.split(',').map(Number);
      return { x: x * VB_W, y: y * VB_H };
    });
}

/** CLIP_SHAPES を 100×120 単位箱の頂点配列に変換したもの。
 *  buildSlab / buildEdges / glintPos はここから頂点を読む。 */
export const SHARD_POLYS: Vec2[][] = CLIP_SHAPES.map(parseShape);

const LIGHT = { x: -0.35, y: -1 };
const LIGHT_LEN = Math.hypot(LIGHT.x, LIGHT.y);

/** 辺 (x1,y1)-(x2,y2) の外向き法線と共有光源ベクトルとの内積から受光度を 0–1 で返す。
 *  1 = 光源側を向く辺（明るい）、0 = 光源と反対を向く辺（暗い）。 */
export function edgeExposure(edge: Edge): number {
  const ex = edge.x2 - edge.x1;
  const ey = edge.y2 - edge.y1;
  const nx = ey;
  const ny = -ex;
  const nlen = Math.hypot(nx, ny) || 1;
  const dot = (nx / nlen) * (LIGHT.x / LIGHT_LEN) + (ny / nlen) * (LIGHT.y / LIGHT_LEN);
  return (dot + 1) / 2;
}

// slab・稜線の hue スイープ。モックの 198–348（cyan→magenta）を紫アクセント
// （--accent-amber = oklch 0.52 0.22 285）中心の 230–320 に再調整（設計書「配色翻訳」）。
const HUE_MIN = 230;
const HUE_SPAN = 90;
// hue2 のオフセット。モックは150°幅のスイープに対し-24°ずらしていた(24/150≈0.16)。
// 90°幅でも同じ比率を保つため -14°(≈90*0.16) に縮小する。
const HUE2_OFFSET = 14;

function hueAt(t: number): number {
  return HUE_MIN + t * HUE_SPAN;
}

/** 辺ごとの四辺形パネル列（帯状の厚みパネル）を返す。前面頂点と、光源基準で
 *  ランダムに外側へオフセットした背面頂点からなる四辺形が、辺の数だけ連なる。
 *  隣接パネルは頂点を共有するため帯として連結する。 */
export function buildSlab(polyIdx: number, seed: number): SlabPanel[] {
  const poly = SHARD_POLYS[polyIdx];
  const n = poly.length;
  const r = rng(seed);
  const baseAngle = r() * Math.PI * 2;
  const baseDist = 2.5 + r() * 4.5;
  const vertexOffsets: Vec2[] = poly.map(() => {
    const ang = baseAngle + (r() - 0.5) * 1.0;
    const dist = baseDist * (0.55 + r() * 0.9);
    return { x: Math.cos(ang) * dist, y: Math.sin(ang) * dist };
  });

  const panels: SlabPanel[] = [];
  for (let i = 0; i < n; i++) {
    const p1 = poly[i];
    const p2 = poly[(i + 1) % n];
    const o1 = vertexOffsets[i];
    const o2 = vertexOffsets[(i + 1) % n];
    const b1: Vec2 = { x: p1.x + o1.x, y: p1.y + o1.y };
    const b2: Vec2 = { x: p2.x + o2.x, y: p2.y + o2.y };

    const t = edgeExposure({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
    const hue = hueAt(t);
    const hue2 = (hue - HUE2_OFFSET + 360) % 360;
    const topL = 55 + t * 32;
    const midL = 28 + t * 30;
    const baseL = Math.max(6, midL - 22);

    const cx = (p1.x + p2.x + b1.x + b2.x) / 4;
    const cy = (p1.y + p2.y + b1.y + b2.y) / 4;
    const angleDeg = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;

    panels.push({
      quad: [p1, p2, b2, b1],
      gradientFrom: p1,
      gradientTo: b2,
      stops: [
        { offset: '0%', color: `hsl(${hue.toFixed(0)} 70% ${topL.toFixed(0)}%)`, opacity: 0.62 },
        { offset: '45%', color: `hsl(${hue2.toFixed(0)} 55% ${midL.toFixed(0)}%)`, opacity: 0.34 },
        { offset: '100%', color: `hsl(${hue.toFixed(0)} 35% ${baseL.toFixed(0)}%)`, opacity: 0.2 },
      ],
      strokeColor: `hsl(${hue.toFixed(0)} 80% 90%)`,
      strokeOpacity: 0.12 + t * 0.35,
      strokeWidth: 0.35,
      photoTransform: `rotate(${angleDeg.toFixed(1)} ${cx.toFixed(2)} ${cy.toFixed(2)})`,
      photoOpacity: 0.32,
    });
  }
  return panels;
}

/** 前面の輪郭を1辺ずつなぞる稜線。全ての辺に受光度に応じた明るさの線を引く
 *  （slab の厚みが見えない辺にも、鏡面の反射としてうっすら光を入れる）。 */
export function buildEdges(polyIdx: number): EdgeLine[] {
  const poly = SHARD_POLYS[polyIdx];
  const n = poly.length;
  const edges: EdgeLine[] = [];
  for (let i = 0; i < n; i++) {
    const p1 = poly[i];
    const p2 = poly[(i + 1) % n];
    const t = edgeExposure({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
    const hue = hueAt(t);
    edges.push({
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
      color: `hsl(${hue.toFixed(0)} 75% 88%)`,
      opacity: 0.1 + t * 0.5,
      width: 0.4 + t * 0.9,
    });
  }
  return edges;
}

/** 形状の第一頂点をグリント（光点）の座標として返す（形状ごとに固定）。 */
export function glintPos(polyIdx: number): GlintPos {
  const first = SHARD_POLYS[polyIdx][0];
  return { xPct: (first.x / VB_W) * 100, yPct: (first.y / VB_H) * 100 };
}

/** 散逸配置（--dx/--dy/--rot）と浮遊（--dur/--del）のパラメータ。 */
export function scatterParams(seed: number): ScatterParams {
  const r = rng(seed);
  const rot = (r() - 0.5) * 11;
  const dx = (r() - 0.5) * 36;
  const dy = (r() - 0.5) * 56;
  const dur = 6.5 + r() * 4.5;
  const del = -r() * 6;
  return { dx, dy, rot, dur, del };
}

/** ちり光（前景 depth-fx）の粒 count 個ぶんの座標・サイズ・点滅パラメータ。
 *  斜めの光の筋に沿ってゆるく集まるよう、位置は帯状の対角線を基準にばらつかせる。 */
export function buildDust(seed: number, count: number): DustMote[] {
  const r = rng(seed);
  const motes: DustMote[] = [];
  for (let i = 0; i < count; i++) {
    const t = r();
    const beamX = -10 + t * 115;
    const beamY = 12 + t * 58;
    const xVw = beamX + (r() - 0.5) * 22;
    const yVh = beamY + (r() - 0.5) * 22;
    const size = 1.5 + r() * 2.2;
    const dur = 9 + r() * 16;
    const delay = -r() * 24;
    const peak = 0.45 + r() * 0.45;
    motes.push({ xVw, yVh, size, dur, delay, peak });
  }
  return motes;
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npm test -- geometry`
Expected: PASS（全 describe ブロック緑）

- [ ] **Step 5: コミット**

```bash
git add src/lib/shards/geometry.ts src/lib/shards/geometry.test.ts
git commit -m "$(cat <<'EOF'
feat: 鏡片カードの幾何計算モジュールを追加

シャード型作品一覧の下地として、クリップ形状・厚みパネル・稜線・
散逸配置・ちり光を計算する純関数モジュールを追加。DOM非依存で
vitestによる決定論性・値域テストが可能。

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_0138fUVSy7GzXdg5cjhWhZg2
EOF
)"
```

---

## Task 2: 共有 SVG defs（ShardDefs.svelte）とデザイントークン

**Files:**
- Create: `src/lib/components/ShardDefs.svelte`
- Modify: `src/app.css`

**Interfaces:**
- Consumes: `CLIP_SHAPES` from `src/lib/shards/geometry.ts`（Task 1）。
- Produces（以降のタスクが参照する共有リソース）:
  - DOM id: `shard-clip-0` 〜 `shard-clip-5`（`<clipPath clipPathUnits="objectBoundingBox">`）
  - DOM id: `shard-grain`（`<filter>`、feTurbulence によるグレイン）
  - CSS カスタムプロパティ（`:root` と `.dark` の両方で定義）:
    `--shard-glow-bg`, `--shard-tint-gradient`, `--shard-tint-opacity`,
    `--shard-grain-opacity`, `--shard-glint-opacity`, `--shard-sheen-gradient`,
    `--shard-dust-color`, `--shard-dust-opacity`

- [ ] **Step 1: ShardDefs.svelte を作成する**

`src/lib/components/ShardDefs.svelte`:

```svelte
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
```

- [ ] **Step 2: app.css にライトモードのシャードトークンを追加する**

`src/app.css` の 28 行目 `--danger: oklch(0.56 0.14 28);` の直後に追加する:

```
old_string:
  --accent-haze-soft: oklch(0.92 0.04 230);
  --danger: oklch(0.56 0.14 28);

new_string:
  --accent-haze-soft: oklch(0.92 0.04 230);
  --danger: oklch(0.56 0.14 28);

  /* --- shard (鏡片カード) --- */
  --shard-glow-bg: radial-gradient(
    closest-side,
    oklch(0.72 0.09 285 / 0.3),
    oklch(0.32 0.03 285 / 0.35) 70%,
    transparent 100%
  );
  --shard-tint-gradient: linear-gradient(
    160deg,
    oklch(1 0 0 / 0.35),
    transparent 40%,
    oklch(0.4 0.06 285 / 0.14) 100%
  );
  --shard-tint-opacity: 0.55;
  --shard-grain-opacity: 0.1;
  --shard-glint-opacity: 0.5;
  --shard-sheen-gradient: linear-gradient(
    115deg,
    transparent 30%,
    oklch(1 0 0 / 0.2) 42%,
    oklch(1 0 0 / 0.5) 50%,
    oklch(0.75 0.08 285 / 0.18) 58%,
    transparent 70%
  );
  --shard-dust-color: oklch(0.55 0.1 285);
  --shard-dust-opacity: 0.5;
```

- [ ] **Step 3: app.css にダークモードのシャードトークンを追加する**

`.dark` ブロック内の `--danger: oklch(0.68 0.16 25);` の直後に追加する:

```
old_string:
  --accent-haze-soft: oklch(0.28 0.05 230);
  --danger: oklch(0.68 0.16 25);

new_string:
  --accent-haze-soft: oklch(0.28 0.05 230);
  --danger: oklch(0.68 0.16 25);

  /* --- shard (鏡片カード) --- */
  --shard-glow-bg: radial-gradient(
    closest-side,
    oklch(0.46 0.15 285 / 0.35),
    oklch(0 0 0 / 0.55) 70%,
    transparent 100%
  );
  --shard-tint-gradient: linear-gradient(
    160deg,
    oklch(0.76 0.09 285 / 0.18),
    transparent 40%,
    oklch(0.2 0.04 285 / 0.3) 100%
  );
  --shard-tint-opacity: 1;
  --shard-grain-opacity: 0.16;
  --shard-glint-opacity: 0.8;
  --shard-sheen-gradient: linear-gradient(
    115deg,
    transparent 30%,
    oklch(1 0 0 / 0.16) 42%,
    oklch(1 0 0 / 0.42) 50%,
    oklch(0.75 0.12 285 / 0.16) 58%,
    transparent 70%
  );
  --shard-dust-color: oklch(1 0 0);
  --shard-dust-opacity: 0.9;
```

- [ ] **Step 4: 構造検証（このタスクにはコンポーネント単体テストを設けない）**

理由: `ShardDefs.svelte` は SVG defs のみを描画する副作用のないプレゼンテーション用コンポーネントで、参照する `id` はすべて Task 1 のテスト済み定数（`CLIP_SHAPES`）から導出される。ロジックがないため、`npm run check` の型検証と `npm run build` のコンパイル成功で十分。

Run: `npm run check`
Expected: 既存ベースライン（75 エラー / 28 警告）から増えていないこと。

Run: `npm run build`
Expected: `✓ built` で終了すること（wrangler のログファイル書き込みエラーは無視してよい。ビルド自体の成否には影響しない）。

- [ ] **Step 5: コミット**

```bash
git add src/lib/components/ShardDefs.svelte src/app.css
git commit -m "$(cat <<'EOF'
feat: 鏡片カード用の共有SVG defsとデザイントークンを追加

クリップ形状6種とグレインフィルタを共有SVG defsとして切り出し、
鏡片の光沢・厚み・ちり光に使うカスタムプロパティをライト/ダーク
両方のデザイントークンに追加。

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_0138fUVSy7GzXdg5cjhWhZg2
EOF
)"
```

---

## Task 3: 鏡片カード本体（ShardCard.svelte）

**Files:**
- Create: `src/lib/components/ShardCard.svelte`

**Interfaces:**
- Consumes:
  - `hashSeed`, `CLIP_SHAPES`, `buildSlab`, `buildEdges`, `glintPos`, `scatterParams` from `src/lib/shards/geometry.ts`（Task 1）
  - DOM id `shard-clip-{0..5}` と `shard-grain`、CSS変数 `--shard-*` from `ShardDefs.svelte` / `src/app.css`（Task 2、ページ内に既に設置されている前提）
  - `formatDate` from `src/lib/utils/date.ts`（既存）
- Produces（Task 5 が利用する）:
  ```ts
  // props
  { item: {
      id: string;
      name: string | null;
      series?: string | null;
      isHandmade?: number | null;
      thumbUrl: string | null;
      isPublic: number;
      status: string;
      createdAt?: string | null;
      tags?: { id: string; name: string }[];
    };
    isOwner?: boolean;
    index?: number;
  }
  ```

- [ ] **Step 1: ShardCard.svelte を実装する**

`src/lib/components/ShardCard.svelte`:

```svelte
<!-- src/lib/components/ShardCard.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { formatDate } from '$lib/utils/date';
  import {
    hashSeed,
    CLIP_SHAPES,
    buildSlab,
    buildEdges,
    glintPos,
    scatterParams,
  } from '$lib/shards/geometry';

  let {
    item,
    isOwner = false,
    index = 0,
  }: {
    item: {
      id: string;
      name: string | null;
      series?: string | null;
      isHandmade?: number | null;
      thumbUrl: string | null;
      isPublic: number;
      status: string;
      createdAt?: string | null;
      tags?: { id: string; name: string }[];
    };
    isOwner?: boolean;
    index?: number;
  } = $props();

  // item.id から決定論的に導く seed。同じ作品は再訪しても同じ形・傾き・浮遊周期になる。
  const seed = hashSeed(item.id);
  const clipIdx = seed % CLIP_SHAPES.length;
  const scatter = scatterParams(seed);
  const slabPanels = buildSlab(clipIdx, seed);
  const edges = buildEdges(clipIdx);
  const glint = glintPos(clipIdx);
  const enterDelay = index * 0.05;

  const kindLabel =
    item.isHandmade === 1 ? 'HANDMADE / 自作' : item.isHandmade === 0 ? 'COLLECTED / 購入' : 'ITEM';

  function quadPoints(quad: readonly { x: number; y: number }[]): string {
    return quad.map((p) => `${p.x},${p.y}`).join(' ');
  }

  // ポインタチルト。pointer:fine かつ非 reduced-motion のときのみ、
  // イベント発生ごとに能力を再評価する（タッチ端末でチルトが固定表示される
  // 既修正バグと同じガード。src/routes/items/+page.svelte の handleTilt を参照）。
  let tiltX = $state(0);
  let tiltY = $state(0);
  let stageEl: HTMLDivElement;

  function handleTilt(e: MouseEvent) {
    if (
      !window.matchMedia('(pointer: fine)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const rect = stageEl.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    tiltX = (0.5 - py) * 14;
    tiltY = (px - 0.5) * 14;
  }
  function resetTilt() {
    tiltX = 0;
    tiltY = 0;
  }

  // 画面外では bob（浮遊）を止め、毎フレームの再ラスタライズを避ける。
  let inView = $state(false);
  let rootEl: HTMLAnchorElement;
  onMount(() => {
    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
      },
      { rootMargin: '200px 0px' },
    );
    io.observe(rootEl);
    return () => io.disconnect();
  });
</script>

<a
  href="/items/{item.id}"
  class="piece"
  bind:this={rootEl}
  style="--dx:{scatter.dx}px; --dy:{scatter.dy}px; --rot:{scatter.rot}deg; --dur:{scatter.dur}s; --del:{scatter.del}s; --edel:{enterDelay}s"
>
  <div class="glow" style="transform:rotate(var(--rot))"></div>
  <div class={'bob' + (inView ? ' --in-view' : '')}>
    <div class="stage" bind:this={stageEl} onmousemove={handleTilt} onmouseleave={resetTilt} role="presentation">
      <div class="tilt" style="transform:rotateX({tiltX}deg) rotateY({tiltY}deg)">
        <div class="shard-stack">
          <svg class="slab" viewBox="0 0 100 120" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              {#if item.thumbUrl}
                <image
                  id="slab-photo-{item.id}"
                  href={item.thumbUrl}
                  x="0"
                  y="0"
                  width="100"
                  height="120"
                  preserveAspectRatio="xMidYMid slice"
                />
              {/if}
              {#each slabPanels as panel, i (i)}
                <clipPath id="slab-clip-{item.id}-{i}" clipPathUnits="userSpaceOnUse">
                  <polygon points={quadPoints(panel.quad)} />
                </clipPath>
                <linearGradient
                  id="slab-grad-{item.id}-{i}"
                  x1={panel.gradientFrom.x}
                  y1={panel.gradientFrom.y}
                  x2={panel.gradientTo.x}
                  y2={panel.gradientTo.y}
                  gradientUnits="userSpaceOnUse"
                >
                  {#each panel.stops as stop (stop.offset)}
                    <stop offset={stop.offset} stop-color={stop.color} stop-opacity={stop.opacity} />
                  {/each}
                </linearGradient>
              {/each}
            </defs>
            {#each slabPanels as panel, i (i)}
              <g clip-path="url(#slab-clip-{item.id}-{i})">
                {#if item.thumbUrl}
                  <use href="#slab-photo-{item.id}" transform={panel.photoTransform} opacity={panel.photoOpacity} />
                {/if}
                <polygon
                  points={quadPoints(panel.quad)}
                  fill="url(#slab-grad-{item.id}-{i})"
                  stroke={panel.strokeColor}
                  stroke-opacity={panel.strokeOpacity}
                  stroke-width={panel.strokeWidth}
                />
              </g>
            {/each}
          </svg>
          <div
            class="shard"
            style="clip-path:url(#shard-clip-{clipIdx}); view-transition-name: item-img-{item.id}"
          >
            {#if item.thumbUrl}
              <img class="photo" src={item.thumbUrl} alt={item.name ?? '名称未設定'} loading="lazy" />
            {:else}
              <div class="photo photo-empty">✦</div>
            {/if}
            <div class="tint"></div>
            <div class="grain"></div>
            <svg class="edgeline" viewBox="0 0 100 120" preserveAspectRatio="none" aria-hidden="true">
              {#each edges as edge, i (i)}
                <line
                  x1={edge.x1}
                  y1={edge.y1}
                  x2={edge.x2}
                  y2={edge.y2}
                  stroke={edge.color}
                  stroke-opacity={edge.opacity}
                  stroke-width={edge.width}
                  stroke-linecap="round"
                />
              {/each}
            </svg>
            <div class="glint" style="--gx:{glint.xPct}%; --gy:{glint.yPct}%"></div>
            <div class="sheen"></div>
            {#if isOwner && item.isPublic === 0}
              <div class="lock-badge" aria-hidden="true">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="meta">
    <span class="cat">{kindLabel}</span>
    <h2>{item.name ?? '名称未設定'}</h2>
    <p>{item.series ?? '—'}</p>
    {#if item.tags && item.tags.length > 0}
      <div class="tags">
        {#each item.tags as tag (tag.id)}
          <span class="tag-chip">{tag.name}</span>
        {/each}
      </div>
    {/if}
    <time class="mono">{formatDate(item.createdAt)}</time>
  </div>
</a>

<style>
  .piece {
    --rot: 0deg;
    --dx: 0px;
    --dy: 0px;
    --dur: 8s;
    --del: 0s;
    --edel: 0s;
    position: relative;
    display: block;
    /* 左右は%指定: 傾き・浮遊のはみ出しがカード幅に比例するため。上下は固定px。 */
    padding: 46px 9% 24px;
    text-decoration: none;
    color: inherit;
    transform: translate(var(--dx), var(--dy));
    animation: shard-enter 700ms var(--ease-out) both;
    animation-delay: var(--edel, 0s);
    content-visibility: auto;
    contain-intrinsic-size: 280px 560px;
  }
  @keyframes shard-enter {
    from {
      opacity: 0;
      transform: translate(var(--dx), calc(var(--dy) + 30px));
    }
    to {
      opacity: 1;
      transform: translate(var(--dx), var(--dy));
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .piece {
      animation: none;
      opacity: 1;
    }
  }

  .glow {
    position: absolute;
    inset: 6% 8%;
    border-radius: 50%;
    background: var(--shard-glow-bg);
    filter: blur(22px);
    z-index: 0;
    pointer-events: none;
  }
  .piece:hover .glow,
  .piece:focus-visible .glow {
    filter: blur(26px);
  }

  .bob {
    position: relative;
    z-index: 1;
    animation: shard-bob var(--dur) ease-in-out var(--del) infinite;
    animation-play-state: paused;
  }
  .bob.--in-view {
    animation-play-state: running;
  }
  .piece:hover .bob,
  .piece:focus-visible .bob {
    animation-play-state: paused;
  }
  @keyframes shard-bob {
    0%,
    100% {
      transform: translateY(0) rotate(var(--rot));
    }
    50% {
      transform: translateY(-12px) rotate(calc(var(--rot) * 0.55));
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .bob {
      animation: none;
    }
  }

  .stage {
    perspective: 700px;
  }
  .tilt {
    transition: transform 500ms var(--ease-out);
    transform-style: preserve-3d;
  }
  @media (prefers-reduced-motion: reduce) {
    .tilt {
      transition: none;
    }
  }

  .shard-stack {
    position: relative;
    width: 100%;
    aspect-ratio: 5 / 6;
    transition: transform 500ms var(--ease-out);
  }
  .piece:hover .shard-stack,
  .piece:focus-visible .shard-stack {
    transform: scale(1.03);
  }

  .slab {
    position: absolute;
    inset: 0;
    z-index: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    display: block;
  }

  .shard {
    position: absolute;
    inset: 0;
    z-index: 1;
  }
  .shard .photo {
    position: absolute;
    inset: 0;
    z-index: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    filter: contrast(1.05) saturate(0.85) brightness(0.97);
  }
  .shard .photo-empty {
    display: grid;
    place-items: center;
    background: var(--bg-sunk);
    font-family: var(--f-display);
    font-size: 40px;
    opacity: 0.3;
    color: var(--fg);
  }
  .tint {
    position: absolute;
    inset: 0;
    z-index: 1;
    background: var(--shard-tint-gradient);
    opacity: var(--shard-tint-opacity);
    mix-blend-mode: soft-light;
    pointer-events: none;
  }
  .grain {
    position: absolute;
    inset: 0;
    z-index: 2;
    filter: url(#shard-grain);
    mix-blend-mode: overlay;
    opacity: var(--shard-grain-opacity);
    pointer-events: none;
  }
  .edgeline {
    position: absolute;
    inset: 0;
    z-index: 3;
    width: 100%;
    height: 100%;
    mix-blend-mode: screen;
    pointer-events: none;
  }
  .glint {
    position: absolute;
    inset: 0;
    z-index: 4;
    background: radial-gradient(circle at var(--gx, 50%) var(--gy, 0%), oklch(1 0 0 / 0.95), oklch(1 0 0 / 0) 7%);
    mix-blend-mode: screen;
    opacity: var(--shard-glint-opacity);
    pointer-events: none;
  }
  .sheen {
    position: absolute;
    inset: -40%;
    z-index: 5;
    background: var(--shard-sheen-gradient);
    transform: translateX(-18%);
    transition: transform 1100ms cubic-bezier(0.3, 0.7, 0.2, 1);
    pointer-events: none;
  }
  .piece:hover .sheen,
  .piece:focus-visible .sheen {
    transform: translateX(38%);
  }
  @media (prefers-reduced-motion: reduce) {
    .sheen {
      transition: none;
    }
  }

  .lock-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 6;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: oklch(0 0 0 / 0.45);
    display: grid;
    place-items: center;
    color: oklch(1 0 0);
  }

  .meta {
    position: relative;
    z-index: 1;
    margin: 18px 4px 40px;
    border-left: 1px solid var(--line);
    padding-left: 14px;
  }
  .meta .cat {
    font-family: var(--f-mono);
    font-size: 10.5px;
    letter-spacing: 0.3em;
    color: var(--accent-amber);
    text-transform: uppercase;
  }
  .meta h2 {
    font-family: var(--f-display);
    font-weight: 400;
    font-size: 17px;
    letter-spacing: 0.02em;
    color: var(--fg);
    margin: 6px 0 4px;
  }
  .meta p {
    font-size: 12px;
    line-height: 1.7;
    color: var(--fg-soft);
    margin: 0 0 8px;
  }
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 8px;
  }
  .tag-chip {
    font-family: var(--f-mono);
    font-size: 10px;
    letter-spacing: 0.04em;
    padding: 2px 8px;
    border-radius: var(--r-pill);
    background: var(--bg-sunk);
    color: var(--fg-soft);
    box-shadow: var(--neu-inset);
  }
  .meta time {
    display: block;
    font-size: 11px;
    letter-spacing: 0.1em;
    color: var(--fg-soft);
  }
</style>
```

- [ ] **Step 2: 構造検証（このタスクにはコンポーネント単体テストを設けない）**

理由: jsdom 環境（`vitest-setup.ts`）には `IntersectionObserver` のポリフィルがなく、`ShardCard.svelte` は `onMount` で実際に `new IntersectionObserver(...)` を呼ぶため、`@testing-library/svelte` の `render()` はマウント時に `ReferenceError` で失敗する。グローバルなポリフィル追加はこの機能の範囲を超えるため見送る。幾何計算のロジックは Task 1 で純関数として単体テスト済みであり、`ShardCard` 自体は主にその出力をテンプレートへ配線する層である。したがって本タスクの合格基準は「`npm run check` のベースライン維持」と「`npm run build` の成功」とし、実際のインタラクション（チルト・bob 一時停止・ホバーシーン）の視覚確認はユーザーに依頼する。

Run: `npm run check`
Expected: 既存ベースライン（75 エラー / 28 警告）から増えていないこと。

Run: `npm run build`
Expected: `✓ built` で終了すること。

- [ ] **Step 3: コミット**

```bash
git add src/lib/components/ShardCard.svelte
git commit -m "$(cat <<'EOF'
feat: 鏡片カード(ShardCard)を実装

不定形クリップ・厚みパネル・稜線・グリント・ホバーシーン・ポインタ
チルト・浮遊を備えた鏡片カードコンポーネントを追加。幾何データは
geometry.tsから取得し、SVGは#eachで宣言的に描画する({@html}不使用)。

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_0138fUVSy7GzXdg5cjhWhZg2
EOF
)"
```

---

## Task 4: ちり光（DustField.svelte）

**Files:**
- Create: `src/lib/components/DustField.svelte`
- Test: `src/lib/components/DustField.test.ts`

**Interfaces:**
- Consumes: `buildDust` from `src/lib/shards/geometry.ts`（Task 1）、`--shard-dust-color`/`--shard-dust-opacity` from `src/app.css`（Task 2）。
- Produces: `DustField.svelte`（props なし。ページに 1 回設置する）。

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/components/DustField.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import DustField from './DustField.svelte';
import { buildDust } from '$lib/shards/geometry';

describe('DustField', () => {
  it('固定 seed から生成した粒の数だけ .mote を描画する', () => {
    const { container } = render(DustField);
    const motes = container.querySelectorAll('.mote');
    expect(motes).toHaveLength(buildDust(4242, 22).length);
  });

  it('aria-hidden を設定し操作を妨げない', () => {
    const { container } = render(DustField);
    const root = container.querySelector('.dust-field');
    expect(root).toHaveAttribute('aria-hidden', 'true');
  });

  it('決定論的な座標をインラインスタイルに反映する', () => {
    const { container } = render(DustField);
    const first = container.querySelector('.mote') as HTMLElement;
    const expected = buildDust(4242, 22)[0];
    expect(first.style.left).toBe(`${expected.xVw}vw`);
    expect(first.style.top).toBe(`${expected.yVh}vh`);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npm test -- DustField`
Expected: FAIL（`DustField.svelte` が存在しない）

- [ ] **Step 3: DustField.svelte を実装する**

`src/lib/components/DustField.svelte`:

```svelte
<!-- src/lib/components/DustField.svelte -->
<!-- ちり光（前景 depth-fx）。固定 seed で決定論生成、常時 ON。 -->
<script lang="ts">
  import { buildDust } from '$lib/shards/geometry';

  const DUST_SEED = 4242;
  const DUST_COUNT = 22;
  const motes = buildDust(DUST_SEED, DUST_COUNT);
</script>

<div class="dust-field" aria-hidden="true">
  {#each motes as mote, i (i)}
    <span
      class="mote"
      style="left:{mote.xVw}vw; top:{mote.yVh}vh; width:{mote.size}px; height:{mote.size}px; --tw-dur:{mote.dur}s; --tw-delay:{mote.delay}s; --tw-peak:{mote.peak};"
    ></span>
  {/each}
</div>

<style>
  .dust-field {
    position: fixed;
    inset: 0;
    z-index: 6;
    pointer-events: none;
    opacity: var(--shard-dust-opacity);
  }
  .mote {
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      var(--shard-dust-color) 0%,
      color-mix(in oklch, var(--shard-dust-color) 70%, transparent) 45%,
      transparent 75%
    );
    box-shadow: 0 0 4px 1px color-mix(in oklch, var(--shard-dust-color) 55%, transparent);
    opacity: 0;
    animation: mote-twinkle var(--tw-dur, 5s) ease-in-out var(--tw-delay, 0s) infinite;
  }
  @keyframes mote-twinkle {
    0%,
    96%,
    100% {
      opacity: 0;
      transform: scale(0.6);
    }
    98% {
      opacity: var(--tw-peak, 0.85);
      transform: scale(1);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .mote {
      animation: none !important;
      opacity: 0.3 !important;
    }
  }
</style>
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npm test -- DustField`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/lib/components/DustField.svelte src/lib/components/DustField.test.ts
git commit -m "$(cat <<'EOF'
feat: ちり光コンポーネント(DustField)を追加

固定seedで決定論生成される前景depth-fx（ちり光）を追加。
position:fixed・pointer-events:none・aria-hiddenで常時ON表示する。

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_0138fUVSy7GzXdg5cjhWhZg2
EOF
)"
```

---

## Task 5: 作品一覧ページへの統合（+page.svelte / app.css / ItemCard 削除）

**Files:**
- Modify: `src/routes/items/+page.svelte`
- Modify: `src/app.css`
- Delete: `src/lib/components/ItemCard.svelte`

**Interfaces:**
- Consumes: `ShardCard`（Task 3）, `ShardDefs`（Task 2）, `DustField`（Task 4）。
- Produces: ページの `layout === "grid"` 表示がシャード表示になる。他タスクへの新規公開 API なし（末端タスク）。

- [ ] **Step 1: スクリプト部分を編集する — import と列分割ロジックの撤去**

`src/routes/items/+page.svelte` の import と state 宣言を変更する:

```
old_string:
<script lang="ts">
  import type { PageData } from "./$types";
  import { onMount } from "svelte";
  import ItemCard from "$lib/components/ItemCard.svelte";
  import GlitchText from "$lib/components/GlitchText.svelte";
  import { formatDate } from "$lib/utils/date";
  import { replaceState } from "$app/navigation";
  import { page } from "$app/state";
  import { reveal } from "$lib/actions/reveal";

  let { data }: { data: PageData } = $props();

  let items: any[] = $state([]);
  let offset = $state(0);
  const limit = 30;
  let loading = $state(false);
  let hasMore = $state(true);
  let query = $state(page.url.searchParams.get("q") ?? "");
  let kindFilter = $state(page.url.searchParams.get("kind") ?? "all");
  let sort = $state(page.url.searchParams.get("sort") ?? "recent");
  let activeTags = $state<string[]>(
    page.url.searchParams.get("tags")?.split(",").filter(Boolean) ?? [],
  );
  let layout = $state("grid");
  let columnCount = $state(4);
  let columns = $derived(
    Array.from({ length: columnCount }, (_, col) =>
      items.filter((_, i) => i % columnCount === col),
    ),
  );

new_string:
<script lang="ts">
  import type { PageData } from "./$types";
  import { onMount } from "svelte";
  import ShardCard from "$lib/components/ShardCard.svelte";
  import ShardDefs from "$lib/components/ShardDefs.svelte";
  import DustField from "$lib/components/DustField.svelte";
  import GlitchText from "$lib/components/GlitchText.svelte";
  import { formatDate } from "$lib/utils/date";
  import { replaceState } from "$app/navigation";
  import { page } from "$app/state";
  import { reveal } from "$lib/actions/reveal";

  let { data }: { data: PageData } = $props();

  let items: any[] = $state([]);
  let offset = $state(0);
  const limit = 30;
  let loading = $state(false);
  let hasMore = $state(true);
  let query = $state(page.url.searchParams.get("q") ?? "");
  let kindFilter = $state(page.url.searchParams.get("kind") ?? "all");
  let sort = $state(page.url.searchParams.get("sort") ?? "recent");
  let activeTags = $state<string[]>(
    page.url.searchParams.get("tags")?.split(",").filter(Boolean) ?? [],
  );
  let layout = $state("grid");
  // シャードは固定 5:6 比のため、ビューポート幅に応じた列分割は不要
  // （CSS の repeat(auto-fill, minmax(240px, 1fr)) に一本化する）。
  const SKELETON_COUNT = 8;
```

- [ ] **Step 2: onMount からビューポート幅監視ロジックを削除する**

```
old_string:
    const updateColumns = () => {
      columnCount =
        window.innerWidth <= 720 ? 2 : window.innerWidth <= 1100 ? 3 : 4;
    };
    updateColumns();
    window.addEventListener("resize", updateColumns);
    fetchItems();
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) fetchItems();
    });
    observer.observe(sentinel);
    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener("resize", updateColumns);
    };
  });

new_string:
    fetchItems();
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) fetchItems();
    });
    observer.observe(sentinel);
    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  });
```

- [ ] **Step 3: ShardDefs / DustField をページに設置する**

```
old_string:
<div class="app">
  <!-- ヒーロー -->
  <section class="hero rise">

new_string:
<div class="app">
  <ShardDefs />
  <DustField />
  <!-- ヒーロー -->
  <section class="hero rise">
```

- [ ] **Step 4: グリッド表示を ShardCard に置換する**

```
old_string:
  <!-- アイテム一覧 -->
  {#if layout === "grid"}
    <div class="items-grid">
      {#each columns as column, colIdx (colIdx)}
        <div class="items-column">
          {#each column as item (item.id)}
            <ItemCard {item} isOwner={!!data.user} />
          {/each}
        </div>
      {/each}
    </div>
  {:else}

new_string:
  <!-- アイテム一覧 -->
  {#if layout === "grid"}
    <div class="items-grid">
      {#each items as item, i (item.id)}
        <ShardCard {item} isOwner={!!data.user} index={i % limit} />
      {/each}
    </div>
  {:else}
```

**注記:** `index` は `i % limit`（`limit` は既存の1ページあたり取得件数 30）とする。無限スクロールで追記されるたびに `items` 配列全体の絶対 index が増え続けるため、単純に `i` を渡すとページを重ねるごとに enter アニメの遅延（`index * 0.05s`）が際限なく伸びてしまう。バッチ内相対 index にすることで、どのページの追記でも 0〜1.45s のスタガーに収まる。

- [ ] **Step 5: スケルトンをシャード形状に変更する**

```
old_string:
  {#if loading}
    <div class="skel-grid" aria-hidden="true">
      {#each Array(columnCount * 2) as _, i (i)}
        <div class="skel-card" style="animation-delay: {i * 90}ms">
          <div class="skel-img"></div>
          <div class="skel-line"></div>
          <div class="skel-line --short"></div>
        </div>
      {/each}
    </div>
  {/if}

new_string:
  {#if loading}
    <div class="skel-grid" aria-hidden="true">
      {#each Array(SKELETON_COUNT) as _, i (i)}
        <div
          class="skel-shard"
          style="animation-delay: {i * 90}ms; clip-path: url(#shard-clip-{i % 6})"
        ></div>
      {/each}
    </div>
  {/if}
```

- [ ] **Step 6: 空状態文言を変更する**

```
old_string:
  {#if !loading && items.length === 0}
    <div style="text-align:center; padding:80px 20px; color:var(--fg-soft)">
      <div
        style="font-family:var(--f-display); font-size:36px; margin-bottom:12px"
      >
        該当なし
      </div>
      <div style="font-size:13px; color:var(--fg-mute)">
        フィルタを変えるか、新しいアイテムを登録してください。
      </div>
    </div>
  {/if}

new_string:
  {#if !loading && items.length === 0}
    <div class="shard-empty">この分類の欠片はまだ拾われていません。</div>
  {/if}
```

- [ ] **Step 7: ページ末尾の `<style>` に `.shard-empty` を追加する**

```
old_string:
  .row-date {
    font-size: 11px;
    color: var(--fg-soft);
    white-space: nowrap;
  }
</style>

new_string:
  .row-date {
    font-size: 11px;
    color: var(--fg-soft);
    white-space: nowrap;
  }

  .shard-empty {
    text-align: center;
    padding: 80px 20px;
    color: var(--fg-soft);
    font-size: 13px;
    letter-spacing: 0.05em;
  }
</style>
```

- [ ] **Step 8: app.css の `.items-grid` / `.items-column` を auto-fill グリッドに置換する**

```
old_string:
/* --- items grid --- */
.items-grid {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}
@media (max-width: 1100px) {
  .items-grid {
    gap: 16px;
  }
}
@media (max-width: 720px) {
  .items-grid {
    gap: 12px;
  }
}
.items-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
@media (max-width: 1100px) {
  .items-column {
    gap: 16px;
  }
}
@media (max-width: 720px) {
  .items-column {
    gap: 12px;
  }
}

new_string:
/* --- items grid（シャードは固定 5:6 比のため CSS grid の auto-fill に統一。
   ビューポート幅に応じた JS 列分割は不要） --- */
.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 28px 3vw;
}
@media (max-width: 1100px) {
  .items-grid {
    gap: 20px 3vw;
  }
}
@media (max-width: 720px) {
  .items-grid {
    gap: 12px 4vw;
  }
}
```

- [ ] **Step 9: app.css の `.skel-grid` をシャード形状スケルトンに置換する**

```
old_string:
/* --- skeleton --- */
.skel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 24px;
  margin-top: 24px;
}
.skel-card {
  background: var(--surface-raised);
  border-radius: var(--r);
  padding: 14px;
  box-shadow: var(--neu-soft);
  animation: skel-pulse 1.6s ease-in-out infinite;
}
.skel-img {
  aspect-ratio: 4/5;
  border-radius: calc(var(--r) - 6px);
  background: var(--bg-sunk);
  box-shadow: var(--neu-inset);
  margin-bottom: 14px;
}
.skel-line {
  height: 12px;
  border-radius: 6px;
  background: var(--bg-sunk);
  box-shadow: var(--neu-inset);
  margin-bottom: 8px;
}
.skel-line.--short {
  width: 55%;
  margin-bottom: 0;
}
@keyframes skel-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}
@media (prefers-reduced-motion: reduce) {
  .skel-card { animation: none; }
}

new_string:
/* --- skeleton（シャード枠。列数に依存しない auto-fill グリッド） --- */
.skel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 28px 3vw;
  margin-top: 24px;
}
.skel-shard {
  aspect-ratio: 5/6;
  background: var(--bg-sunk);
  box-shadow: var(--neu-inset);
  animation: skel-pulse 1.6s ease-in-out infinite;
}
@keyframes skel-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}
@media (prefers-reduced-motion: reduce) {
  .skel-shard { animation: none; }
}
```

- [ ] **Step 10: ItemCard.svelte を削除する**

```bash
git rm src/lib/components/ItemCard.svelte
```

Expected: `src/lib/components/ItemCard.svelte` の使用箇所が他に存在しないことを事前確認済み（`grep -rln "ItemCard" src/` で `+page.svelte` と自身のみがヒットする状態だった）。

- [ ] **Step 11: 検証する**

Run: `npm run check`
Expected: 既存ベースライン（75 エラー / 28 警告）から増えていないこと。

Run: `npm test`
Expected: 既存 102 件 + Task 1/4 の新規テスト全て PASS。

Run: `npm run build`
Expected: `✓ built` で終了すること。

- [ ] **Step 12: コミット**

```bash
git add src/routes/items/+page.svelte src/app.css
git commit -m "$(cat <<'EOF'
refactor: 作品一覧をシャード表示に置き換え、ItemCardを削除

グリッド表示をShardCardによる鏡片表示に置換し、ビューポート幅に
応じたJS列分割(columns/columnCount)を撤去してCSS gridのauto-fillに
一本化。スケルトンもシャード枠に更新し、空状態文言を
「この分類の欠片はまだ拾われていません。」に変更。ItemCard.svelteは
使用箇所がなくなったため削除。リスト表示・検索・並べ替え・無限
スクロール・URL同期は変更なし。

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_0138fUVSy7GzXdg5cjhWhZg2
EOF
)"
```

---

## Task 6: 最終検証

**Files:** なし（検証のみ）

**Interfaces:**
- Consumes: Task 1〜5 の全成果物。
- Produces: なし（末端タスク）。

- [ ] **Step 1: check ベースライン比較**

Run: `npm run check`
Expected: エラー数・警告数が導入前のベースライン（75 エラー / 28 警告）以下であること。増えていた場合は Task 1〜5 に戻って型エラーを修正する。

- [ ] **Step 2: test 全件 PASS 確認**

Run: `npm test`
Expected: 既存 102 件 + `geometry.test.ts`（Task 1） + `DustField.test.ts`（Task 4）が全て PASS。

- [ ] **Step 3: build 成功確認**

Run: `npm run build`
Expected: `✓ built` で終了。ShardCard/ShardDefs/DustField/+page.svelte の構造的な正しさ（型・importパス・テンプレート構文）を最終確認する。

- [ ] **Step 4: ユーザーへの視覚確認依頼**

サンドボックス内では `npm run dev` が起動できない（`.dev.vars` 読み取り拒否 + D1/R2 バインディング）ため、以下をユーザーに依頼する:

- ライトモード / ダークモード両方でシャードの色味・光沢・稜線が意図通りか
- タッチ端末でポインタチルトが発火せず、タップ後に固定表示されないか
- OS の「動きを減らす」設定で bob・チルト・シーン・ちり光・enter アニメーションが停止するか
- 無限スクロールで追記されたカードにも enter stagger と bob 一時停止が効くか（スタガーが際限なく伸びていないか）
- 作品詳細ページへの遷移で `view-transition-name: item-img-{id}` によるビュートランジションが機能するか
- 写真未登録の作品で ✦ プレースホルダが表示され、slab に写真映り込みが出ないか

このタスクにはコミット不要（コード変更なし）。

---

## Self-Review（このプランの執筆時点でのセルフレビュー結果）

**1. Spec coverage（設計書の各項目 → 対応タスク）:**

| 設計書の項目 | 対応タスク |
|---|---|
| geometry.ts の全関数（hashSeed/rng/CLIP_SHAPES/edgeExposure/buildSlab/buildEdges/glintPos/scatterParams/buildDust） | Task 1 |
| ShardDefs.svelte（clipPath×6 + grain フィルタ） | Task 2 |
| ShardCard.svelte（glow/bob/stage/tilt/slab SVG/shard(photo,tint,grain,edgeline,glint,sheen)/meta、props、{@html}禁止、ID一意化、タッチガード、view-transition維持） | Task 3 |
| DustField.svelte（固定seed、fixed、aria-hidden、常時ON） | Task 4 |
| +page.svelte 統合（列分割撤去、grid化、スケルトン更新、空状態文言、ShardDefs/DustField設置、ItemCard削除、リスト表示は現状維持） | Task 5 |
| カードのメタ情報マッピング（cat行/タイトル/シリーズ/登録日/タグ、card-badge廃止） | Task 3（meta ブロック） |
| 配色翻訳（紫中心230–320のhueスイープ、ライト/ダークの差） | Task 1（hue計算）+ Task 2（トークン） |
| モーション・パフォーマンス（content-visibility、IO によるbob一時停止、静的フィルタ層とアニメ層の分離、reduced-motion対応） | Task 3 |
| エラー・エッジケース（写真なし、フィルタ結果0件、無限スクロール追加分のseed安定性） | Task 3, Task 5 |
| テスト・検証（geometry.test.ts の各項目、checkベースライン、testベースライン） | Task 1, Task 6 |
| 採用しないもの（散逸ソート、件数表示、比較トグルUI） | 該当タスクなし＝実装しない（YAGNI として明記済み） |

すべての設計書項目に対応タスクがあることを確認した。ギャップなし。

**2. Placeholder scan:** 「TBD」「後で」「適切に処理」等のプレースホルダ文言は本文中に存在しない。各ステップに実コード・実コマンド・期待出力を記載済み。

**3. Type consistency チェックで見つけて直した問題:**

- 当初 `buildSlab` に `idPrefix` 引数を持たせる案を検討したが、設計書では ID 一意化を ShardCard の責務としているため、`buildSlab(polyIdx, seed): SlabPanel[]` に引数を絞り、SVG id 生成（`slab-clip-{item.id}-{i}` 等）は Task 3 側で行うよう修正した。
- `buildSlab` の戻り値を `{ panels: [] }` のラッパーではなく `SlabPanel[]` 直に統一し、`buildEdges` の `EdgeLine[]` と対称な形にした。
- ShardCard の CSS で `class:--in-view={inView}` という Svelte の `class:` ディレクティブ構文を使うと、クラス名が `--` で始まるため既存コードの慣習（`ItemCard.svelte` の `class={'card-badge ' + (...)}` 等）と食い違う。既存コードは一貫して三項演算子での文字列結合を使っているため、`class={'bob' + (inView ? ' --in-view' : '')}` に修正した。
- 無限スクロールで追記される ShardCard の `index` prop に素の配列 index（`i`）を渡すと、ページを重ねるごとに enter アニメの遅延が際限なく伸びる問題に気づき、`index={i % limit}` （バッチ内相対 index）に修正した。
- ポインタチルトの実装で、タッチ固定表示バグの既修正パターン（`src/routes/items/+page.svelte` の `handleTilt`）を確認し、`mousemove`/`mouseleave` ＋ハンドラ内での `matchMedia` 再評価という同じガード構造を ShardCard にも採用した（モックの `pointermove` ではなく、既存の実証済みパターンに合わせた）。

**4. 設計書との差異（理由付き）:**

- **ShardCard/DustField の単体テスト範囲を限定した。** 設計書は「geometry モジュールに集中させ、コンポーネントタスクは check/test ベースライン＋構造検証を合格基準にしてよい」と許容している。本計画では実際に jsdom 環境（`vitest-setup.ts`）を調査し、`IntersectionObserver` のポリフィルが存在しないことを確認した。`DustField` は IO や `matchMedia` に依存しないため実際にレンダリングテストを書いた（Task 4）。`ShardCard` は `onMount` で `IntersectionObserver` を生成するため jsdom でのレンダリングが例外で失敗する。グローバルなポリフィル追加は本機能のスコープを超えるため見送り、`npm run check` + `npm run build` による構造検証に留めた（Task 3 Step 2 に理由を明記）。
- **`buildSlab`/`buildEdges`/`scatterParams` は seed から独立した `rng()` ストリームをそれぞれ生成する。** モックは単一の `rng(it.seed)` インスタンスを使い回して散逸配置→厚みパネルのオフセットを連続的に消費するが、本実装は各関数が同じ `seed` から独立してストリームを開始する。これにより各関数が単体で決定論的にテスト可能になる（設計書が要求する「テスト・検証」の決定論性チェックを満たすため）。視覚的な乱数の出方はモックと厳密には一致しないが、同じ LCG アルゴリズムのため統計的な散らばり方は同等。
- **hue2 のオフセットをモックの `-24°`（150°幅基準）から `-14°`（90°幅基準）に比例縮小した。** 設計書は「紫中心の約230–320」というレンジのみを指定し、副次的な hue2 オフセットの具体値までは規定していない。レンジ幅の変更比率（90/150）をそのままオフセットにも適用し、視覚的な色分裂の強さを保った。
- **空状態のマークアップを1行のテキストに簡略化した。** 旧実装は見出し＋補足文の2行構成だったが、設計書が指定する文言は1行のみであり、モックの `.empty` も1行構成だったため、それに合わせた。
