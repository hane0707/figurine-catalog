// Drizzle ORM スキーマ定義（Cloudflare D1 / SQLite）
// 注意: SQLite は ON UPDATE をサポートしないため、updatedAt は UPDATE 時にアプリ層で
//       new Date().toISOString() を手動セットすること。
import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql, relations } from 'drizzle-orm';

export const items = sqliteTable('items', {
  id: text('id').primaryKey(),
  name: text('name'), // null 可: クイック登録フローで写真のみ保存を許容
  series: text('series'),
  isHandmade: integer('is_handmade'), // 0=購入品, 1=自作品, NULL=未設定
  isPublic: integer('is_public').notNull().default(0), // 0=非公開, 1=公開
  purchaseInfoPublic: integer('purchase_info_public').notNull().default(0),
  handmadeInfoPublic: integer('handmade_info_public').notNull().default(0),
  status: text('status').notNull().default('owned'), // 'owned' | 'parted'
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`), // UPDATE 時は手動更新
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

// リレーション定義
export const itemsRelations = relations(items, ({ many, one }) => ({
  photos: many(photos),
  purchaseInfo: one(purchaseInfo, { fields: [items.id], references: [purchaseInfo.itemId] }),
  handmadeInfo: one(handmadeInfo, { fields: [items.id], references: [handmadeInfo.itemId] }),
  itemTags: many(itemTags),
  itemMaterials: many(itemMaterials),
}));

export const photosRelations = relations(photos, ({ one }) => ({
  item: one(items, { fields: [photos.itemId], references: [items.id] }),
}));

export const purchaseInfoRelations = relations(purchaseInfo, ({ one }) => ({
  item: one(items, { fields: [purchaseInfo.itemId], references: [items.id] }),
}));

export const handmadeInfoRelations = relations(handmadeInfo, ({ one }) => ({
  item: one(items, { fields: [handmadeInfo.itemId], references: [items.id] }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  itemTags: many(itemTags),
}));

export const itemTagsRelations = relations(itemTags, ({ one }) => ({
  item: one(items, { fields: [itemTags.itemId], references: [items.id] }),
  tag: one(tags, { fields: [itemTags.tagId], references: [tags.id] }),
}));

export const materialsRelations = relations(materials, ({ many }) => ({
  itemMaterials: many(itemMaterials),
}));

export const itemMaterialsRelations = relations(itemMaterials, ({ one }) => ({
  item: one(items, { fields: [itemMaterials.itemId], references: [items.id] }),
  material: one(materials, { fields: [itemMaterials.materialId], references: [materials.id] }),
}));
