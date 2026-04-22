import { describe, it, expect, vi } from 'vitest';
import { load, actions } from './+page.server';

function makeLoadEvent(overrides: { devEmail?: string; user?: { email: string } }) {
  return {
    locals: overrides.user ? { user: overrides.user } : {},
    platform: overrides.devEmail
      ? { env: { DEV_ADMIN_EMAIL: overrides.devEmail } }
      : { env: {} },
  };
}

function makeCookies() {
  const store = new Map<string, string>();
  return {
    set: vi.fn((name: string, value: string) => store.set(name, value)),
    delete: vi.fn((name: string) => store.delete(name)),
    get: (name: string) => store.get(name),
  };
}

describe('/admin load', () => {
  it('本番環境（DEV_ADMIN_EMAIL なし）→ /items へリダイレクト', () => {
    try {
      load(makeLoadEvent({}) as any);
      expect.fail('リダイレクトが throw されるべき');
    } catch (e: any) {
      expect(e.status).toBe(302);
      expect(e.location).toBe('/items');
    }
  });

  it('devモード + ログイン済み → /items へリダイレクト', () => {
    try {
      load(makeLoadEvent({ devEmail: 'dev@example.com', user: { email: 'dev@example.com' } }) as any);
      expect.fail('リダイレクトが throw されるべき');
    } catch (e: any) {
      expect(e.status).toBe(302);
      expect(e.location).toBe('/items');
    }
  });

  it('devモード + 未ログイン → ページ表示（throw しない）', () => {
    expect(() =>
      load(makeLoadEvent({ devEmail: 'dev@example.com' }) as any)
    ).not.toThrow();
  });
});

describe('/admin actions: login', () => {
  it('DEV_ADMIN_EMAIL なし → /items へリダイレクト', () => {
    const cookies = makeCookies();
    try {
      actions.login({ cookies, platform: { env: {} } } as any);
      expect.fail('リダイレクトが throw されるべき');
    } catch (e: any) {
      expect(e.status).toBe(302);
      expect(e.location).toBe('/items');
    }
    expect(cookies.set).not.toHaveBeenCalled();
  });

  it('DEV_ADMIN_EMAIL あり → dev_logged_in クッキーをセットして /items へリダイレクト', () => {
    const cookies = makeCookies();
    try {
      actions.login({ cookies, platform: { env: { DEV_ADMIN_EMAIL: 'dev@example.com' } } } as any);
      expect.fail('リダイレクトが throw されるべき');
    } catch (e: any) {
      expect(e.status).toBe(302);
      expect(e.location).toBe('/items');
    }
    expect(cookies.set).toHaveBeenCalledWith('dev_logged_in', '1', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    });
  });
});

describe('/admin actions: logout', () => {
  it('dev_logged_in クッキーを削除して /admin へリダイレクト', () => {
    const cookies = makeCookies();
    try {
      actions.logout({ cookies } as any);
      expect.fail('リダイレクトが throw されるべき');
    } catch (e: any) {
      expect(e.status).toBe(302);
      expect(e.location).toBe('/admin');
    }
    expect(cookies.delete).toHaveBeenCalledWith('dev_logged_in', { path: '/' });
  });
});
