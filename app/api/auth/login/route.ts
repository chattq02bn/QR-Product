import { NextRequest } from 'next/server';
import { fail, handleApiError, ok, readJson } from '@/lib/api';
import { isAuthEnabled } from '@/lib/auth';
import { createSessionCookie } from '@/lib/session';
import { loginSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { password } = loginSchema.parse(await readJson(req));

    if (!isAuthEnabled()) {
      // Chế độ dev: không đặt ADMIN_PASSWORD thì cho truy cập tự do
      return ok({ authenticated: true, mode: 'open' });
    }

    const adminPassword = process.env.ADMIN_PASSWORD?.trim() ?? '';
    if (password !== adminPassword) {
      return fail('Mật khẩu không đúng', 401);
    }

    await createSessionCookie();
    return ok({ authenticated: true, mode: 'protected' });
  } catch (error) {
    return handleApiError(error);
  }
}
