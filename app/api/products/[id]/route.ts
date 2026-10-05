import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { fail, handleApiError, isP2002, isP2002On, ok, readJson } from '@/lib/api';
import { toProductView } from '@/lib/serialize';
import { deleteImagesIfUnused } from '@/lib/cloudinary';
import { updateProductSchema } from '@/lib/validators';
import { requireAdmin } from '@/lib/session';

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: { images: { orderBy: [{ kind: 'asc' }, { order: 'asc' }] } },
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

    const duplicateCode = await prisma.product.findFirst({
      where: {
        productCode: { equals: input.productCode, mode: 'insensitive' },
        id: { not: existing.id },
      },
      select: { id: true },
    });
    if (duplicateCode) {
      return fail('Mã sản phẩm đã tồn tại trên hệ thống', 409);
    }

    // Ghép 2 danh sách ảnh từ form (ảnh sản phẩm + ảnh hướng dẫn) để so sánh với dữ liệu cũ.
    // `order` đếm riêng trong từng loại ảnh.
    const inputImages = [
      ...input.productImages.map((image, index) => ({
        id: image.id,
        url: image.url,
        publicId: image.publicId ?? '',
        kind: 'product' as const,
        index,
      })),
      ...input.guideImages.map((image, index) => ({
        id: image.id,
        url: image.url,
        publicId: image.publicId ?? '',
        kind: 'guide' as const,
        index,
      })),
    ];

    const knownIds = new Set(existing.images.map((image) => image.id));
    const keptIds = inputImages
      .map((image) => image.id)
      .filter((id): id is string => Boolean(id) && knownIds.has(id as string));
    const keptIdSet = new Set(keptIds);
    const removed = existing.images.filter((image) => !keptIdSet.has(image.id));

    const product = await prisma.$transaction(async (tx) => {
      await tx.productImage.deleteMany({
        where: { productId: existing.id, id: { notIn: keptIds } },
      });

      for (const image of inputImages) {
        if (image.id && keptIdSet.has(image.id)) {
          await tx.productImage.update({
            where: { id: image.id },
            data: {
              order: image.index,
              url: image.url,
              publicId: image.publicId,
              kind: image.kind,
            },
          });
        } else {
          await tx.productImage.create({
            data: {
              productId: existing.id,
              url: image.url,
              publicId: image.publicId,
              order: image.index,
              kind: image.kind,
            },
          });
        }
      }

      return tx.product.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          slug: input.slug,
          productCode: input.productCode,
          description: input.description === undefined ? existing.description : input.description,
          manufacturer:
            input.manufacturer === undefined ? existing.manufacturer : input.manufacturer,
          // undefined = không gửi lên -> giữ nguyên giá trị cũ
          specs:
            input.specs === undefined
              ? ((existing.specs ?? []) as Prisma.InputJsonValue)
              : (input.specs ?? []),
          distributor:
            input.distributor === undefined
              ? ((existing.distributor ?? []) as Prisma.InputJsonValue)
              : (input.distributor ?? []),
          // undefined = không gửi lên -> giữ nguyên hạn cũ
          qrExpiresAt: input.qrExpiresAt === undefined ? existing.qrExpiresAt : input.qrExpiresAt,
        },
        include: { images: { orderBy: [{ kind: 'asc' }, { order: 'asc' }] } },
      });
    });

    // Ảnh bị bỏ khỏi form sẽ bị xóa trên Cloudinary sau khi lưu thành công
    // (chỉ ảnh có publicId trên Cloudinary, ảnh chèn link bên ngoài thì bỏ qua;
    // ảnh còn được sản phẩm khác dùng chung thì giữ lại)
    const removable = removed
      .map((image) => image.publicId)
      .filter((publicId) => Boolean(publicId));
    if (removable.length > 0) {
      await deleteImagesIfUnused(removable);
    }

    return ok(toProductView(product));
  } catch (error) {
    if (isP2002On(error, 'productCode')) {
      return fail('Mã sản phẩm đã tồn tại trên hệ thống', 409);
    }
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
    // Ảnh dùng chung với sản phẩm bản sao (hoặc sản phẩm khác) sẽ không bị xóa
    await deleteImagesIfUnused(product.images.map((image) => image.publicId));

    return ok({ id: product.id });
  } catch (error) {
    return handleApiError(error);
  }
}
