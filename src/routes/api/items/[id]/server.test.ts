import { describe, it, expect, vi } from 'vitest';
import { PATCH } from './+server';

vi.mock('$lib/server/db', () => ({
  getDb: vi.fn(() => ({
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })) })),
    delete: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
  })),
  items: {}, purchaseInfo: {}, handmadeInfo: {}, itemTags: {}, itemMaterials: {},
}));

const makeCtx = (body: unknown) => ({
  params: { id: 'item-1' },
  platform: { env: { DB: {} } },
  locals: { user: { email: 'test@example.com' } },
  request: new Request('http://localhost', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),
});

describe('PATCH /api/items/[id] バリデーション', () => {
  it('name が 101 文字 → 400', async () => {
    const res = await PATCH(makeCtx({ name: 'a'.repeat(101) }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('purchasePrice が負数 → 400', async () => {
    const res = await PATCH(makeCtx({ purchaseInfo: { purchasePrice: -1 } }) as any);
    expect(res.status).toBe(400);
  });

  it('productionEnd が productionStart より前 → 400', async () => {
    const res = await PATCH(makeCtx({
      handmadeInfo: { productionStart: '2024-06-01', productionEnd: '2024-05-31' },
    }) as any);
    expect(res.status).toBe(400);
  });

  it('isHandmade が 2 → 400', async () => {
    const res = await PATCH(makeCtx({ isHandmade: 2 }) as any);
    expect(res.status).toBe(400);
  });

  it('正常なリクエスト → ok: true', async () => {
    const res = await PATCH(makeCtx({ name: 'テスト' }) as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
