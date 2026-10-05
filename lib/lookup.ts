import { prisma } from '@/lib/prisma';

/**
 * Tìm sản phẩm theo mã trong QR / link tra cứu.
 * Ưu tiên mã sản phẩm (productCode) để QR sinh từ productCode tra được đúng sản phẩm,
 * sau đó mới tra theo slug để các mã QR cũ vẫn hoạt động.
 */
export async function findProductByCode(code: string) {
  const trimmed = code.trim();
  if (!trimmed) return null;

  const byProductCode = await prisma.product.findFirst({
    where: { productCode: { equals: trimmed, mode: 'insensitive' } },
    include: { images: { orderBy: { order: 'asc' } } },
  });
  if (byProductCode) return byProductCode;

  return prisma.product.findUnique({
    where: { slug: trimmed },
    include: { images: { orderBy: { order: 'asc' } } },
  });
}
