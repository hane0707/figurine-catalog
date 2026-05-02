import { describe, it, expect } from 'vitest';
import {
  itemWriteSchema,
  purchaseInfoSchema,
  handmadeInfoBaseSchema,
  handmadeInfoSchema,
  tagNameSchema,
  materialNameSchema,
  clientIdSchema,
  paginationSchema,
  photoPostSchema,
} from './schemas';

const ID = 'abc123';

describe('clientIdSchema', () => {
  it('有効な英数字ハイフンアンダースコアを受け入れる', () => {
    expect(clientIdSchema.safeParse('abc-123_XYZ').success).toBe(true);
  });
  it('空文字を拒否する', () => {
    expect(clientIdSchema.safeParse('').success).toBe(false);
  });
  it('36文字超えを拒否する', () => {
    expect(clientIdSchema.safeParse('a'.repeat(37)).success).toBe(false);
  });
  it('スラッシュを拒否する', () => {
    expect(clientIdSchema.safeParse('abc/def').success).toBe(false);
  });
});

describe('tagNameSchema', () => {
  it('1〜50文字を受け入れる', () => {
    expect(tagNameSchema.safeParse('タグ').success).toBe(true);
    expect(tagNameSchema.safeParse('a'.repeat(50)).success).toBe(true);
  });
  it('空文字を拒否する', () => {
    expect(tagNameSchema.safeParse('').success).toBe(false);
  });
  it('51文字を拒否する', () => {
    expect(tagNameSchema.safeParse('a'.repeat(51)).success).toBe(false);
  });
});

describe('purchaseInfoSchema', () => {
  it('null フィールドを許可する', () => {
    expect(purchaseInfoSchema.safeParse({
      storeName: null, eventName: null, purchaseDate: null,
      purchasePrice: null, maker: null, artistName: null,
    }).success).toBe(true);
  });
  it('purchasePrice が負数は拒否する', () => {
    expect(purchaseInfoSchema.safeParse({ purchasePrice: -1 }).success).toBe(false);
  });
  it('purchasePrice が 100000001 は拒否する', () => {
    expect(purchaseInfoSchema.safeParse({ purchasePrice: 100_000_001 }).success).toBe(false);
  });
  it('purchaseDate が不正フォーマットは拒否する', () => {
    expect(purchaseInfoSchema.safeParse({ purchaseDate: '2024/01/01' }).success).toBe(false);
  });
  it('purchaseDate が YYYY-MM-DD 形式は受け入れる', () => {
    expect(purchaseInfoSchema.safeParse({ purchaseDate: '2024-01-15' }).success).toBe(true);
  });
  it('storeName が 101 文字は拒否する', () => {
    expect(purchaseInfoSchema.safeParse({ storeName: 'a'.repeat(101) }).success).toBe(false);
  });
});

describe('handmadeInfoSchema', () => {
  it('productionEnd が productionStart より前は拒否する', () => {
    expect(handmadeInfoSchema.safeParse({
      productionStart: '2024-06-01',
      productionEnd: '2024-05-31',
    }).success).toBe(false);
  });
  it('productionEnd が productionStart と同日は許可する', () => {
    expect(handmadeInfoSchema.safeParse({
      productionStart: '2024-06-01',
      productionEnd: '2024-06-01',
    }).success).toBe(true);
  });
  it('productionEnd のみ入力は許可する', () => {
    expect(handmadeInfoSchema.safeParse({
      productionStart: null,
      productionEnd: '2024-06-01',
    }).success).toBe(true);
  });
  it('quote が 501 文字は拒否する', () => {
    expect(handmadeInfoSchema.safeParse({ quote: 'a'.repeat(501) }).success).toBe(false);
  });
  it('notes が 2001 文字は拒否する', () => {
    expect(handmadeInfoSchema.safeParse({ notes: 'a'.repeat(2001) }).success).toBe(false);
  });
});

describe('itemWriteSchema', () => {
  it('tagIds が 51 件は拒否する', () => {
    expect(itemWriteSchema.safeParse({ tagIds: Array(51).fill(ID) }).success).toBe(false);
  });
  it('isHandmade が 2 は拒否する', () => {
    expect(itemWriteSchema.safeParse({ isHandmade: 2 }).success).toBe(false);
  });
  it('name が 101 文字は拒否する', () => {
    expect(itemWriteSchema.safeParse({ name: 'a'.repeat(101) }).success).toBe(false);
  });
});

describe('paginationSchema', () => {
  it('offset が負数は拒否する', () => {
    expect(paginationSchema.safeParse({ offset: -1 }).success).toBe(false);
  });
  it('limit が 0 は拒否する', () => {
    expect(paginationSchema.safeParse({ limit: 0 }).success).toBe(false);
  });
});

describe('photoPostSchema', () => {
  it('sortOrder が負数は拒否する', () => {
    expect(photoPostSchema.safeParse({
      itemId: ID, r2KeyOrig: 'items/x/orig_y.jpg', r2KeyThumb: 'items/x/thumb_y.webp', sortOrder: -1,
    }).success).toBe(false);
  });
});
