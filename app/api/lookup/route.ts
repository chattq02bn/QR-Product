import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fail, handleApiError, ok } from '@/lib/api';
import { toProductView } from '@/lib/serialize';
import { lookupQuerySchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

/** API công khai: tra cứu sản phẩm theo slug (mã in trong QR). */
export async function GET(req: NextRequest) {
  try {
    const { code } = lookupQuerySchema.parse({
      code: req.nextUrl.searchParams.get('code') ?? undefined,
    });

    const product = await prisma.product.findUnique({
      where: { slug: code },
      include: { images: { orderBy: { order: 'asc' } } },
    });

    if (!product) {
      return fail('Không tìm thấy sản phẩm với mã tra cứu này', 404);
    }

    return ok(toProductView(product));
  } catch (error) {
    return handleApiError(error);
  }
}
