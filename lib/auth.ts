import { SignJWT, jwtVerify } from 'jose';

/** Tên cookie lưu phiên đăng nhập admin (httpOnly). */
export const SESSION_COOKIE = 'tracuu_session';
export const SESSION_DAYS = 7;

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Các API được phép ghi mà không cần đăng nhập. */
export const OPEN_WRITE_API_PATHS = new Set(['/api/auth/login', '/api/auth/logout']);

export function isAuthEnabled(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD?.trim());
}

function getSecret(): Uint8Array | null {
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!password) return null;
  return new TextEncoder().encode(`tracuu-session:${password}`);
}

export async function createSessionToken(): Promise<string> {
  const secret = getSecret();
  if (!secret) throw new Error('ADMIN_PASSWORD chưa được cấu hình');
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret);
}

export async function verifySessionToken(token: string | null | undefined): Promise<boolean> {
  const secret = getSecret();
  if (!secret || !token) return false;
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export function isWriteMethod(method: string): boolean {
  return WRITE_METHODS.has(method.toUpperCase());
}
