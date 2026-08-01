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
