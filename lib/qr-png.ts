import QRCode from 'qrcode';
import { getLookupUrl } from '@/lib/qr';

/** Kích thước ảnh PNG mã QR mặc định (px). */
export const QR_PNG_SIZE = 512;

/** Sinh buffer ảnh PNG cho mã QR của một sản phẩm. */
export function renderQrPng(slug: string, size = QR_PNG_SIZE): Promise<Buffer> {
  return QRCode.toBuffer(getLookupUrl(slug), {
    type: 'png',
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#10357a', light: '#ffffff' },
  });
}
