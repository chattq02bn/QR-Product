import { NextRequest, NextResponse } from 'next/server';
import {
  OPEN_WRITE_API_PATHS,
  SESSION_COOKIE,
  isAuthEnabled,
  isWriteMethod,
  verifySessionToken,
} from '@/lib/auth';

/**
 * Chặn /admin và các API ghi khi ADMIN_PASSWORD được đặt.
 * Nếu không đặt ADMIN_PASSWORD thì cho truy cập tự do (chế độ dev).
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!isAuthEnabled()) {
    // Đang ở /admin/login trong chế độ tự do -> đưa về /admin
    if (pathname === '/admin/login' && req.method === 'GET') {
      return NextResponse.redirect(new URL('/admin', req.url));
    }
    return NextResponse.next();
  }

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
