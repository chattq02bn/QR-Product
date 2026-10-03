import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { fail, handleApiError, readJson } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { QR_PNG_SIZE, renderQrPng } from '@/lib/qr-png';
import { qrExportSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

/** Các đường dẫn có thể chứa Rar.exe của WinRAR. */
const RAR_CANDIDATES = [
  process.env.RAR_PATH?.trim(),
  'C:\\Program Files\\WinRAR\\Rar.exe',
  'C:\\Program Files (x86)\\WinRAR\\Rar.exe',
  'Rar.exe',
].filter((value): value is string => Boolean(value));

/** Tìm Rar.exe: ưu tiên RAR_PATH, sau đó WinRAR mặc định, cuối cùng là PATH. */
async function resolveRarBin(): Promise<string | null> {
  for (const candidate of RAR_CANDIDATES) {
    if (candidate === 'Rar.exe') return candidate;
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // tiếp tục thử ứng viên tiếp theo
    }
  }
  return null;
}

function runRar(rarBin: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(rarBin, args, { cwd, windowsHide: true });
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      output += String(chunk);
    });
    child.on('error', (error) => {
      reject(new Error(`Không chạy được Rar.exe: ${error.message}`));
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Rar.exe lỗi (mã ${code}): ${output.trim()}`));
    });
  });
}

/**
 * POST /api/qr/export
 * Sinh ảnh PNG mã QR rồi nén thành file .rar để tải về.
 * Body: { all: true } để tải tất cả, hoặc { ids: [...] } để tải các sản phẩm đã chọn.
 */
export async function POST(req: NextRequest) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qr-export-'));

  try {
    const body = qrExportSchema.parse(await readJson(req));
    const size = body.size ?? QR_PNG_SIZE;

    const products = await prisma.product.findMany({
      where: body.all ? {} : { id: { in: body.ids } },
      select: { id: true, slug: true },
      orderBy: { slug: 'asc' },
    });

    if (products.length === 0) {
      return fail('Không tìm thấy sản phẩm để tải mã QR', 404);
    }

    // Sinh ảnh PNG, xử lý song song theo nhóm nhỏ để không chiếm nhiều bộ nhớ
    const CONCURRENCY = 8;
    for (let i = 0; i < products.length; i += CONCURRENCY) {
      const chunk = products.slice(i, i + CONCURRENCY);
      await Promise.all(
        chunk.map(async (product) => {
          const buffer = await renderQrPng(product.slug, size);
          await fs.writeFile(path.join(tempDir, `${product.slug}.png`), buffer);
        }),
      );
    }

    const bin = await resolveRarBin();
    if (!bin) {
      return fail(
        'Không tìm thấy Rar.exe của WinRAR trên máy chủ. Hãy cài WinRAR hoặc đặt biến RAR_PATH.',
        503,
      );
    }

    const archivePath = path.join(tempDir, 'ma-qr.rar');

    try {
      await runRar(bin, ['a', '-idq', '-ep1', archivePath, '*.png'], tempDir);
    } catch (error) {
      console.error('[qr-export] lỗi nén .rar:', error);
      return fail(
        'Không nén được file .rar: máy chủ cần cài WinRAR (Rar.exe). Đặt biến RAR_PATH nếu WinRAR nằm ở thư mục khác.',
        503,
      );
    }

    const bytes = await fs.readFile(archivePath);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
    const filename = `ma-qr-${products.length}-san-pham-${stamp}.rar`;

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.rar',
        'Content-Length': String(bytes.byteLength),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return handleApiError(error);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
