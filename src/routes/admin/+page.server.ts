import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = ({ locals, platform }) => {
  // 本番環境（DEV_ADMIN_EMAIL なし）: /items へ（CF Accessが認証を担う）
  if (!platform?.env?.DEV_ADMIN_EMAIL) throw redirect(302, '/items');
  // 既にログイン済みなら /items へ
  if (locals.user) throw redirect(302, '/items');
  // devモード・未ログイン → ログインページを表示
  return {};
};

export const actions: Actions = {
  login: ({ cookies, platform }) => {
    if (!platform?.env?.DEV_ADMIN_EMAIL) throw redirect(302, '/items');
    cookies.set('dev_logged_in', '1', { path: '/', httpOnly: true, sameSite: 'lax', secure: false });
    throw redirect(302, '/items');
  },
  logout: ({ cookies }) => {
    cookies.delete('dev_logged_in', { path: '/' });
    throw redirect(302, '/items');
  },
};
