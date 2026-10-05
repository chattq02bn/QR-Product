import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handleApiError, ok } from '@/lib/api';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  code: z.string().trim().min(1, 'Thiếu mã sản phẩm'),
  excludeId: z.string().trim().optional(),
});

/**
 * GET /api/products/check-code?code=XXX&id=<id sản phẩm đang sửa>
 * Kiểm tra mã sản phẩm đã tồn tại trên hệ thống hay chưa (validate trong form admin).
 */
export async function GET(req: NextRequest) {
  try {
    const { code, excludeId } = querySchema.parse({
      code: req.nextUrl.searchParams.get('code') ?? undefined,
      excludeId: req.nextUrl.searchParams.get('id') ?? undefined,
    });

    const found = await prisma.product.findFirst({
      where: {
        productCode: { equals: code, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    return ok({ exists: Boolean(found) });
  } catch (error) {
    return handleApiError(error);
  }
}
