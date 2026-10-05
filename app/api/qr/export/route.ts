import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { fail, handleApiError, readJson } from '@/lib/api';
import { createZip } from '@/lib/zip';
import { prisma } from '@/lib/prisma';
import { QR_PNG_SIZE, renderQrPng } from '@/lib/qr-png';
import { getQrCode } from '@/lib/qr';
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
 * Sinh ảnh PNG mã QR rồi nén thành file .rar (hoặc .zip dự phòng) để tải về.
 * Body: { all: true } để tải tất cả, hoặc { ids: [...] } để tải các sản phẩm đã chọn.
 */
export async function POST(req: NextRequest) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qr-export-'));

  try {
    const body = qrExportSchema.parse(await readJson(req));
    const size = body.size ?? QR_PNG_SIZE;

    const products = await prisma.product.findMany({
      where: body.all ? {} : { id: { in: body.ids } },
      select: { id: true, slug: true, productCode: true },
      orderBy: { slug: 'asc' },
    });

    if (products.length === 0) {
      return fail('Không tìm thấy sản phẩm để tải mã QR', 404);
    }

    // Sinh ảnh PNG, xử lý song song theo nhóm nhỏ để không chiếm nhiều bộ nhớ
    const files: { name: string; data: Buffer }[] = [];
    const CONCURRENCY = 8;
    for (let i = 0; i < products.length; i += CONCURRENCY) {
      const chunk = products.slice(i, i + CONCURRENCY);
      await Promise.all(
        chunk.map(async (product) => {
          // QR và tên file lấy theo mã sản phẩm: 1 mã -> 1 hình QR, kể cả khi tạo lại
          const code = getQrCode(product);
          const buffer = await renderQrPng(code, size);
          files.push({ name: `${code}.png`, data: buffer });
        }),
      );
    }
    files.sort((a, b) => a.name.localeCompare(b.name));

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
    const bin = await resolveRarBin();

    let bytes: Buffer;
    let ext: 'rar' | 'zip';

    if (bin) {
      await Promise.all(
        files.map((file) => fs.writeFile(path.join(tempDir, file.name), file.data)),
      );
      const archivePath = path.join(tempDir, 'ma-qr.rar');
      try {
        await runRar(bin, ['a', '-idq', '-ep1', archivePath, '*.png'], tempDir);
        bytes = await fs.readFile(archivePath);
        ext = 'rar';
      } catch (error) {
        // Không nén được bằng WinRAR: chuyển sang .zip thuần Node.js
        console.error('[qr-export] lỗi nén .rar, chuyển sang .zip:', error);
        bytes = createZip(files);
        ext = 'zip';
      }
    } else {
      // Không có WinRAR: tự nén .zip bằng Node.js, không cần cài thêm gì
      bytes = createZip(files);
      ext = 'zip';
    }

    const filename = `ma-qr-${products.length}-san-pham-${stamp}.${ext}`;

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': ext === 'rar' ? 'application/vnd.rar' : 'application/zip',
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
