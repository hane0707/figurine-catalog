// src/routes/items/new/+page.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Page from './+page.svelte';

vi.mock('$app/navigation', () => ({
  goto: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('svelte-sonner', () => ({
  toast: { error: vi.fn() },
}));
vi.mock('$lib/utils/uuid', () => ({
  generateId: () => 'test-item-id',
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) } as Response);
});

const mockData = {
  allTags: [],
  materials: { all: [], frequent: [] },
  user: { email: 'test@example.com' },
};

async function advanceToTags() {
  render(Page, { data: mockData });
  // photo → basic（次へ）
  let buttons = screen.getAllByRole('button');
  let nextBtn = buttons.find(btn => btn.textContent.includes('次へ'));
  if (nextBtn) await fireEvent.click(nextBtn);

  // basic → type（次へ）
  buttons = screen.getAllByRole('button');
  nextBtn = buttons.find(btn => btn.textContent.includes('次へ'));
  if (nextBtn) await fireEvent.click(nextBtn);

  // type → details（購入品を選択）
  const boughtButton = screen.getAllByText('購入品').find(btn => btn.tagName === 'BUTTON');
  if (boughtButton) await fireEvent.click(boughtButton);

  // details → tags（次へ）
  buttons = screen.getAllByRole('button');
  nextBtn = buttons.find(btn => btn.textContent.includes('次へ'));
  if (nextBtn) await fireEvent.click(nextBtn);
}

describe('新規登録ウィザード: ページレンダリング', () => {
  it('userが設定されていればページが表示される', () => {
    render(Page, { data: mockData });
    // ページが正常にレンダリングされることを確認
    expect(screen.getByText('写真を置く')).toBeInTheDocument();
  });

  it('tagsステップ以外ではサマリーカードが表示されない', () => {
    render(Page, { data: mockData });
    expect(screen.queryByText('入力内容の確認')).not.toBeInTheDocument();
  });
});
