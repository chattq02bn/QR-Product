import { NextRequest, NextResponse } from 'next/server';
import {
  deleteImage,
  deleteImages,
  isCloudinaryConfigured,
  uploadImage,
  type CloudinaryImage,
} from '@/lib/cloudinary';
import { fail, handleApiError, ok } from '@/lib/api';
import { isSupportedImageType, MAX_IMAGE_BYTES, unsupportedImageMessage } from '@/lib/validators';
import { requireAdmin } from '@/lib/session';

export const dynamic = 'force-dynamic';

const MAX_FILES_PER_REQUEST = 10;

function collectFiles(form: FormData): File[] {
  const files: File[] = [];
  for (const value of form.values()) {
    if (typeof value !== 'string' && typeof value.arrayBuffer === 'function') {
      files.push(value as File);
    }
  }
  return files;
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return fail('Dữ liệu upload không hợp lệ, cần gửi multipart/form-data', 400);
    }
    const files = collectFiles(form);

    if (files.length === 0) {
      return fail('Vui lòng chọn ít nhất một ảnh', 400);
    }
    if (files.length > MAX_FILES_PER_REQUEST) {
      return fail(`Mỗi lần chỉ upload tối đa ${MAX_FILES_PER_REQUEST} ảnh`, 400);
    }

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        return fail(`File "${file.name}" không phải là ảnh hợp lệ`, 400);
      }
      if (!isSupportedImageType(file.type)) {
        return fail(unsupportedImageMessage(file.name), 400);
      }
      if (file.size > MAX_IMAGE_BYTES) {
        return fail(`Ảnh "${file.name}" vượt quá 10MB`, 400);
      }
    }

    if (!isCloudinaryConfigured()) {
      return fail('Chưa cấu hình Cloudinary, vui lòng điền CLOUDINARY_* trong .env', 500);
    }

    const settled = await Promise.allSettled(
      files.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        return uploadImage(buffer, { filename: file.name });
      }),
    );

    const uploaded: CloudinaryImage[] = [];
    let failureFile: File | null = null;
    let failureReason = '';
    for (let index = 0; index < settled.length; index += 1) {
      const item = settled[index];
      if (item.status === 'fulfilled') {
        uploaded.push(item.value);
        continue;
      }
      if (failureFile) continue;
      failureFile = files[index];
      failureReason =
        item.reason instanceof Error && item.reason.message.trim()
          ? item.reason.message.trim()
          : 'lỗi không xác định từ dịch vụ ảnh';
    }

    if (failureFile) {
      // Upload dở dang: xóa các ảnh đã lên để không tồn đọng trên Cloudinary.
      await deleteImages(uploaded.map((image) => image.publicId));
      return fail(`Không upload được ảnh "${failureFile.name}": ${failureReason}`, 502);
    }

    return ok(uploaded);
  } catch (error) {
    return handleApiError(error);
  }
}

/** Xóa một ảnh đã upload (dùng khi người dùng bỏ ảnh trước khi lưu). */
export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const publicId = req.nextUrl.searchParams.get('publicId')?.trim();
    if (!publicId) return fail('Thiếu publicId cần xóa', 400);
    await deleteImage(publicId);
    return ok({ publicId });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT() {
  return NextResponse.json(
    { error: { message: 'Phương thức không được hỗ trợ' } },
    { status: 405 },
  );
}
