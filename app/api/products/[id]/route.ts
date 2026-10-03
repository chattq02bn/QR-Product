import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fail, handleApiError, isP2002, ok, readJson } from '@/lib/api';
import { toProductView } from '@/lib/serialize';
import { deleteImages } from '@/lib/cloudinary';
import { updateProductSchema } from '@/lib/validators';
import { requireAdmin } from '@/lib/session';

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: { images: { orderBy: { order: 'asc' } } },
    });
    if (!product) return fail('Không tìm thấy sản phẩm', 404);
    return ok(toProductView(product));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const input = updateProductSchema.parse(await readJson(req));

    const existing = await prisma.product.findUnique({
      where: { id: params.id },
      include: { images: true },
    });
    if (!existing) return fail('Không tìm thấy sản phẩm', 404);

    const duplicate = await prisma.product.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });
    if (duplicate && duplicate.id !== existing.id) {
      return fail('Mã tra cứu đã tồn tại, vui lòng chọn mã khác', 409);
    }

    const knownIds = new Set(existing.images.map((image) => image.id));
    const keptIds = input.images
      .map((image) => image.id)
      .filter((id): id is string => Boolean(id) && knownIds.has(id as string));
    const keptIdSet = new Set(keptIds);
    const removed = existing.images.filter((image) => !keptIdSet.has(image.id));

    const product = await prisma.$transaction(async (tx) => {
      await tx.productImage.deleteMany({
        where: { productId: existing.id, id: { notIn: keptIds } },
      });

      for (const [index, image] of input.images.entries()) {
        const publicId = image.publicId ?? '';
        if (image.id && keptIdSet.has(image.id)) {
          await tx.productImage.update({
            where: { id: image.id },
            data: { order: index, url: image.url, publicId },
          });
        } else {
          await tx.productImage.create({
            data: {
              productId: existing.id,
              url: image.url,
              publicId,
              order: index,
            },
          });
        }
      }

      return tx.product.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          slug: input.slug,
          // undefined = không gửi lên -> giữ nguyên giá trị cũ
          imageUrl: input.imageUrl === undefined ? existing.imageUrl : input.imageUrl,
          description: input.description === undefined ? existing.description : input.description,
          manufacturer:
            input.manufacturer === undefined ? existing.manufacturer : input.manufacturer,
          // undefined = không gửi lên -> giữ nguyên hạn cũ
          qrExpiresAt: input.qrExpiresAt === undefined ? existing.qrExpiresAt : input.qrExpiresAt,
        },
        include: { images: { orderBy: { order: 'asc' } } },
      });
    });

    // Ảnh bị bỏ khỏi form sẽ bị xóa trên Cloudinary sau khi lưu thành công
    // (chỉ ảnh có publicId trên Cloudinary, ảnh chèn link bên ngoài thì bỏ qua)
    const removable = removed
      .map((image) => image.publicId)
      .filter((publicId) => Boolean(publicId));
    if (removable.length > 0) {
      await deleteImages(removable);
    }

    return ok(toProductView(product));
  } catch (error) {
    if (isP2002(error)) {
      return fail('Mã tra cứu đã tồn tại, vui lòng chọn mã khác', 409);
    }
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: { images: true },
    });
    if (!product) return fail('Không tìm thấy sản phẩm', 404);

    await prisma.product.delete({ where: { id: product.id } });
    await deleteImages(product.images.map((image) => image.publicId));

    return ok({ id: product.id });
  } catch (error) {
    return handleApiError(error);
  }
}
