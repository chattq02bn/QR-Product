import jsQR from 'jsqr';
import { SLUG_PATTERN } from '@/lib/slug';

export type QrInversionAttempts = 'dontInvert' | 'attemptBoth';

export function decodeQrFromImageData(
  image: ImageData,
  inversionAttempts: QrInversionAttempts = 'attemptBoth',
): string | null {
  try {
    const found = jsQR(image.data, image.width, image.height, { inversionAttempts });
    const text = found?.data?.trim();
    return text ? text : null;
  } catch {
    return null;
  }
}

export function extractLookupCode(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;

  let url: URL;
  try {
    url = new URL(text, 'http://qr.local');
  } catch {
    return null;
  }

  const fromQuery = url.searchParams.get('code')?.trim();
  if (fromQuery) return fromQuery;

  const lastSegment = url.pathname.split('/').filter(Boolean).pop() ?? '';
  if (SLUG_PATTERN.test(lastSegment)) return lastSegment;

  return null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Không đọc được tệp ảnh'));
    image.src = src;
  });
}

function decodeFromSource(
  source: CanvasImageSource,
  width: number,
  height: number,
): string | null {
  if (!width || !height) return null;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;

  context.drawImage(source, 0, 0, width, height);
  return decodeQrFromImageData(context.getImageData(0, 0, width, height), 'attemptBoth');
}

export async function decodeQrFromFile(file: File): Promise<string | null> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const maxDimension = Math.max(image.naturalWidth, image.naturalHeight);
    if (!maxDimension) return null;

    const scales = maxDimension > 1600 ? [1600 / maxDimension, 1] : [1];
    for (const scale of scales) {
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const found = decodeFromSource(image, width, height);
      if (found) return found;
    }

    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
