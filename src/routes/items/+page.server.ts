import type { PageServerLoad } from './$types';
import { getDb, items, photos, tags } from '$lib/server/db';
import { getPresignedGetUrl } from '$lib/server/r2';
import { eq, and, sql, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ platform, locals }) => {
  const db = getDb(platform!.env.DB);
  const publicFilter = locals.user ? undefined : eq(items.isPublic, 1);

  const [allTags, statsRows, spotlightRows] = await Promise.all([
    db.select().from(tags).orderBy(tags.name),
    db.select({
      total: sql<number>`count(*)`,
      handmade: sql<number>`sum(case when ${items.isHandmade} = 1 then 1 else 0 end)`,
      bought: sql<number>`sum(case when ${items.isHandmade} = 0 then 1 else 0 end)`,
      series: sql<number>`count(distinct ${items.series})`,
    }).from(items).where(publicFilter),
    db.select({
      id: items.id,
      name: items.name,
      series: items.series,
      isHandmade: items.isHandmade,
      r2KeyThumb: photos.r2KeyThumb,
      r2KeyOrig: photos.r2KeyOrig,
    }).from(items)
      .innerJoin(photos, and(eq(photos.itemId, items.id), eq(photos.isCover, 1)))
      .where(publicFilter)
      .orderBy(desc(items.createdAt))
      .limit(1),
  ]);

  const stats = statsRows[0] ?? { total: 0, handmade: 0, bought: 0, series: 0 };

  let spotlight = null;
  if (spotlightRows[0]) {
    const row = spotlightRows[0];
    const [thumbUrl, origUrl] = await Promise.all([
      getPresignedGetUrl(platform!.env, row.r2KeyThumb),
      getPresignedGetUrl(platform!.env, row.r2KeyOrig),
    ]);
    spotlight = { ...row, thumbUrl, origUrl };
  }

  return { tags: allTags, stats, spotlight };
};
