import { describe, it, expect, vi } from 'vitest';

const mockFindFirst = vi.fn();

vi.mock('$lib/server/db', () => {
  const chain: any = {
    from: () => chain,
    orderBy: () => Promise.resolve([]),
    then: (resolve: (v: any[]) => any) => resolve([]),
  };
  return {
    getDb: () => ({
      query: { items: { findFirst: mockFindFirst } },
      select: () => chain,
    }),
    items: {},
    tags: {},
    materials: {},
  };
});

vi.mock('$lib/server/r2', () => ({
  getPresignedGetUrl: async () => 'https://example.com/photo.jpg',
}));

import { load } from './+page.server';

describe('/items/[id] load: 認証ガード', () => {
  it('アイテムが存在しない場合は 404 エラー', async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    try {
      await load({ locals: {}, params: { id: 'test-id' }, platform: { env: { DB: {} } } } as any);
      expect.fail('エラーが throw されるべき');
    } catch (e: any) {
      expect(e.status).toBe(404);
    }
  });

  it('locals.user がなく非公開アイテムは 404 エラー', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: 'test-id',
      isPublic: 0,
      photos: [],
      purchaseInfo: null,
      handmadeInfo: null,
      itemTags: [],
      itemMaterials: [],
    });
    try {
      await load({ locals: {}, params: { id: 'test-id' }, platform: { env: { DB: {} } } } as any);
      expect.fail('エラーが throw されるべき');
    } catch (e: any) {
      expect(e.status).toBe(404);
    }
  });
});
