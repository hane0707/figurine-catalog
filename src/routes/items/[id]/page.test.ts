// src/routes/items/[id]/+page.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Page from './+page.svelte';

// SvelteKit の $app/navigation をモック
vi.mock('$app/navigation', () => ({
  invalidateAll: vi.fn().mockResolvedValue(undefined),
  goto: vi.fn().mockResolvedValue(undefined),
}));

// svelte-sonner をモック
vi.mock('svelte-sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// グローバル fetch をモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) } as Response);
});

// テスト用アイテムデータ（購入品）
const mockItem = {
  id: 'item-1',
  name: 'テストフィギュア',
  series: 'テストシリーズ',
  isHandmade: 0,
  isPublic: 0,
  purchaseInfoPublic: 0,
  handmadeInfoPublic: 0,
  status: 'owned',
  photos: [],
  purchaseInfo: { storeName: 'テスト店', eventName: null, purchaseDate: null, purchasePrice: null, maker: null, artistName: null },
  handmadeInfo: null,
  itemTags: [{ tag: { id: 'tag-1', name: '既存タグ' } }],
  itemMaterials: [],
};

// テスト用 data prop
const mockData = {
  item: mockItem,
  allTags: [
    { id: 'tag-1', name: '既存タグ' },
    { id: 'tag-2', name: '新しいタグ' },
  ],
  materials: {
    all: [{ id: 'mat-1', name: 'レジン', isPreset: 1 }],
    frequent: [{ id: 'mat-1', name: 'レジン', isPreset: 1 }],
  },
  user: { email: 'test@example.com' },
};

describe('編集画面: 表示/編集の二重表示', () => {
  it('非編集時は購入情報の表示ブロックが表示される', () => {
    render(Page, { data: mockData });
    expect(screen.getByText('Source')).toBeInTheDocument();
  });

  it('編集時は購入情報の表示ブロックが非表示になる', async () => {
    render(Page, { data: mockData });
    const editButton = screen.getAllByText('編集')[0];
    await fireEvent.click(editButton);
    // 表示用の「Source」は非表示になるべき
    expect(screen.queryByText('Source')).not.toBeInTheDocument();
  });
});

describe('編集画面: タグ編集', () => {
  it('非編集時はタグ編集UIが表示されない', () => {
    render(Page, { data: mockData });
    expect(screen.queryByPlaceholderText('タグを追加...')).not.toBeInTheDocument();
  });

  it('編集時はタグ編集UIが表示される', async () => {
    render(Page, { data: mockData });
    const editButton = screen.getAllByText('編集')[0];
    await fireEvent.click(editButton);
    expect(screen.getByPlaceholderText('タグを追加...')).toBeInTheDocument();
  });

  it('編集開始時に既存タグが editTags に反映されている', async () => {
    render(Page, { data: mockData });
    const editButton = screen.getAllByText('編集')[0];
    await fireEvent.click(editButton);
    // TagPicker の selected バッジに既存タグが表示される
    expect(screen.getByText(/既存タグ\s*✕/)).toBeInTheDocument();
  });
});

describe('編集画面: 素材編集（自作品）', () => {
  const handmadeData = {
    ...mockData,
    item: {
      ...mockItem,
      isHandmade: 1,
      purchaseInfo: null,
      handmadeInfo: { productionStart: null, productionEnd: null, notes: null },
      itemMaterials: [{ material: { id: 'mat-1', name: 'レジン' } }],
    },
  };

  it('非編集時は素材編集UIが表示されない', () => {
    render(Page, { data: handmadeData });
    expect(screen.queryByPlaceholderText('素材を追加...')).not.toBeInTheDocument();
  });

  it('自作品の編集時は素材編集UIが表示される', async () => {
    render(Page, { data: handmadeData });
    const editButton = screen.getAllByText('編集')[0];
    await fireEvent.click(editButton);
    expect(screen.getByPlaceholderText('素材を追加...')).toBeInTheDocument();
  });

  it('編集開始時に既存素材が editMaterials に反映されている', async () => {
    render(Page, { data: handmadeData });
    const editButton = screen.getAllByText('編集')[0];
    await fireEvent.click(editButton);
    expect(screen.getByText(/レジン\s*✕/)).toBeInTheDocument();
  });
});
