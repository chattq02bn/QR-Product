'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Modal, Spin } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { Html5Qrcode } from 'html5-qrcode';

type Props = {
  open: boolean;
  error: string | null;
  decoding?: boolean;
  onClose: () => void;
  onPickImage: () => void;
  onResult: (raw: string) => void;
};

const VIEWPORT_ID = 'qr-scanner-host';
const CAMERA_START_TIMEOUT_MS = 15000;

export default function QrScanner({
  open,
  error,
  decoding = false,
  onClose,
  onPickImage,
  onResult,
}: Props) {
  const onResultRef = useRef(onResult);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  onResultRef.current = onResult;

  useEffect(() => {
    if (!open) return undefined;

    let scanner: Html5Qrcode | null = null;
    let disposed = false;

    setCameraError(null);
    setStarting(true);

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Thiết bị này không hỗ trợ camera. Hãy bấm "Upload QR" để chọn ảnh mã QR.');
        setStarting(false);
        return;
      }

      try {
        const html5Qrcode = new Html5Qrcode(VIEWPORT_ID, { verbose: false });
        scanner = html5Qrcode;

        let timedOut = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeout = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            timedOut = true;
            reject(new Error('camera-start-timeout'));
          }, CAMERA_START_TIMEOUT_MS);
        });

        try {
          const startPromise = html5Qrcode.start(
            { facingMode: 'environment' },
            { fps: 10 },
            (decodedText) => {
              if (disposed) return;
              void html5Qrcode.stop().catch(() => undefined);
              onResultRef.current(decodedText);
            },
            () => undefined,
          );
          startPromise.then(() => {
            if (timedOut) void html5Qrcode.stop().catch(() => undefined);
          });
          await Promise.race([startPromise, timeout]);
        } finally {
          clearTimeout(timer);
        }

        if (disposed) {
          await html5Qrcode.stop().catch(() => undefined);
          return;
        }

        setStarting(false);
      } catch {
        if (disposed) return;
        if (scanner) await scanner.stop().catch(() => undefined);
        setCameraError('Không thể bật camera. Hãy bấm "Upload QR" để chọn ảnh mã QR.');
        setStarting(false);
      }
    };

    void start();

    return () => {
      disposed = true;
      if (scanner) void scanner.stop().catch(() => undefined);
    };
  }, [open]);

  return (
    <Modal
      open={open}
      title="Quét mã QR"
      onCancel={onClose}
      footer={null}
      centered
      width={440}
      className="qr-scanner-modal"
    >
      <div className="qr-scanner">
        {cameraError ? (
          <div className="public-lookup__error" role="alert">
            {cameraError}
          </div>
        ) : (
          <div className="qr-scanner__viewport">
            <div id={VIEWPORT_ID} className="qr-scanner__host" />
            <span className="qr-scanner__frame" aria-hidden="true" />
            {starting && (
              <div className="qr-scanner__loading">
                <Spin />
                <span>Đang bật camera (mặt sau)…</span>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="public-lookup__error" role="alert">
            {error}
          </div>
        )}

        <div className="qr-scanner__actions">
          <Button
            type="primary"
            icon={<UploadOutlined />}
            block
            loading={decoding}
            disabled={decoding}
            onClick={onPickImage}
          >
            {decoding ? 'Đang đọc mã QR...' : 'Upload QR'}
          </Button>
          <Button block disabled={decoding} onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </Modal>
  );
}
