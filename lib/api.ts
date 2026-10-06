import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, { status: 200, ...init });
}

export function fail(message: string, status: number): NextResponse {
  return NextResponse.json({ error: { message } }, { status });
}

/** Bắt lỗi chung của API và trả về response thống nhất. */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof InvalidBodyError) {
    return fail(error.message, 400);
  }

  if (error instanceof ZodError) {
    const first = error.issues[0];
    const message = first
      ? first.path.length > 0
        ? `${first.path.join('.')}: ${first.message}`
        : first.message
      : 'Dữ liệu không hợp lệ';
    return fail(message, 400);
  }

  if (isPrismaError(error) && error.code === 'P2002') {
    return fail('Mã tra cứu đã tồn tại, vui lòng chọn mã khác', 409);
  }

  if (isPrismaError(error) && error.code === 'P2025') {
    return fail('Không tìm thấy dữ liệu', 404);
  }

  console.error('[api] unexpected error:', error);
  return fail('Đã có lỗi xảy ra, vui lòng thử lại', 500);
}

type PrismaError = { code: string };

export function isPrismaError(error: unknown): error is PrismaError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  );
}

export function isP2002(error: unknown): boolean {
  return isPrismaError(error) && error.code === 'P2002';
}

/** Lỗi vi phạm unique (P2002) của đúng cột `field` (ví dụ: "productCode"). */
export function isP2002On(error: unknown, field: string): boolean {
  if (!isP2002(error)) return false;
  const target = (error as { meta?: { target?: unknown } }).meta?.target;
  const text = Array.isArray(target) ? target.join(',') : typeof target === 'string' ? target : '';
  return text.includes(field);
}

/** Đọc JSON body an toàn, ném lỗi 400 nếu không phải JSON hợp lệ. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new InvalidBodyError();
  }
}

export class InvalidBodyError extends Error {
  constructor(message = 'Dữ liệu gửi lên không hợp lệ') {
    super(message);
    this.name = 'InvalidBodyError';
  }
}
