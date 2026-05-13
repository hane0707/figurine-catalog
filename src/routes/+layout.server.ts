import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, platform }) => {
  return {
    user: locals.user ?? null,
    isDevMode: !!platform?.env?.DEV_ADMIN_EMAIL,
    cfTeamDomain: platform?.env?.CF_ACCESS_TEAM_DOMAIN ?? null,
  };
};
