// src/routes/api/tags/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, tags } from '$lib/server/db';
import { sql } from 'drizzle-orm';
import { generateId } from '$lib/utils/uuid';
import { tagNameSchema } from '$lib/validation/schemas';
import { validationError } from '$lib/validation/errors';

export const GET: RequestHandler = async ({ platform }) => {
  const db = getDb(platform!.env.DB);
  const rows = await db.select().from(tags).orderBy(tags.name);
  return json(rows);
};

export const POST: RequestHandler = async ({ request, platform, locals }) => {
  if (!locals.user) throw error(401, 'Unauthorized');
  const db = getDb(platform!.env.DB);
  const { name } = await request.json() as { name: string };
  const normalized = name.trim();
  const nameResult = tagNameSchema.safeParse(normalized);
  if (!nameResult.success) return validationError(nameResult.error);

  const existing = await db.select().from(tags).where(
    sql`lower(${tags.name}) = lower(${normalized})`
  );
  if (existing.length > 0) return json(existing[0]);

  const id = generateId();
  await db.insert(tags).values({ id, name: normalized });
  return json({ id, name: normalized }, { status: 201 });
};
