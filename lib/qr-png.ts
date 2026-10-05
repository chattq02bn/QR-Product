import QRCode from 'qrcode';
import { getLookupUrl } from '@/lib/qr';

/** Kích thước ảnh PNG mã QR mặc định (px). */
export const QR_PNG_SIZE = 512;

/**
 * Sinh buffer ảnh PNG mã QR cho một mã tra cứu (`code` = mã sản phẩm hoặc slug).
 * Cùng một `code` luôn cho ra đúng một hình QR.
 */
export function renderQrPng(code: string, size = QR_PNG_SIZE): Promise<Buffer> {
  return QRCode.toBuffer(getLookupUrl(code), {
    type: 'png',
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#10357a', light: '#ffffff' },
  });
}
