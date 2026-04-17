import { describe, it, expect } from 'vitest';
import { generateId } from './uuid';

describe('generateId', () => {
  it('UUID v4形式の文字列を返す', () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('呼び出しごとに異なる値を返す', () => {
    const ids = new Set(Array.from({ length: 100 }, generateId));
    expect(ids.size).toBe(100);
  });
});
