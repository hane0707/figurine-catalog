import { describe, it, expect } from 'vitest';
import { formatDate } from './date';

describe('formatDate', () => {
  it('ISO日時をドット区切りに整形する', () => {
    expect(formatDate('2026-04-21T09:30:00Z')).toBe('2026.04.21');
  });
  it('日付のみの文字列も整形する', () => {
    expect(formatDate('2026-04-21')).toBe('2026.04.21');
  });
  it('null/undefined/空文字は空文字を返す', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('')).toBe('');
  });
  it('不正な形式はそのまま返す', () => {
    expect(formatDate('unknown')).toBe('unknown');
  });
});
