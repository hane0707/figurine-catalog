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
    expect(root?.getAttribute('aria-hidden')).toBe('true');
  });

  it('決定論的な座標をインラインスタイルに反映する', () => {
    const { container } = render(DustField);
    const first = container.querySelector('.mote') as HTMLElement;
    const expected = buildDust(4242, 22)[0];
    expect(first.style.left).toBe(`${expected.xVw}vw`);
    expect(first.style.top).toBe(`${expected.yVh}vh`);
  });
});
