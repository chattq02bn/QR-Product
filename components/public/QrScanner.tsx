'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Modal, Spin } from 'antd';
import { PictureOutlined } from '@ant-design/icons';
import { decodeQrFromImageData } from '@/lib/qr-decode';

type Props = {
  open: boolean;
  error: string | null;
  decoding?: boolean;
  onClose: () => void;
  onPickImage: () => void;
  onResult: (raw: string) => void;
};

const FRAME_INTERVAL_MS = 150;
const MAX_FRAME_EDGE = 960;

export default function QrScanner({
  open,
  error,
  decoding = false,
  onClose,
  onPickImage,
  onResult,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onResultRef = useRef(onResult);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  onResultRef.current = onResult;

  useEffect(() => {
    if (!open) return;

    let stream: MediaStream | null = null;
    let videoEl: HTMLVideoElement | null = null;
    let frameId = 0;
    let disposed = false;
    let lastScanAt = 0;
    const canvas = document.createElement('canvas');

    setCameraError(null);
    setStarting(true);

    const scanFrame = (now: number) => {
      if (disposed) return;
      frameId = requestAnimationFrame(scanFrame);

      const video = videoRef.current;
      if (!video || video.readyState < 2 || now - lastScanAt < FRAME_INTERVAL_MS) return;

      const width = video.videoWidth;
      const height = video.videoHeight;
      if (!width || !height) return;

      lastScanAt = now;

      const ratio = Math.min(1, MAX_FRAME_EDGE / Math.max(width, height));
      const targetWidth = Math.max(1, Math.round(width * ratio));
      const targetHeight = Math.max(1, Math.round(height * ratio));
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return;

      context.drawImage(video, 0, 0, targetWidth, targetHeight);

      const found = decodeQrFromImageData(
        context.getImageData(0, 0, targetWidth, targetHeight),
        'dontInvert',
      );
      if (found) onResultRef.current(found);
    };

    const waitForVideo = async (): Promise<HTMLVideoElement | null> => {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (disposed) return null;
        const video = videoRef.current;
        if (video) return video;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return disposed ? null : videoRef.current;
    };

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Trình duyệt này không hỗ trợ camera. Hãy chọn ảnh mã QR từ thư viện.');
        setStarting(false);
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });

        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const video = await waitForVideo();
        if (!video) {
          stream.getTracks().forEach((track) => track.stop());
          setCameraError('Không khởi tạo được camera. Hãy chọn ảnh mã QR từ thư viện.');
          setStarting(false);
          return;
        }

        videoEl = video;
        video.srcObject = stream;
        await video.play();

        if (disposed) return;

        setStarting(false);
        frameId = requestAnimationFrame(scanFrame);
      } catch {
        if (disposed) return;
        setCameraError(
          'Không thể truy cập camera (trang cần HTTPS để dùng camera). Vui lòng cấp quyền hoặc chọn ảnh từ thư viện.',
        );
        setStarting(false);
      }
    };

    void start();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      stream?.getTracks().forEach((track) => track.stop());

      if (videoEl) videoEl.srcObject = null;
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
            <video ref={videoRef} className="qr-scanner__video" autoPlay playsInline muted />
            <span className="qr-scanner__frame" aria-hidden="true" />
            {starting && (
              <div className="qr-scanner__loading">
                <Spin />
                <span>Đang bật camera…</span>
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
            icon={<PictureOutlined />}
            block
            loading={decoding}
            disabled={decoding}
            onClick={onPickImage}
          >
            {decoding ? 'Đang đọc mã QR...' : 'Chọn ảnh từ thư viện'}
          </Button>
          <Button block disabled={decoding} onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </Modal>
  );
}
