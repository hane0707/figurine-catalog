import type { Handle } from '@sveltejs/kit';

function decodeCfJwt(token: string): { email?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(payload);
    return JSON.parse(json) as { email?: string };
  } catch {
    return null;
  }
}

export const handle: Handle = async ({ event, resolve }) => {
  // ローカル開発バイパス（DEV_ADMIN_EMAIL がセットされていれば認証済みとみなす）
  const devEmail = event.platform?.env?.DEV_ADMIN_EMAIL;
  if (devEmail) {
    event.locals.user = { email: devEmail };
    return resolve(event);
  }

  // 本番: CF Access JWT を解析
  const cfJwt = event.cookies.get('CF_Authorization');
  if (cfJwt) {
    const claims = decodeCfJwt(cfJwt);
    if (claims?.email) {
      event.locals.user = { email: claims.email };
    }
  }

  return resolve(event);
};
