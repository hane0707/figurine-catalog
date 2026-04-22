import { describe, it, expect } from 'vitest';
import { load } from './+page.server';

describe('/items/[id] load: 認証ガード', () => {
  it('locals.user がない場合は /admin へ 302 リダイレクト', async () => {
    try {
      await load({ locals: {}, params: { id: 'test-id' }, platform: { env: {} } } as any);
      expect.fail('リダイレクトが throw されるべき');
    } catch (e: any) {
      expect(e.status).toBe(302);
      expect(e.location).toBe('/admin');
    }
  });
});
