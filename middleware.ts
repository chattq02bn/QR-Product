import { NextRequest, NextResponse } from 'next/server';
import {
  OPEN_WRITE_API_PATHS,
  SESSION_COOKIE,
  isWriteMethod,
  verifySessionToken,
} from '@/lib/auth';

/** Chặn /admin (chuyển về màn hình đăng nhập) và mọi API ghi khi chưa có phiên hợp lệ. */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const authed = await verifySessionToken(token);

  if (pathname.startsWith('/api/')) {
    if (!isWriteMethod(req.method) || OPEN_WRITE_API_PATHS.has(pathname)) {
      return NextResponse.next();
    }
    if (authed) return NextResponse.next();
    return NextResponse.json(
      { error: { message: 'Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại' } },
      { status: 401 },
    );
  }

  if (pathname === '/admin/login') {
    if (authed) return NextResponse.redirect(new URL('/admin', req.url));
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin')) {
    if (authed) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    url.search = '';
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
