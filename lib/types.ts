import type { Product, ProductImage } from '@prisma/client';

export type ProductWithImages = Product & { images: ProductImage[] };

/** Một dòng thông tin dạng "tên trường - giá trị" (lưu trong JSON). */
export type SpecEntry = { label: string; value: string };

/** Kiểu dữ liệu trả về cho client (Date được serialize thành chuỗi ISO). */
export type ProductView = Omit<
  Product,
  'createdAt' | 'updatedAt' | 'qrExpiresAt' | 'specs' | 'distributor'
> & {
  createdAt: string;
  updatedAt: string;
  /** Thời điểm hết hạn mã QR (ISO string), null = vĩnh viễn. */
  qrExpiresAt: string | null;
  /** Thông số kỹ thuật, null = chưa có dữ liệu. */
  specs: SpecEntry[] | null;
  /** Nhà sản xuất / Đơn vị phân phối, null = chưa có dữ liệu. */
  distributor: SpecEntry[] | null;
  images: ProductImage[];
};

export type ApiError = { error: { message: string } };

export type ProductListData = {
  items: ProductView[];
  total: number;
  page: number;
  pageSize: number;
};

export type UploadedImage = { url: string; publicId: string };
