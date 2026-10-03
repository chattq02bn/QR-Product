import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import AntdProvider from '@/components/AntdProvider';
import { getAppUrl } from '@/lib/qr';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: {
    default: 'Tra cứu sản phẩm',
    template: '%s | Tra cứu sản phẩm',
  },
  description: 'Quét mã QR để xem hướng dẫn sử dụng chi tiết của từng sản phẩm.',
  applicationName: 'Tra cứu sản phẩm',
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'Tra cứu sản phẩm',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: { index: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#10357a',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <AntdRegistry>
          <AntdProvider>{children}</AntdProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
