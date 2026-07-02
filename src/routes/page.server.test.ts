import { describe, it, expect } from 'vitest';
import { load } from './+page.server';

describe('/ ルート', () => {
  it('/items へ 302 リダイレクトする', () => {
    try {
      // load は引数を使わないため空オブジェクトで十分
      (load as any)({});
      expect.unreachable('redirect が throw されるはず');
    } catch (e: any) {
      expect(e.status).toBe(302);
      expect(e.location).toBe('/items');
    }
  });
});
