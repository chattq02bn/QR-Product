import { NextRequest } from 'next/server';
import { fail, handleApiError, ok, readJson } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import { createSessionCookie } from '@/lib/session';
import { loginSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = loginSchema.parse(await readJson(req));

    const admin = await prisma.admin.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
    });
    if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
      return fail('Tài khoản hoặc mật khẩu không đúng', 401);
    }

    await createSessionCookie();
    return ok({ authenticated: true });
  } catch (error) {
    return handleApiError(error);
  }
}
