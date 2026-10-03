import { getLookupUrl } from '@/lib/qr';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Mở cửa sổ in chỉ gồm tên sản phẩm + mã QR.
 * Trả về false nếu trình duyệt chặn cửa sổ bật lên.
 */
export function printQr(options: { name: string; slug: string; size?: number }): boolean {
  const { name, slug } = options;
  const link = getLookupUrl(slug);
  const qrUrl = `/api/qr/${encodeURIComponent(slug)}?size=${options.size ?? 512}`;

  const win = window.open('', '_blank', 'width=520,height=720');
  if (!win) return false;

  win.document.write(`<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Mã QR - ${escapeHtml(name)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px 16px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    color: #1f1f1f;
    text-align: center;
  }
  h1 { font-size: 20px; color: #10357a; margin: 0 0 20px; line-height: 1.35; }
  img.qr { width: 300px; max-width: 90vw; height: auto; border: 1px solid #e8edf7; border-radius: 8px; }
  p.link { font-size: 13px; color: #5a6478; word-break: break-all; margin: 16px auto 0; max-width: 460px; }
  .note { font-size: 12px; color: #8a94a6; margin-top: 6px; }
  .no-print { margin-top: 24px; }
  .no-print button {
    font-size: 15px; padding: 10px 22px; border: 0; border-radius: 8px;
    background: #10357a; color: #fff; cursor: pointer;
  }
  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
    img.qr { border: 0; }
  }
</style>
</head>
<body>
  <div class="print-area">
    <h1>${escapeHtml(name)}</h1>
    <img class="qr" src="${qrUrl}" alt="Mã QR tra cứu sản phẩm" />
    <p class="link">${escapeHtml(link)}</p>
    <p class="note">Quét mã QR để xem hướng dẫn sử dụng sản phẩm.</p>
  </div>
  <div class="no-print">
    <button type="button" onclick="window.print()">In mã QR</button>
  </div>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 500);
    });
  </script>
</body>
</html>`);
  win.document.close();
  win.focus();
  return true;
}
