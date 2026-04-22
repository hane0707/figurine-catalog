import { describe, it, expect, vi } from 'vitest';
import { handle } from './hooks.server';

function makeEvent(overrides: {
  devEmail?: string;
  devLoggedIn?: string;
  cfJwt?: string;
}) {
  const cookies = new Map<string, string>();
  if (overrides.devLoggedIn) cookies.set('dev_logged_in', overrides.devLoggedIn);
  if (overrides.cfJwt) cookies.set('CF_Authorization', overrides.cfJwt);

  return {
    platform: overrides.devEmail
      ? { env: { DEV_ADMIN_EMAIL: overrides.devEmail } }
      : { env: {} },
    cookies: {
      get: (name: string) => cookies.get(name),
    },
    locals: {} as { user?: { email: string } },
  };
}

describe('handle: devバイパス', () => {
  it('DEV_ADMIN_EMAIL あり + dev_logged_in=1 → locals.user がセットされる', async () => {
    const event = makeEvent({ devEmail: 'dev@example.com', devLoggedIn: '1' });
    const resolve = vi.fn().mockResolvedValue(new Response());
    await handle({ event: event as any, resolve });
    expect(event.locals.user).toEqual({ email: 'dev@example.com' });
  });

  it('DEV_ADMIN_EMAIL あり + dev_logged_in クッキーなし → locals.user はセットされない', async () => {
    const event = makeEvent({ devEmail: 'dev@example.com' });
    const resolve = vi.fn().mockResolvedValue(new Response());
    await handle({ event: event as any, resolve });
    expect(event.locals.user).toBeUndefined();
  });

  it('DEV_ADMIN_EMAIL なし → resolve が呼ばれる（JWTフローへ）', async () => {
    const event = makeEvent({});
    const resolve = vi.fn().mockResolvedValue(new Response());
    await handle({ event: event as any, resolve });
    expect(resolve).toHaveBeenCalledWith(event);
  });
});
