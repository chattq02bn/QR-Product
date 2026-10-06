import { prisma } from '@/lib/prisma';

/** Tiền tố mã sản phẩm tự sinh. */
const PRODUCT_CODE_PREFIX = 'SP';

/** Số chữ số của STT trong mã sản phẩm tự sinh. */
const SEQUENCE_LENGTH = 3;

/**
 * Sinh mã sản phẩm khi tạo mới: "SP" + ddMMyy + STT.
 * STT là số thứ tự tăng dần theo tổng số sản phẩm đã có tiền tố SP (không reset theo ngày);
 * nếu mã đã tồn tại thì cộng thêm cho tới khi trống.
 */
export async function generateProductCode(): Promise<string> {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const stamp = `${day}${month}${year}`;

  const used = await prisma.product.count({
    where: { productCode: { startsWith: PRODUCT_CODE_PREFIX } },
  });

  for (let offset = 1; offset <= 1000; offset += 1) {
    const sequence = String(used + offset).padStart(SEQUENCE_LENGTH, '0');
    const candidate = `${PRODUCT_CODE_PREFIX}${stamp}${sequence}`;
    const exists = await prisma.product.findUnique({
      where: { productCode: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }

  // Không tìm được STT trống (dữ liệu bất thường) -> dùng timestamp để đảm bảo duy nhất
  return `${PRODUCT_CODE_PREFIX}${stamp}${Date.now().toString().slice(-6)}`;
}
