import { NextRequest } from 'next/server';
import { fail, handleApiError, ok } from '@/lib/api';
import { toProductView } from '@/lib/serialize';
import { findProductByCode } from '@/lib/lookup';
import { lookupQuerySchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

/** API công khai: tra cứu sản phẩm theo mã trong QR (productCode hoặc slug). */
export async function GET(req: NextRequest) {
  try {
    const { code } = lookupQuerySchema.parse({
      code: req.nextUrl.searchParams.get('code') ?? undefined,
    });

    const product = await findProductByCode(code);

    if (!product) {
      return fail('Không tìm thấy sản phẩm với mã tra cứu này', 404);
    }

    return ok(toProductView(product));
  } catch (error) {
    return handleApiError(error);
  }
}
