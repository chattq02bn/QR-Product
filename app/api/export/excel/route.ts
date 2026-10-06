import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { fail, handleApiError, readJson } from '@/lib/api';
import { getQrCode } from '@/lib/qr';
import { QR_PNG_SIZE, renderQrPng } from '@/lib/qr-png';
import { prisma } from '@/lib/prisma';
import { excelExportSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

/** Kích thước ảnh QR nhúng trong ô Excel (px). */
const QR_IMAGE_SIZE = 96;

/** Chiều cao dòng chứa ảnh QR (point, 1 point ≈ 1.33px). */
const QR_ROW_HEIGHT = 78;

/** Đọc giá trị của một thông số (theo label) từ mảng specs JSON của sản phẩm. */
function findSpecValue(specs: unknown, labels: string[]): string {
  if (!Array.isArray(specs)) return '';
  const wanted = labels.map((label) => label.trim().toLowerCase());

  for (const entry of specs) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as { label?: unknown; value?: unknown };
    const label = typeof record.label === 'string' ? record.label.trim().toLowerCase() : '';
    if (!wanted.includes(label)) continue;
    if (record.value === null || record.value === undefined) return '';
    return String(record.value).trim();
  }

  return '';
}

/**
 * POST /api/export/excel
 * Xuất danh sách sản phẩm ra file .xlsx gồm: Tên sản phẩm, Mã sản phẩm,
 * Mã sản phẩm hiển thị, Model và ảnh QR (nhúng sẵn vào ô Excel).
 * Body: { all: true } để xuất tất cả, hoặc { ids: [...] } để xuất sản phẩm đã chọn.
 */
export async function POST(req: NextRequest) {
  try {
    const body = excelExportSchema.parse(await readJson(req));

    const products = await prisma.product.findMany({
      where: body.all ? {} : { id: { in: body.ids } },
      select: {
        id: true,
        name: true,
        slug: true,
        productCode: true,
        productCodeAlias: true,
        specs: true,
      },
      orderBy: { slug: 'asc' },
    });

    if (products.length === 0) {
      return fail('Không tìm thấy sản phẩm để tải file Excel', 404);
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Tra cuu san pham';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Sản phẩm');
    sheet.columns = [
      { header: 'Tên sản phẩm', key: 'name', width: 42 },
      { header: 'Mã sản phẩm', key: 'productCode', width: 18 },
      { header: 'Mã sản phẩm hiển thị', key: 'productCodeAlias', width: 24 },
      { header: 'Model', key: 'model', width: 24 },
      { header: 'Ảnh QR', key: 'qr', width: 20 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10357A' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FF0D2A61' } } };
    });

    // Sinh ảnh QR theo nhóm nhỏ để không chiếm nhiều bộ nhớ (giống API tải QR)
    const qrImages: Buffer[] = Array.from({ length: products.length });
    const CONCURRENCY = 8;
    for (let i = 0; i < products.length; i += CONCURRENCY) {
      const chunk = products.slice(i, i + CONCURRENCY);
      await Promise.all(
        chunk.map(async (product, index) => {
          qrImages[i + index] = await renderQrPng(getQrCode(product), QR_PNG_SIZE);
        }),
      );
    }

    products.forEach((product, index) => {
      const row = sheet.addRow({
        name: product.name,
        productCode: product.productCode,
        productCodeAlias: product.productCodeAlias?.trim() || '',
        model: findSpecValue(product.specs, ['Model', 'Mô hình']),
        qr: '',
      });
      row.height = QR_ROW_HEIGHT;
      row.alignment = { vertical: 'middle' };
      row.getCell('name').alignment = { vertical: 'middle', wrapText: true };

      // exceljs khai báo kiểu Buffer riêng (extends ArrayBuffer) nên cần ép kiểu
      const imageId = workbook.addImage({
        buffer: qrImages[index] as unknown as ArrayBuffer,
        extension: 'png',
      });
      // Cột "Ảnh QR" là cột thứ 5 -> chỉ số cột 4 (0-based), chèn từ dòng 2
      sheet.addImage(imageId, {
        tl: { col: 4.15, row: row.number - 1 + 0.2 },
        ext: { width: QR_IMAGE_SIZE, height: QR_IMAGE_SIZE },
        editAs: 'oneCell',
      });
    });

    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: 'A1', to: 'E1' };

    const bytes = Buffer.from(await workbook.xlsx.writeBuffer());
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
    const filename = `danh-sach-san-pham-${products.length}-san-pham-${stamp}.xlsx`;

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Length': String(bytes.byteLength),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
