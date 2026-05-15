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

describe('/items/[id] load: purchaseInfo/handmadeInfo フィルタリング', () => {
  const baseItem = {
    id: 'test-id',
    isPublic: 1,
    purchaseInfoPublic: 0,
    handmadeInfoPublic: 0,
    photos: [],
    itemTags: [],
    itemMaterials: [],
  };

  it('未ログイン + purchaseInfoPublic=0 → purchaseInfo が null', async () => {
    mockFindFirst.mockResolvedValueOnce({
      ...baseItem,
      purchaseInfo: { storeName: 'Shop A', purchasePrice: 10000 },
      handmadeInfo: null,
    });
    const result = await load({
      locals: {},
      params: { id: 'test-id' },
      platform: { env: { DB: {} } },
    } as any);
    expect(result.item.purchaseInfo).toBeNull();
  });

  it('未ログイン + purchaseInfoPublic=1 → purchaseInfo が返る', async () => {
    mockFindFirst.mockResolvedValueOnce({
      ...baseItem,
      purchaseInfoPublic: 1,
      purchaseInfo: { storeName: 'Shop A', purchasePrice: 10000 },
      handmadeInfo: null,
    });
    const result = await load({
      locals: {},
      params: { id: 'test-id' },
      platform: { env: { DB: {} } },
    } as any);
    expect(result.item.purchaseInfo).not.toBeNull();
    expect(result.item.purchaseInfo?.storeName).toBe('Shop A');
  });

  it('未ログイン + handmadeInfoPublic=0 → handmadeInfo が null', async () => {
    mockFindFirst.mockResolvedValueOnce({
      ...baseItem,
      purchaseInfo: null,
      handmadeInfo: { quote: '秘密の台詞', notes: 'メモ', productionStart: '2024-01-01', productionEnd: null },
    });
    const result = await load({
      locals: {},
      params: { id: 'test-id' },
      platform: { env: { DB: {} } },
    } as any);
    expect(result.item.handmadeInfo).toBeNull();
  });

  it('未ログイン + handmadeInfoPublic=1 → handmadeInfo が返る', async () => {
    mockFindFirst.mockResolvedValueOnce({
      ...baseItem,
      handmadeInfoPublic: 1,
      purchaseInfo: null,
      handmadeInfo: { quote: '公開の台詞', notes: null, productionStart: null, productionEnd: null },
    });
    const result = await load({
      locals: {},
      params: { id: 'test-id' },
      platform: { env: { DB: {} } },
    } as any);
    expect(result.item.handmadeInfo).not.toBeNull();
    expect(result.item.handmadeInfo?.quote).toBe('公開の台詞');
  });

  it('ログイン済み + purchaseInfoPublic=0 → purchaseInfo が返る（オーナーは常に見える）', async () => {
    mockFindFirst.mockResolvedValueOnce({
      ...baseItem,
      purchaseInfo: { storeName: 'Secret Shop', purchasePrice: 99999 },
      handmadeInfo: null,
    });
    const result = await load({
      locals: { user: { email: 'owner@example.com' } },
      params: { id: 'test-id' },
      platform: { env: { DB: {} } },
    } as any);
    expect(result.item.purchaseInfo).not.toBeNull();
    expect(result.item.purchaseInfo?.storeName).toBe('Secret Shop');
  });

  it('ログイン済み + handmadeInfoPublic=0 → handmadeInfo が返る', async () => {
    mockFindFirst.mockResolvedValueOnce({
      ...baseItem,
      purchaseInfo: null,
      handmadeInfo: { quote: '非公開の台詞', notes: null, productionStart: null, productionEnd: null },
    });
    const result = await load({
      locals: { user: { email: 'owner@example.com' } },
      params: { id: 'test-id' },
      platform: { env: { DB: {} } },
    } as any);
    expect(result.item.handmadeInfo).not.toBeNull();
    expect(result.item.handmadeInfo?.quote).toBe('非公開の台詞');
  });
});
