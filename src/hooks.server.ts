import type { Handle } from '@sveltejs/kit';

interface CfJwk extends JsonWebKey {
  kid?: string;
}

const CERTS_CACHE = new Map<string, { keys: CfJwk[]; cachedAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10分

async function fetchCfPublicKeys(teamDomain: string): Promise<CfJwk[]> {
  const cached = CERTS_CACHE.get(teamDomain);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) return cached.keys;

  const res = await fetch(`https://${teamDomain}.cloudflareaccess.com/cdn-cgi/access/certs`);
  if (!res.ok) return [];
  const data = await res.json() as { keys: CfJwk[] };
  CERTS_CACHE.set(teamDomain, { keys: data.keys, cachedAt: Date.now() });
  return data.keys;
}

async function verifyCfJwt(
  token: string,
  aud: string,
  teamDomain: string,
): Promise<{ email?: string } | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  // ヘッダーから kid を取得
  let kid: string | undefined;
  try {
    const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/'))) as { kid?: string };
    kid = header.kid;
  } catch { return null; }

  // 公開鍵一覧を取得
  const jwks = await fetchCfPublicKeys(teamDomain);
  const jwk = (kid ? (jwks as CfJwk[]).find(k => k.kid === kid) : jwks[0]) ?? null;
  if (!jwk) return null;

  try {
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const enc = new TextEncoder();
    const signingInput = enc.encode(`${parts[0]}.${parts[1]}`);
    const signature = Uint8Array.from(
      atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0),
    );

    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, signature, signingInput);
    if (!valid) return null;

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
      email?: string;
      aud?: string | string[];
      exp?: number;
    };

    // aud 検証
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audiences.includes(aud)) return null;

    // 有効期限検証
    if (payload.exp === undefined || payload.exp < Math.floor(Date.now() / 1000)) return null;

    return { email: payload.email };
  } catch {
    return null;
  }
}


export const handle: Handle = async ({ event, resolve }) => {
  // ローカル開発バイパス（DEV_ADMIN_EMAIL がセットされていて dev_logged_in=1 の場合のみ認証済みとみなす）
  const devEmail = event.platform?.env?.DEV_ADMIN_EMAIL;
  if (devEmail) {
    const loggedIn = event.cookies.get('dev_logged_in');
    if (loggedIn === '1') {
      event.locals.user = { email: devEmail };
    }
    return resolve(event);
  }

  // 本番: CF Access JWT を検証
  const cfJwt = event.cookies.get('CF_Authorization');
  let dbg = 'no-cookie';

  if (cfJwt) {
    const aud = event.platform?.env?.CF_ACCESS_AUD;
    const teamDomain = event.platform?.env?.CF_ACCESS_TEAM_DOMAIN;
    dbg = `cookie=ok,aud=${aud ? 'set' : 'missing'},team=${teamDomain ? 'set' : 'missing'}`;

    let claims: { email?: string } | null = null;

    if (aud && teamDomain) {
      claims = await verifyCfJwt(cfJwt, aud, teamDomain);
      dbg += `,verify=${claims ? 'ok' : 'fail'}`;
    }

    if (claims?.email) {
      event.locals.user = { email: claims.email };
      dbg += ',user=set';
    }
  }

  const response = await resolve(event);
  response.headers.set('X-CF-Debug', dbg); // TODO: デバッグ確認後に削除
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
};
