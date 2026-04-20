import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import SummaryCard from './SummaryCard.svelte';

const baseProps = {
  uploadedPhotos: [],
  name: '',
  series: '',
  isHandmade: null as number | null,
  storeName: '',
  eventName: '',
  purchaseDate: '',
  purchasePrice: '',
  maker: '',
  artistName: '',
  productionStart: '',
  productionEnd: '',
  selectedMaterials: [] as { id: string; name: string }[],
  notes: '',
  onEdit: vi.fn(),
};

describe('SummaryCard: 写真セクション', () => {
  it('写真が0枚のとき「未登録」を表示する', () => {
    render(SummaryCard, { ...baseProps, uploadedPhotos: [] });
    expect(screen.getByText('未登録')).toBeInTheDocument();
  });

  it('写真が1枚以上のとき枚数を表示する', () => {
    const photos = [
      { id: 'p1', r2KeyThumb: 'k1', thumbViewUrl: 'https://example.com/1.jpg' },
      { id: 'p2', r2KeyThumb: 'k2', thumbViewUrl: 'https://example.com/2.jpg' },
    ];
    render(SummaryCard, { ...baseProps, uploadedPhotos: photos });
    expect(screen.getByText('2枚')).toBeInTheDocument();
  });

  it('写真セクションの編集ボタンをクリックすると onEdit("photo") が呼ばれる', async () => {
    const onEdit = vi.fn();
    render(SummaryCard, { ...baseProps, onEdit });
    const buttons = screen.getAllByText('← 編集');
    await fireEvent.click(buttons[0]);
    expect(onEdit).toHaveBeenCalledWith('photo');
  });
});

describe('SummaryCard: 基本情報セクション', () => {
  it('名前が空のとき「—」を表示する', () => {
    render(SummaryCard, { ...baseProps, name: '' });
    expect(screen.getByTestId('name-value')).toHaveTextContent('—');
  });

  it('名前が入力済みのとき値を表示する', () => {
    render(SummaryCard, { ...baseProps, name: 'ガンダム' });
    expect(screen.getByTestId('name-value')).toHaveTextContent('ガンダム');
  });

  it('シリーズ名が空のとき「—」を表示する', () => {
    render(SummaryCard, { ...baseProps, series: '' });
    expect(screen.getByTestId('series-value')).toHaveTextContent('—');
  });

  it('シリーズ名が入力済みのとき値を表示する', () => {
    render(SummaryCard, { ...baseProps, series: 'MGシリーズ' });
    expect(screen.getByTestId('series-value')).toHaveTextContent('MGシリーズ');
  });

  it('基本情報の編集ボタンをクリックすると onEdit("basic") が呼ばれる', async () => {
    const onEdit = vi.fn();
    render(SummaryCard, { ...baseProps, onEdit });
    const buttons = screen.getAllByText('← 編集');
    await fireEvent.click(buttons[1]);
    expect(onEdit).toHaveBeenCalledWith('basic');
  });
});

describe('SummaryCard: isHandmade === null のとき', () => {
  it('詳細情報セクションを表示しない', () => {
    render(SummaryCard, { ...baseProps, isHandmade: null });
    expect(screen.queryByTestId('details-section')).not.toBeInTheDocument();
  });
});

describe('SummaryCard: 購入情報セクション（isHandmade === 0）', () => {
  const purchaseProps = { ...baseProps, isHandmade: 0 };

  it('購入情報セクションが表示される', () => {
    render(SummaryCard, purchaseProps);
    expect(screen.getByTestId('details-section')).toBeInTheDocument();
    expect(screen.getByText('🛒 購入情報')).toBeInTheDocument();
  });

  it('店舗名が空のとき「—」を表示する', () => {
    render(SummaryCard, { ...purchaseProps, storeName: '' });
    expect(screen.getByTestId('storeName-value')).toHaveTextContent('—');
  });

  it('店舗名が入力済みのとき値を表示する', () => {
    render(SummaryCard, { ...purchaseProps, storeName: 'ホビーショップ' });
    expect(screen.getByTestId('storeName-value')).toHaveTextContent('ホビーショップ');
  });

  it('金額が入力済みのとき¥付きで表示する', () => {
    render(SummaryCard, { ...purchaseProps, purchasePrice: '3500' });
    expect(screen.getByTestId('purchasePrice-value')).toHaveTextContent('¥3500');
  });

  it('金額が空のとき「—」を表示する', () => {
    render(SummaryCard, { ...purchaseProps, purchasePrice: '' });
    expect(screen.getByTestId('purchasePrice-value')).toHaveTextContent('—');
  });

  it('購入情報の編集ボタンをクリックすると onEdit("details") が呼ばれる', async () => {
    const onEdit = vi.fn();
    render(SummaryCard, { ...purchaseProps, onEdit });
    const buttons = screen.getAllByText('← 編集');
    await fireEvent.click(buttons[2]);
    expect(onEdit).toHaveBeenCalledWith('details');
  });
});

describe('SummaryCard: 制作情報セクション（isHandmade === 1）', () => {
  const handmadeProps = { ...baseProps, isHandmade: 1 };

  it('制作情報セクションが表示される', () => {
    render(SummaryCard, handmadeProps);
    expect(screen.getByTestId('details-section')).toBeInTheDocument();
    expect(screen.getByText('🎨 制作情報')).toBeInTheDocument();
  });

  it('制作開始日が空のとき「—」を表示する', () => {
    render(SummaryCard, { ...handmadeProps, productionStart: '' });
    expect(screen.getByTestId('productionStart-value')).toHaveTextContent('—');
  });

  it('素材が選択済みのとき名前を表示する', () => {
    render(SummaryCard, {
      ...handmadeProps,
      selectedMaterials: [{ id: 'm1', name: 'レジン' }],
    });
    expect(screen.getByText('レジン')).toBeInTheDocument();
  });

  it('素材が未選択のとき「—」を表示する', () => {
    render(SummaryCard, { ...handmadeProps, selectedMaterials: [] });
    expect(screen.getByTestId('materials-value')).toHaveTextContent('—');
  });
});
