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

  it('各形状が7頂点を持つ（分数座標・100x120頂点配列とも、リテラル期待値で検証）', () => {
    CLIP_SHAPES.forEach((shape) => {
      expect(shape.trim().split(' ')).toHaveLength(7);
    });
    SHARD_POLYS.forEach((poly) => {
      expect(poly).toHaveLength(7);
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

describe('hue 値域の回帰防止', () => {
  // buildSlab/buildEdges は hueAt(t) = HUE_MIN + t * HUE_SPAN（230–320°、紫アクセント中心）
  // を主要な色相として使う。モックは 198–348°（cyan→magenta）だったため、実装の定数が
  // 誤って戻された場合に検出できるよう、生成された hsl(...) 文字列から hue を実際に
  // パースして境界値を検証する。
  //
  // buildSlab の stops[1].color だけは意図的に hue2（hue から HUE2_OFFSET=14 を引いた値）
  // を使っており、hue が下限 230 に近いときは 230 を下回り得る（例: hue=230 → hue2=216）。
  // これは設計上の意図（中間色をわずかに寒色側にずらす）であり回帰ではないため、
  // このテストでは hue を直接使う値（strokeColor / stops先頭・末尾 / buildEdges の color）
  // のみを対象にする。
  function extractHue(color: string): number {
    const match = color.match(/^hsl\((-?\d+(?:\.\d+)?)/);
    if (!match) {
      throw new Error(`hsl(...) 形式ではない色文字列です: ${color}`);
    }
    return Number(match[1]);
  }

  it('buildEdges の hue が全形状で 230–320 に収まる', () => {
    for (let polyIdx = 0; polyIdx < SHARD_POLYS.length; polyIdx++) {
      buildEdges(polyIdx).forEach((edge) => {
        const hue = extractHue(edge.color);
        expect(hue).toBeGreaterThanOrEqual(230);
        expect(hue).toBeLessThanOrEqual(320);
      });
    }
  });

  it('buildSlab の主要 hue（strokeColor・stops先頭/末尾）が全形状・複数 seed で 230–320 に収まる', () => {
    for (let polyIdx = 0; polyIdx < SHARD_POLYS.length; polyIdx++) {
      for (let seed = 0; seed < 20; seed++) {
        const panels = buildSlab(polyIdx, seed * 131 + polyIdx);
        panels.forEach((panel) => {
          const strokeHue = extractHue(panel.strokeColor);
          expect(strokeHue).toBeGreaterThanOrEqual(230);
          expect(strokeHue).toBeLessThanOrEqual(320);

          const firstStopHue = extractHue(panel.stops[0].color);
          expect(firstStopHue).toBeGreaterThanOrEqual(230);
          expect(firstStopHue).toBeLessThanOrEqual(320);

          const lastStopHue = extractHue(panel.stops[panel.stops.length - 1].color);
          expect(lastStopHue).toBeGreaterThanOrEqual(230);
          expect(lastStopHue).toBeLessThanOrEqual(320);
        });
      }
    }
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
