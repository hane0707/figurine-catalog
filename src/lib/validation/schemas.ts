import { z } from 'zod';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[a-zA-Z0-9_-]+$/;

export const clientIdSchema = z
  .string()
  .regex(ID_RE, '使用できない文字が含まれています')
  .max(36, '36文字以内で入力してください');

export const tagNameSchema = z.string().min(1, '1文字以上入力してください').max(50, '50文字以内で入力してください');
export const materialNameSchema = z.string().min(1, '1文字以上入力してください').max(50, '50文字以内で入力してください');

export const purchaseInfoSchema = z.object({
  storeName:     z.string().max(100, '100文字以内で入力してください').nullable().optional(),
  eventName:     z.string().max(100, '100文字以内で入力してください').nullable().optional(),
  purchaseDate:  z.string().regex(DATE_RE, 'YYYY-MM-DD形式で入力してください').nullable().optional(),
  purchasePrice: z.number().int().min(0, '0以上の値を入力してください').max(100_000_000, '100,000,000以下の値を入力してください').nullable().optional(),
  maker:         z.string().max(100, '100文字以内で入力してください').nullable().optional(),
  artistName:    z.string().max(100, '100文字以内で入力してください').nullable().optional(),
});

export const handmadeInfoBaseSchema = z.object({
  productionStart: z.string().regex(DATE_RE, 'YYYY-MM-DD形式で入力してください').nullable().optional(),
  productionEnd:   z.string().regex(DATE_RE, 'YYYY-MM-DD形式で入力してください').nullable().optional(),
  quote: z.string().max(500, '500文字以内で入力してください').nullable().optional(),
  notes: z.string().max(2000, '2000文字以内で入力してください').nullable().optional(),
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
  name:               z.string().max(100, '100文字以内で入力してください').nullable().optional(),
  series:             z.string().max(100, '100文字以内で入力してください').nullable().optional(),
  isHandmade:         z.union([z.literal(0), z.literal(1), z.null()]).optional(),
  isPublic:           z.union([z.literal(0), z.literal(1)]).optional(),
  purchaseInfoPublic: z.union([z.literal(0), z.literal(1)]).optional(),
  handmadeInfoPublic: z.union([z.literal(0), z.literal(1)]).optional(),
  status:             z.enum(['owned', 'parted']).optional(),
  purchaseInfo:       purchaseInfoSchema.nullable().optional(),
  handmadeInfo:       handmadeInfoSchema.nullable().optional(),
  tagIds:             z.array(z.string().regex(ID_RE)).max(50, 'タグは50件以内で設定してください').optional(),
  materialIds:        z.array(z.string().regex(ID_RE)).max(50, '素材は50件以内で設定してください').optional(),
});

export const itemPostSchema = z.object({
  id:   clientIdSchema.optional(),
  name: z.string().max(100, '100文字以内で入力してください').nullable().optional(),
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
