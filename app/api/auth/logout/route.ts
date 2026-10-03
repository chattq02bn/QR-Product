import { ok } from '@/lib/api';
import { clearSessionCookie } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST() {
  clearSessionCookie();
  return ok({ authenticated: false });
}
