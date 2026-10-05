import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fail, handleApiError, isP2002, isP2002On, ok, readJson } from '@/lib/api';
import { toProductView } from '@/lib/serialize';
import { generateUniqueSlug, slugify } from '@/lib/slug';
import { createProductSchema, productListQuerySchema } from '@/lib/validators';
import { requireAdmin } from '@/lib/session';

export const dynamic = 'force-dynamic';

function firstParam(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export async function GET(req: NextRequest) {
  try {
    const query = productListQuerySchema.parse({
      search: firstParam(req.nextUrl.searchParams.get('search')),
      page: firstParam(req.nextUrl.searchParams.get('page')),
      pageSize: firstParam(req.nextUrl.searchParams.get('pageSize')),
    });

    const search = query.search;
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { productCode: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [total, products] = await prisma.$transaction([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: { images: { orderBy: { order: 'asc' } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return ok({
      items: products.map(toProductView),
      total,
      page: query.page,
      pageSize: query.pageSize,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const input = createProductSchema.parse(await readJson(req));

    const duplicatedCode = await prisma.product.findFirst({
      where: { productCode: { equals: input.productCode, mode: 'insensitive' } },
      select: { id: true },
    });
    if (duplicatedCode) return fail('Mã sản phẩm đã tồn tại trên hệ thống', 409);

    const slug =
      input.slug ??
      (await generateUniqueSlug(input.name, async (candidate) =>
        Boolean(
          await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } }),
        ),
      ));

    const product = await prisma.product.create({
      data: {
        name: input.name,
        slug: slugify(slug) || slug,
        productCode: input.productCode,
        imageUrl: input.imageUrl ?? null,
        description: input.description ?? null,
        manufacturer: input.manufacturer ?? null,
        specs: input.specs ?? [],
        distributor: input.distributor ?? [],
        qrExpiresAt: input.qrExpiresAt ?? null,
        images: {
          create: input.images.map((image, index) => ({
            url: image.url,
            publicId: image.publicId ?? '',
            order: index,
          })),
        },
      },
      include: { images: { orderBy: { order: 'asc' } } },
    });

    return NextResponse.json({ data: toProductView(product) }, { status: 201 });
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
