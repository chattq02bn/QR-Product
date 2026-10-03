'use client';

import { App, Button, Modal, QRCode, Space, Typography } from 'antd';
import { CopyOutlined, DownloadOutlined, LinkOutlined, PrinterOutlined } from '@ant-design/icons';
import { copyText, openInNewTab } from '@/lib/client';
import { getLookupPath, getLookupUrl } from '@/lib/qr';
import { printQr } from '@/lib/print';

export type QrTarget = { name: string; slug: string } | null;

type Props = {
  target: QrTarget;
  onClose: () => void;
};

export default function QrModal({ target, onClose }: Props) {
  const { message } = App.useApp();
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
                onClick={() =>
                  openInNewTab(`/api/qr/${encodeURIComponent(target.slug)}?download=1`)
                }
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
