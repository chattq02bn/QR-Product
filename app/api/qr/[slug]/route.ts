import { NextRequest, NextResponse } from 'next/server';
import { fail, handleApiError } from '@/lib/api';
import { renderQrPng } from '@/lib/qr-png';
import { getQrCode } from '@/lib/qr';
import { findProductByCode } from '@/lib/lookup';
import { qrQuerySchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

/**
 * Trả về ảnh PNG mã QR trỏ tới trang tra cứu của sản phẩm.
 * ?size= (mặc định 512) và ?download=1 để tải về máy.
 * QR luôn sinh từ mã sản phẩm (productCode): cùng một sản phẩm -> cùng một hình QR,
 * kể cả khi xóa rồi tạo lại đúng mã sản phẩm đó.
 */
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const query = qrQuerySchema.parse({
      size: req.nextUrl.searchParams.get('size') ?? undefined,
      download: req.nextUrl.searchParams.get('download') ?? undefined,
    });

    const code = params.slug;
    if (!code) return fail('Thiếu mã tra cứu', 400);

    // Chỉ sinh QR cho mã đã tồn tại để tránh QR trỏ tới trang không có dữ liệu
    const product = await findProductByCode(code);
    if (!product) return fail('Không tìm thấy sản phẩm', 404);

    const qrCode = getQrCode(product);
    const size = query.size ?? 512;
    const buffer = await renderQrPng(qrCode, size);

    const headers = new Headers({
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    });
    if (query.download) {
      headers.set('Content-Disposition', `attachment; filename="qr-${qrCode}.png"`);
    }

    return new NextResponse(new Uint8Array(buffer), { status: 200, headers });
  } catch (error) {
    return handleApiError(error);
  }
}
