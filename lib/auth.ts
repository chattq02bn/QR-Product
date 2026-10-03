import { SignJWT, jwtVerify } from 'jose';

/** Tên cookie lưu phiên đăng nhập admin (httpOnly). */
export const SESSION_COOKIE = 'tracuu_session';
export const SESSION_DAYS = 7;

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Các API được phép ghi mà không cần đăng nhập. */
export const OPEN_WRITE_API_PATHS = new Set(['/api/auth/login', '/api/auth/logout']);

/** Đăng nhập luôn bật: /admin và API ghi chỉ mở khi có phiên hợp lệ. */
export function isAuthEnabled(): boolean {
  return true;
}

function getSecret(): Uint8Array {
  const material =
    process.env.SESSION_SECRET?.trim() ||
    process.env.ADMIN_PASSWORD?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    'tracuu-dev-session';
  return new TextEncoder().encode(`tracuu-session:${material}`);
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

export function isWriteMethod(method: string): boolean {
  return WRITE_METHODS.has(method.toUpperCase());
}
