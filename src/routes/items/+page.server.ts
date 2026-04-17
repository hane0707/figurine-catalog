import type { PageServerLoad } from './$types';
import { getDb, tags } from '$lib/server/db';

export const load: PageServerLoad = async ({ platform }) => {
  const db = getDb(platform!.env.DB);
  const allTags = await db.select().from(tags).orderBy(tags.name);
  return { tags: allTags };
};
