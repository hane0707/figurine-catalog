import { describe, it, expect } from 'vitest';
import { load } from './+layout.server';

describe('/items layout: 認証ガード', () => {
  it('locals.user がある場合はリダイレクトしない', () => {
    const locals = { user: { email: 'dev@example.com' } };
    expect(() => load({ locals } as any)).not.toThrow();
  });

  it('locals.user がない場合は /admin へ 302 リダイレクト', () => {
    const locals = {};
    try {
      load({ locals } as any);
      expect.fail('リダイレクトが throw されるべき');
    } catch (e: any) {
      expect(e.status).toBe(302);
      expect(e.location).toBe('/admin');
    }
  });
});
