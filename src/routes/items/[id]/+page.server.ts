// src/routes/items/[id]/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb, items, tags, materials } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { getPresignedGetUrl } from '$lib/server/r2';

export const load: PageServerLoad = async ({ params, platform }) => {
  const db = getDb(platform!.env.DB);

  const [item, allTags, allMaterials] = await Promise.all([
    db.query.items.findFirst({
      where: eq(items.id, params.id),
      with: {
        photos: { orderBy: (p, { asc }) => [asc(p.sortOrder)] },
        purchaseInfo: true,
        handmadeInfo: true,
        itemTags: { with: { tag: true } },
        itemMaterials: { with: { material: true } },
      },
    }),
    db.select().from(tags).orderBy(tags.name),
    db.select().from(materials),
  ]);

  if (!item) throw error(404, 'アイテムが見つかりません');

  const photosWithUrls = await Promise.all(
    item.photos.map(async (p) => ({
      ...p,
      thumbUrl: await getPresignedGetUrl(platform!.env, p.r2KeyThumb),
      origUrl: await getPresignedGetUrl(platform!.env, p.r2KeyOrig),
    }))
  );

  const frequent = allMaterials.filter((m) => m.isPreset).slice(0, 6);

  return {
    item: { ...item, photos: photosWithUrls },
    allTags,
    materials: { all: allMaterials, frequent },
  };
};
