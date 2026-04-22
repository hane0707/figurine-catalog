// src/routes/items/new/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb, tags, materials } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals, platform }) => {
  if (!locals.user) throw redirect(302, '/admin');
  const db = getDb(platform!.env.DB);
  const [allTags, allMaterials] = await Promise.all([
    db.select().from(tags).orderBy(tags.name),
    db.select().from(materials),
  ]);
  const frequent = allMaterials.filter((m) => m.isPreset).slice(0, 6);
  return {
    allTags,
    materials: { all: allMaterials, frequent },
  };
};
