import { describe, it, expect } from 'vitest';
import { getDb } from './index';

describe('getDb', () => {
	it('D1バインディングを受け取りdrizzleインスタンスを返す', () => {
		const mockD1 = {} as D1Database;
		const db = getDb(mockD1);
		expect(db).toBeDefined();
	});
});
