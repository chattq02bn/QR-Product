/** Địa chỉ gốc của trang web, dùng để tạo link chứa trong mã QR. */
export function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return 'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}

/** Đường dẫn tra cứu dạng "/?code=slug". */
export function getLookupPath(slug: string): string {
  return `/?code=${encodeURIComponent(slug)}`;
}

/** Link tra cứu đầy đủ, dùng trong mã QR và hiển thị cho người dùng. */
export function getLookupUrl(slug: string): string {
  return `${getAppUrl()}${getLookupPath(slug)}`;
}

/** URL của ảnh mã QR do app tự sinh (dùng để nhúng <img>). */
export function getQrImageUrl(slug: string, size = 512): string {
  return `/api/qr/${encodeURIComponent(slug)}?size=${size}`;
}
