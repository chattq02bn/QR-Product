import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_DAYS, createSessionToken, verifySessionToken } from '@/lib/auth';
import { getAppUrl } from '@/lib/qr';

/** Cookie chỉ gắn cờ Secure khi trang đang chạy bằng https. */
function isHttpsDeployment(): boolean {
  return getAppUrl().toLowerCase().startsWith('https://');
}

/** Kiểm tra phiên đăng nhập hiện tại (chỉ gọi phía server). */
export async function isAdminAuthenticated(): Promise<boolean> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

/** Gọi trong các API ghi: trả về response lỗi 401 nếu chưa đăng nhập. */
export async function requireAdmin(): Promise<NextResponse | null> {
  if (await isAdminAuthenticated()) return null;
  return NextResponse.json(
    { error: { message: 'Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại' } },
    { status: 401 },
  );
}

export async function createSessionCookie(): Promise<void> {
  const token = await createSessionToken();
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttpsDeployment(),
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie(): void {
  cookies().delete(SESSION_COOKIE);
}
