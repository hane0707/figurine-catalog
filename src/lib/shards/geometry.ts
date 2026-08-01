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
