import type { Prisma } from '@prisma/client';
import type { ProductWithImages, ProductView, SpecEntry } from '@/lib/types';

/**
 * Ép cột JSON (Prisma.JsonValue) về danh sách [{ label, value }] an toàn cho client.
 * Dữ liệu hỏng / không đúng dạng -> trả về null để trang không render khối rỗng.
 */
export function toSpecEntries(
  value: Prisma.JsonValue | null | undefined,
): SpecEntry[] | null {
  if (!Array.isArray(value)) return null;
  const entries = value.flatMap((item): SpecEntry[] => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const label = typeof item.label === 'string' ? item.label.trim() : '';
    const raw = 'value' in item ? item.value : '';
    const text = typeof raw === 'string' ? raw.trim() : raw === null || raw === undefined ? '' : String(raw);
    if (!label) return [];
    return [{ label, value: text }];
  });
  return entries.length > 0 ? entries : null;
}

/** Chuyển Prisma entity thành dạng serialize an toàn cho client. */
export function toProductView(product: ProductWithImages): ProductView {
  return {
    ...product,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    qrExpiresAt: product.qrExpiresAt ? product.qrExpiresAt.toISOString() : null,
    specs: toSpecEntries(product.specs),
    distributor: toSpecEntries(product.distributor),
  };
}
