import { NextResponse } from 'next/server';
import { isAuthEnabled } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Trạng thái đăng nhập: admin header dùng để hiện/ẩn nút Đăng xuất. */
export async function GET() {
  return NextResponse.json({ data: { authEnabled: isAuthEnabled() } }, { status: 200 });
}
