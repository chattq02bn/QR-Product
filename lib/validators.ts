import { z } from 'zod';
import { SLUG_PATTERN } from '@/lib/slug';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_IMAGES_PER_PRODUCT = 30;

/** MIME type ảnh được phép upload (Cloudinary từ chối HEIC/HEIF nên cần loại trừ ngay). */
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/bmp',
  'image/svg+xml',
] as const;

export function isSupportedImageType(type: string): boolean {
  return SUPPORTED_IMAGE_TYPES.includes(
    type.trim().toLowerCase() as (typeof SUPPORTED_IMAGE_TYPES)[number],
  );
}

/** Thông báo lỗi khi gặp định dạng ảnh không hỗ trợ. */
export function unsupportedImageMessage(filename: string): string {
  return `Định dạng ảnh "${filename}" chưa được hỗ trợ, vui lòng chọn JPG, PNG, WEBP hoặc GIF`;
}

export const nameSchema = z
  .string({ required_error: 'Tên sản phẩm là bắt buộc' })
  .trim()
  .min(2, 'Tên sản phẩm phải có ít nhất 2 ký tự')
  .max(200, 'Tên sản phẩm tối đa 200 ký tự');

export const slugSchema = z
  .string()
  .trim()
  .min(3, 'Mã tra cứu phải có ít nhất 3 ký tự')
  .max(120, 'Mã tra cứu tối đa 120 ký tự')
  .regex(SLUG_PATTERN, 'Mã tra cứu chỉ gồm chữ thường, số và dấu gạch ngang');

/** Mã sản phẩm in trên bao bì / báo giá: chữ, số và một số ký tự phân cách. */
export const PRODUCT_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ._-]*$/;

export const MAX_PRODUCT_CODE_LENGTH = 60;

export const productCodeSchema = z
  .string({ required_error: 'Mã sản phẩm là bắt buộc' })
  .trim()
  .min(2, 'Mã sản phẩm phải có ít nhất 2 ký tự')
  .max(MAX_PRODUCT_CODE_LENGTH, `Mã sản phẩm tối đa ${MAX_PRODUCT_CODE_LENGTH} ký tự`)
  .regex(PRODUCT_CODE_PATTERN, 'Mã sản phẩm chỉ gồm chữ, số, dấu cách và ký tự . - _');

export const MAX_DESCRIPTION_WORDS = 500;

const countWords = (value: string) => value.split(/\s+/).filter(Boolean).length;

export const descriptionSchema = z
  .string({ invalid_type_error: 'Mô tả sản phẩm không hợp lệ' })
  .trim()
  .max(5000, 'Mô tả sản phẩm tối đa 5000 ký tự')
  .superRefine((value, ctx) => {
    if (countWords(value) > MAX_DESCRIPTION_WORDS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Mô tả sản phẩm tối đa ${MAX_DESCRIPTION_WORDS} từ`,
      });
    }
  })
  .nullish();

export const manufacturerSchema = z
  .string({ invalid_type_error: 'Nhà sản xuất không hợp lệ' })
  .trim()
  .min(2, 'Nhà sản xuất phải có ít nhất 2 ký tự')
  .max(200, 'Nhà sản xuất tối đa 200 ký tự')
  .nullish();

/** Một dòng "tên trường - giá trị" trong JSON thông số / nhà sản xuất. */
export const specEntrySchema = z.object({
  label: z
    .string({ required_error: 'Tên trường là bắt buộc' })
    .trim()
    .min(1, 'Tên trường không được để trống')
    .max(120, 'Tên trường tối đa 120 ký tự'),
  value: z
    .string({ invalid_type_error: 'Giá trị không hợp lệ' })
    .trim()
    .max(500, 'Giá trị tối đa 500 ký tự'),
});

/** Danh sách dòng thông tin: giữ nguyên thứ tự, cho phép thêm trường mới về sau. */
export const specEntriesSchema = z
  .array(specEntrySchema, { invalid_type_error: 'Danh sách thông tin không hợp lệ' })
  .max(100, 'Tối đa 100 dòng thông tin')
  .nullish();

export const imageSchema = z.object({
  id: z.string().min(1).optional(),
  url: z.string().url('Ảnh không hợp lệ'),
  // Ảnh chèn bằng link bên ngoài không có publicId trên Cloudinary (cho phép rỗng)
  publicId: z.string().trim().optional().default(''),
});

/** Danh sách ảnh cùng loại (ảnh sản phẩm hoặc ảnh hướng dẫn): tối thiểu 1, tối đa theo quy định. */
function imageListSchema(minMessage: string) {
  return z
    .array(imageSchema, {
      required_error: minMessage,
      invalid_type_error: 'Danh sách ảnh không hợp lệ',
    })
    .min(1, minMessage)
    .max(MAX_IMAGES_PER_PRODUCT, `Tối đa ${MAX_IMAGES_PER_PRODUCT} ảnh`);
}

/** Ảnh sản phẩm: ảnh đầu tiên là ảnh đại diện hiển thị ở trang tra cứu. */
export const productImagesSchema = imageListSchema(
  'Sản phẩm bắt buộc phải có ít nhất 1 ảnh sản phẩm',
);

/** Ảnh hướng dẫn sử dụng. */
export const guideImagesSchema = imageListSchema(
  'Sản phẩm bắt buộc phải có ít nhất 1 ảnh hướng dẫn',
);

/** Thời điểm hết hạn mã QR: ISO string, null = vĩnh viễn, undefined = không đổi. */
export const qrExpiresAtSchema = z
  .string({ invalid_type_error: 'Thời hạn mã QR không hợp lệ' })
  .datetime({ offset: true, message: 'Thời hạn mã QR không hợp lệ' })
  .nullable()
  .optional();

export const createProductSchema = z.object({
  name: nameSchema,
  slug: slugSchema.optional(),
  productCode: productCodeSchema,
  description: descriptionSchema,
  manufacturer: manufacturerSchema,
  specs: specEntriesSchema,
  distributor: specEntriesSchema,
  productImages: productImagesSchema,
  guideImages: guideImagesSchema,
  qrExpiresAt: qrExpiresAtSchema,
});

export const updateProductSchema = z.object({
  name: nameSchema,
  slug: slugSchema,
  productCode: productCodeSchema,
  description: descriptionSchema,
  manufacturer: manufacturerSchema,
  specs: specEntriesSchema,
  distributor: specEntriesSchema,
  productImages: productImagesSchema,
  guideImages: guideImagesSchema,
  qrExpiresAt: qrExpiresAtSchema,
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Vui lòng nhập tài khoản'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export const productListQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const lookupQuerySchema = z.object({
  code: z.string().trim().min(1, 'Thiếu mã tra cứu'),
});

export const qrQuerySchema = z.object({
  size: z.coerce.number().int().min(128).max(2048).optional(),
  download: z.union([z.literal('1'), z.literal('true')]).optional(),
});

/** Body của API nén mã QR: tải tất cả hoặc tải theo danh sách id sản phẩm. */
export const qrExportSchema = z
  .object({
    all: z.boolean().optional().default(false),
    ids: z.array(z.string().min(1)).max(5000).optional().default([]),
    size: z.coerce.number().int().min(128).max(2048).optional(),
  })
  .refine((value) => value.all || value.ids.length > 0, {
    message: 'Chọn ít nhất một sản phẩm để tải mã QR',
  });

export type QrExportInput = z.infer<typeof qrExportSchema>;

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
