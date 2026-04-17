// src/routes/items/new/+page.server.ts
import type { PageServerLoad } from './$types';
import { getDb, tags, materials } from '$lib/server/db';

export const load: PageServerLoad = async ({ platform }) => {
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
