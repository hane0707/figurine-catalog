import { z } from 'zod';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[a-zA-Z0-9_-]+$/;

export const clientIdSchema = z.string().regex(ID_RE).max(36);

export const tagNameSchema = z.string().min(1).max(50);
export const materialNameSchema = z.string().min(1).max(50);

export const purchaseInfoSchema = z.object({
  storeName:     z.string().max(100).nullable().optional(),
  eventName:     z.string().max(100).nullable().optional(),
  purchaseDate:  z.string().regex(DATE_RE).nullable().optional(),
  purchasePrice: z.number().int().min(0).max(100_000_000).nullable().optional(),
  maker:         z.string().max(100).nullable().optional(),
  artistName:    z.string().max(100).nullable().optional(),
});

export const handmadeInfoBaseSchema = z.object({
  productionStart: z.string().regex(DATE_RE).nullable().optional(),
  productionEnd:   z.string().regex(DATE_RE).nullable().optional(),
  quote: z.string().max(500).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

// refine を持つ ZodEffects は .shape を持たないため、フィールド単体検証には
// handmadeInfoBaseSchema.shape を使い、前後関係チェックにはこちらを使う
export const handmadeInfoSchema = handmadeInfoBaseSchema.refine(
  (d) => {
    if (d.productionStart && d.productionEnd) {
      return d.productionStart <= d.productionEnd;
    }
    return true;
  },
  { message: '終了日は開始日以降の日付を入力してください', path: ['productionEnd'] }
);

export const itemWriteSchema = z.object({
  name:               z.string().max(100).nullable().optional(),
  series:             z.string().max(100).nullable().optional(),
  isHandmade:         z.union([z.literal(0), z.literal(1), z.null()]).optional(),
  isPublic:           z.union([z.literal(0), z.literal(1)]).optional(),
  purchaseInfoPublic: z.union([z.literal(0), z.literal(1)]).optional(),
  handmadeInfoPublic: z.union([z.literal(0), z.literal(1)]).optional(),
  status:             z.enum(['owned', 'parted']).optional(),
  purchaseInfo:       purchaseInfoSchema.nullable().optional(),
  handmadeInfo:       handmadeInfoSchema.nullable().optional(),
  tagIds:             z.array(z.string().regex(ID_RE)).max(50).optional(),
  materialIds:        z.array(z.string().regex(ID_RE)).max(50).optional(),
});

export const itemPostSchema = z.object({
  id:   clientIdSchema.optional(),
  name: z.string().max(100).nullable().optional(),
});

export const paginationSchema = z.object({
  limit:  z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export const photoPostSchema = z.object({
  itemId:     z.string().regex(ID_RE),
  r2KeyOrig:  z.string(),
  r2KeyThumb: z.string(),
  sortOrder:  z.number().int().min(0).optional(),
});
