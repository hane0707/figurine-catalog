// src/routes/api/photos/[id]/server.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH } from './+server';

const mockPhotoRows = vi.fn();
const mockWhere = vi.fn().mockResolvedValue(undefined);

vi.mock('$lib/server/db', () => ({
  getDb: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: mockPhotoRows,
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: mockWhere,
      })),
    })),
  })),
  photos: { id: 'id', itemId: 'itemId', r2KeyOrig: 'r2KeyOrig', r2KeyThumb: 'r2KeyThumb', isCover: 'isCover', sortOrder: 'sortOrder' },
}));

const ctx = (locals: Record<string, unknown> = { user: { email: 'test@example.com' } }) => ({
  params: { id: 'photo-1' },
  platform: { env: { DB: {} } },
  locals,
  request: new Request('http://localhost'),
});

describe('PATCH /api/photos/[id]: カバー写真設定', () => {
  beforeEach(() => vi.clearAllMocks());

  it('未ログイン → 401', async () => {
    await expect(PATCH(ctx({}) as any)).rejects.toMatchObject({ status: 401 });
  });

  it('写真が存在しない → 404', async () => {
    mockPhotoRows.mockResolvedValue([]);
    await expect(PATCH(ctx() as any)).rejects.toMatchObject({ status: 404 });
  });

  it('ログイン済み + 写真存在 → ok: true', async () => {
    mockPhotoRows.mockResolvedValue([{ id: 'photo-1', itemId: 'item-1', isCover: 0 }]);
    const res = await PATCH(ctx() as any);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(mockWhere).toHaveBeenCalledTimes(2);
  });
});
