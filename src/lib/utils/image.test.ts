import { describe, it, expect, vi } from 'vitest';
import { resizeImage } from './image';

// Canvas API のモック
const mockCanvasCtx = {
  drawImage: vi.fn(),
};
const mockCanvas = {
  getContext: vi.fn(() => mockCanvasCtx),
  toBlob: vi.fn((cb: (blob: Blob) => void) => cb(new Blob(['fake'], { type: 'image/webp' }))),
  width: 0,
  height: 0,
};

vi.stubGlobal('document', {
  createElement: vi.fn(() => mockCanvas),
});

const mockImg = {
  onload: null as (() => void) | null,
  src: '',
  naturalWidth: 800,
  naturalHeight: 600,
};
const ImageMock = function (this: typeof mockImg) {
  setTimeout(() => mockImg.onload?.(), 0);
  return mockImg;
};
vi.stubGlobal('Image', ImageMock);

describe('resizeImage', () => {
  it('Blobを受け取りWebP Blobを返す', async () => {
    const input = new Blob(['fake-image'], { type: 'image/jpeg' });
    const result = await resizeImage(input, 400);
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('image/webp');
  });
});
