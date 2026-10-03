'use client';

import { useEffect, useState } from 'react';
import { App, Button, Space, Tag } from 'antd';
import { HomeOutlined, LogoutOutlined } from '@ant-design/icons';
import { apiFetch, openInNewTab } from '@/lib/client';

/** Thanh header của trang quản trị. */
export default function AdminHeader() {
  const { message } = App.useApp();
  const [authEnabled, setAuthEnabled] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let alive = true;
    apiFetch<{ authEnabled: boolean }>('/api/auth/status')
      .then((data) => {
        if (alive) setAuthEnabled(data.authEnabled);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
      message.success('Đã đăng xuất');
      window.location.assign('/admin/login');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Đăng xuất thất bại');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="admin-topbar admin-no-print">
      <div className="admin-topbar__inner">
        <a className="admin-topbar__brand" href="/admin">
          <span className="admin-topbar__accent" aria-hidden="true" />
          <span className="admin-topbar__title">Tra cứu sản phẩm</span>
          <Tag className="admin-topbar__tag" color="#1677ff">
            Quản trị
          </Tag>
        </a>

        <Space wrap size={[8, 8]}>
          <Button
            icon={<HomeOutlined />}
            onClick={() => openInNewTab('/')}
            title="Mở trang tra cứu công khai"
          >
            Xem trang công khai
          </Button>
          {authEnabled && (
            <Button
              danger
              icon={<LogoutOutlined />}
              loading={loggingOut}
              onClick={() => void handleLogout()}
            >
              Đăng xuất
            </Button>
          )}
        </Space>
      </div>
    </header>
  );
}
