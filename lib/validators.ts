import { z } from 'zod';
import { SLUG_PATTERN } from '@/lib/slug';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_IMAGES_PER_PRODUCT = 30;

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

export const productImageUrlSchema = z
  .string({ invalid_type_error: 'Ảnh sản phẩm không hợp lệ' })
  .trim()
  .url('Ảnh sản phẩm phải là link hợp lệ')
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

export const imagesSchema = z
  .array(imageSchema, {
    required_error: 'Sản phẩm bắt buộc phải có ít nhất 1 ảnh hướng dẫn',
    invalid_type_error: 'Danh sách ảnh không hợp lệ',
  })
  .min(1, 'Sản phẩm bắt buộc phải có ít nhất 1 ảnh hướng dẫn')
  .max(MAX_IMAGES_PER_PRODUCT, `Tối đa ${MAX_IMAGES_PER_PRODUCT} ảnh`);

/** Thời điểm hết hạn mã QR: ISO string, null = vĩnh viễn, undefined = không đổi. */
export const qrExpiresAtSchema = z
  .string({ invalid_type_error: 'Thời hạn mã QR không hợp lệ' })
  .datetime({ offset: true, message: 'Thời hạn mã QR không hợp lệ' })
  .nullable()
  .optional();

export const createProductSchema = z.object({
  name: nameSchema,
  slug: slugSchema.optional(),
  imageUrl: productImageUrlSchema,
  description: descriptionSchema,
  manufacturer: manufacturerSchema,
  specs: specEntriesSchema,
  distributor: specEntriesSchema,
  images: imagesSchema,
  qrExpiresAt: qrExpiresAtSchema,
});

export const updateProductSchema = z.object({
  name: nameSchema,
  slug: slugSchema,
  imageUrl: productImageUrlSchema,
  description: descriptionSchema,
  manufacturer: manufacturerSchema,
  specs: specEntriesSchema,
  distributor: specEntriesSchema,
  images: imagesSchema,
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
