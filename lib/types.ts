import type { Product, ProductImage } from '@prisma/client';

export type ProductWithImages = Product & { images: ProductImage[] };

/** Kiểu dữ liệu trả về cho client (Date được serialize thành chuỗi ISO). */
export type ProductView = Omit<Product, 'createdAt' | 'updatedAt' | 'qrExpiresAt'> & {
  createdAt: string;
  updatedAt: string;
  /** Thời điểm hết hạn mã QR (ISO string), null = vĩnh viễn. */
  qrExpiresAt: string | null;
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
