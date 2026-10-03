'use client';

import { useState } from 'react';
import { App, Button, Modal, QRCode, Space, Typography } from 'antd';
import { CopyOutlined, DownloadOutlined, LinkOutlined, PrinterOutlined } from '@ant-design/icons';
import { copyText, openInNewTab } from '@/lib/client';
import { getLookupPath, getLookupUrl } from '@/lib/qr';
import { printQr } from '@/lib/print';
import { saveImageToDevice } from '@/lib/save-image';

export type QrTarget = { name: string; slug: string } | null;

type Props = {
  target: QrTarget;
  onClose: () => void;
};

export default function QrModal({ target, onClose }: Props) {
  const { message } = App.useApp();
  const [saving, setSaving] = useState(false);
  const link = target ? getLookupUrl(target.slug) : '';

  const handleCopy = async () => {
    try {
      await copyText(link);
      message.success('Đã sao chép link tra cứu');
    } catch {
      message.error('Không sao chép được link');
    }
  };

  const handlePrint = () => {
    if (!target) return;
    const opened = printQr({ name: target.name, slug: target.slug });
    if (!opened) {
      message.warning('Trình duyệt đã chặn cửa sổ in, vui lòng cho phép popup');
    }
  };

  /** Tải PNG: iPhone/iPad lưu thẳng vào thư viện ảnh qua bảng chọn, Android tải về máy. */
  const handleDownloadPng = async () => {
    if (!target || saving) return;
    const url = `/api/qr/${encodeURIComponent(target.slug)}?download=1`;
    const filename = `ma-qr-${target.slug}.png`;

    setSaving(true);
    try {
      const result = await saveImageToDevice(url, filename);
      if (result === 'shared') {
        message.success('Chọn "Lưu ảnh" trong bảng chọn để đưa mã QR vào thư viện ảnh');
      } else if (result === 'downloaded') {
        message.success('Đã lưu PNG vào máy');
      }
    } catch {
      message.error('Không tải được ảnh QR, vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={Boolean(target)}
      onCancel={onClose}
      footer={null}
      title="Mã QR"
      width="min(94vw, 520px)"
      centered
      destroyOnHidden
    >
      {target && (
        <div style={{ textAlign: 'center' }}>
          <Typography.Title level={4} style={{ marginBottom: 4 }}>
            {target.name}
          </Typography.Title>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
            <div className="print-area">
              <QRCode
                value={link}
                size={280}
                bordered
                color="#10357a"
                bgColor="#ffffff"
                style={{ maxWidth: '100%' }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 16,
              flexWrap: 'wrap',
            }}
          >
            <Typography.Text ellipsis style={{ maxWidth: 'min(70vw, 360px)' }} title={link}>
              {link}
            </Typography.Text>
            <Button size="small" icon={<CopyOutlined />} onClick={handleCopy}>
              Copy link
            </Button>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <Space size={[8, 8]} wrap>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                loading={saving}
                onClick={() => void handleDownloadPng()}
              >
                Tải PNG
              </Button>
              <Button icon={<PrinterOutlined />} onClick={handlePrint}>
                In
              </Button>
              <Button
                icon={<LinkOutlined />}
                onClick={() => openInNewTab(getLookupPath(target.slug))}
              >
                Mở trang tra cứu
              </Button>
              <Button onClick={onClose}>Đóng</Button>
            </Space>
          </div>
        </div>
      )}
    </Modal>
  );
}
