import type { ProductWithImages, ProductView } from '@/lib/types';

/** Chuyển Prisma entity thành dạng serialize an toàn cho client. */
export function toProductView(product: ProductWithImages): ProductView {
  return {
    ...product,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    qrExpiresAt: product.qrExpiresAt ? product.qrExpiresAt.toISOString() : null,
  };
}
