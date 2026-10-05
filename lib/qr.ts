/** Địa chỉ gốc của trang web, dùng để tạo link chứa trong mã QR. */
export function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return 'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}

/**
 * Mã định danh dùng cho QR / link tra cứu.
 * Ưu tiên mã sản phẩm (productCode) để QR không đổi khi xóa rồi tạo lại đúng mã đó;
 * sản phẩm cũ chưa có mã thì dùng mã tra cứu (slug).
 */
export function getQrCode(product: { productCode?: string | null; slug: string }): string {
  return product.productCode?.trim() || product.slug;
}

/** Đường dẫn tra cứu dạng "/?code=<mã>". */
export function getLookupPath(code: string): string {
  return `/?code=${encodeURIComponent(code)}`;
}

/** Link tra cứu đầy đủ, dùng trong mã QR và hiển thị cho người dùng. */
export function getLookupUrl(code: string): string {
  return `${getAppUrl()}${getLookupPath(code)}`;
}

/** URL của ảnh mã QR do app tự sinh (dùng để nhúng <img>). */
export function getQrImageUrl(code: string, size = 512): string {
  return `/api/qr/${encodeURIComponent(code)}?size=${size}`;
}
