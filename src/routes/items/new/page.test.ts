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
};

async function advanceToTags() {
  render(Page, { data: mockData });
  // photo → basic（スキップ）
  await fireEvent.click(screen.getByText('スキップ'));
  // basic → type（次へ）
  await fireEvent.click(screen.getByText('次へ →'));
  // type → tags（スキップ）
  await fireEvent.click(screen.getByText('スキップ'));
}

describe('新規登録ウィザード: tagsステップのサマリーカード', () => {
  it('tagsステップに入るとサマリーカードが表示される', async () => {
    await advanceToTags();
    expect(screen.getByText('入力内容の確認')).toBeInTheDocument();
  });

  it('tagsステップ以外ではサマリーカードが表示されない', () => {
    render(Page, { data: mockData });
    expect(screen.queryByText('入力内容の確認')).not.toBeInTheDocument();
  });

  it('写真が0枚のとき「未登録」と表示される', async () => {
    await advanceToTags();
    expect(screen.getByText('未登録')).toBeInTheDocument();
  });

  it('名前が未入力のとき「—」と表示される', async () => {
    await advanceToTags();
    expect(screen.getByTestId('name-value')).toHaveTextContent('—');
  });

  it('isHandmadeがnullのとき詳細情報セクションが表示されない', async () => {
    await advanceToTags();
    expect(screen.queryByTestId('details-section')).not.toBeInTheDocument();
  });
});
