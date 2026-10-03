'use client';

import type { ReactNode } from 'react';
import { App, ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';

export default function AntdProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: '#10357a',
          colorLink: '#10357a',
          borderRadius: 8,
          fontSize: 14,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}
