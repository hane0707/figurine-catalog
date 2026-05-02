import { describe, it, expect, vi } from 'vitest';
import { POST, GET } from './+server';

vi.mock('$lib/server/db', () => ({
  getDb: vi.fn(() => ({
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => ({
                offset: vi.fn().mockResolvedValue([]),
              })),
            })),
          })),
        })),
      })),
    })),
  })),
  items: {},
  photos: {},
  itemTags: {},
  tags: {},
}));
vi.mock('$lib/server/r2', () => ({ getPresignedGetUrl: vi.fn().mockResolvedValue('') }));
vi.mock('$lib/utils/uuid', () => ({ generateId: vi.fn(() => 'generated-id') }));

const makeRequest = (body: unknown) =>
  new Request('http://localhost/api/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const platform = { env: { DB: {} } };
const locals = { user: { email: 'test@example.com' } };

describe('POST /api/items バリデーション', () => {
  it('name が 101 文字 → 400', async () => {
    const res = await POST({ request: makeRequest({ name: 'a'.repeat(101) }), platform, locals } as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('id に スラッシュ → 400', async () => {
    const res = await POST({ request: makeRequest({ id: 'bad/id' }), platform, locals } as any);
    expect(res.status).toBe(400);
  });

  it('正常なリクエスト → 201', async () => {
    const res = await POST({ request: makeRequest({ name: 'フィギュア' }), platform, locals } as any);
    expect(res.status).toBe(201);
  });
});

describe('GET /api/items バリデーション', () => {
  it('offset が負数 → 400', async () => {
    const url = new URL('http://localhost/api/items?offset=-1');
    const res = await GET({ url, platform, locals } as any);
    expect(res.status).toBe(400);
  });

  it('正常なリクエスト → 200', async () => {
    const url = new URL('http://localhost/api/items');
    const res = await GET({ url, platform, locals } as any);
    expect(res.status).toBe(200);
  });
});
