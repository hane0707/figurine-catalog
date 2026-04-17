import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const items = sqliteTable('items', {
  id: text('id').primaryKey(),
  name: text('name'),
  series: text('series'),
  isHandmade: integer('is_handmade'), // 0=購入品, 1=自作品, NULL=未設定
  isPublic: integer('is_public').notNull().default(0),
  purchaseInfoPublic: integer('purchase_info_public').notNull().default(0),
  handmadeInfoPublic: integer('handmade_info_public').notNull().default(0),
  status: text('status').notNull().default('owned'), // 'owned' | 'parted'
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const photos = sqliteTable('photos', {
  id: text('id').primaryKey(),
  itemId: text('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  r2KeyOrig: text('r2_key_orig').notNull(),
  r2KeyThumb: text('r2_key_thumb').notNull(),
  isCover: integer('is_cover').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const purchaseInfo = sqliteTable('purchase_info', {
  itemId: text('item_id').primaryKey().references(() => items.id, { onDelete: 'cascade' }),
  storeName: text('store_name'),
  eventName: text('event_name'),
  purchaseDate: text('purchase_date'),
  purchasePrice: integer('purchase_price'),
  maker: text('maker'),
  artistName: text('artist_name'),
});

export const handmadeInfo = sqliteTable('handmade_info', {
  itemId: text('item_id').primaryKey().references(() => items.id, { onDelete: 'cascade' }),
  productionStart: text('production_start'),
  productionEnd: text('production_end'),
  notes: text('notes'),
});

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
});

export const itemTags = sqliteTable('item_tags', {
  itemId: text('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => ({ pk: primaryKey({ columns: [t.itemId, t.tagId] }) }));

export const materials = sqliteTable('materials', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  isPreset: integer('is_preset').notNull().default(0),
});

export const itemMaterials = sqliteTable('item_materials', {
  itemId: text('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  materialId: text('material_id').notNull().references(() => materials.id, { onDelete: 'cascade' }),
}, (t) => ({ pk: primaryKey({ columns: [t.itemId, t.materialId] }) }));
