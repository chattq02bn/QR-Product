'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Image, Result, Typography } from 'antd';
import { QrcodeOutlined } from '@ant-design/icons';
import QrScanner from '@/components/public/QrScanner';
import ProductInfoCard from '@/components/public/ProductInfoCard';
import ProductSpecBlocks from '@/components/public/ProductSpecBlocks';
import { decodeQrFromFile, extractLookupCode } from '@/lib/qr-decode';
import { isExpired } from '@/lib/format';
import type { ProductView } from '@/lib/types';

type Props = {
  code: string;
  product: ProductView | null;
  loadError: boolean;
};

export default function PublicContent({ code, product, loadError }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [decoding, setDecoding] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleScanResult = (raw: string) => {
    const found = extractLookupCode(raw);
    if (!found) {
      setScanError('Mã QR không chứa mã tra cứu hợp lệ. Hãy quét mã QR in trên sản phẩm.');
      return;
    }
    setScannerOpen(false);
    window.location.href = `/?code=${encodeURIComponent(found)}`;
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setScanError(null);
    setDecoding(true);
    try {
      const raw = await decodeQrFromFile(file);
      if (!raw) {
        setScanError('Không tìm thấy mã QR trong ảnh. Vui lòng chọn ảnh chứa mã QR rõ hơn.');
        return;
      }
      handleScanResult(raw);
    } catch {
      setScanError('Không đọc được tệp ảnh này. Vui lòng chọn ảnh JPG hoặc PNG.');
    } finally {
      setDecoding(false);
    }
  };

  const openScanner = () => {
    setScanError(null);
    setScannerOpen(true);
  };

  const scanPanel = (
    <div className="public-lookup">
      <div className="public-intro">
        <h2 className="public-intro__title">Quét mã QR để tra cứu sản phẩm</h2>
        <ul className="public-intro__list">
          <li>Đưa mã QR in trên bao bì sản phẩm vào khung quét.</li>
          <li>Máy ảnh (mặt sau) tự nhận diện mã, không cần nhập tay.</li>
          <li>Thiết bị không có camera: bấm &quot;Upload QR&quot; chọn ảnh mã QR.</li>
        </ul>
      </div>

      {scanError && (
        <p className="public-lookup__error" role="alert">
          {scanError}
        </p>
      )}

      <Button
        type="primary"
        size="large"
        block
        icon={<QrcodeOutlined />}
        className="public-scan-btn"
        loading={decoding}
        disabled={decoding}
        onClick={openScanner}
      >
        Quét mã QR
      </Button>
      <p className="public-lookup__hint">
        Điện thoại: quét bằng camera mặt sau • Không có camera: Upload QR
      </p>
    </div>
  );

  let content;

  if (loadError) {
    content = (
      <div className="public-empty">
        <Result
          status="warning"
          title="Không thể tải dữ liệu"
          subTitle="Vui lòng kiểm tra kết nối và thử lại."
          extra={
            <Button type="primary" onClick={() => router.refresh()}>
              Thử lại
            </Button>
          }
        />
        {scanPanel}
      </div>
    );
  } else if (!code) {
    content = scanPanel;
  } else if (!product) {
    content = (
      <div className="public-empty">
        <Result
          status="404"
          title="Không tìm thấy sản phẩm"
          subTitle={`Mã tra cứu "${code}" không tồn tại. Vui lòng quét lại mã QR trên sản phẩm.`}
          extra={
            <Button type="primary" onClick={() => router.push('/')}>
              Quét mã QR khác
            </Button>
          }
        />
        {scanPanel}
      </div>
    );
  } else if (isExpired(product.qrExpiresAt)) {
    content = (
      <div className="public-empty">
        <Typography.Title level={2} className="public-product-name">
          {product.name}
        </Typography.Title>
        <Result
          status="warning"
          title="Mã QR đã hết hạn"
          subTitle={`Mã QR của sản phẩm "${product.name}" đã hết hạn sử dụng. Vui lòng liên hệ nơi bán để nhận mã QR mới hoặc quét mã QR khác.`}
          extra={
            <Button type="primary" onClick={() => router.push('/')}>
              Quét mã QR khác
            </Button>
          }
        />
        {scanPanel}
      </div>
    );
  } else {
    content = (
      <div>
        <ProductInfoCard key={product.id} product={product} />
        <ProductSpecBlocks product={product} />

        {product.images.length === 0 ? (
          <Result
            status="info"
            title="Sản phẩm chưa có ảnh hướng dẫn"
            subTitle="Vui lòng quét lại mã QR sau khi administrator cập nhật ảnh."
          />
        ) : (
          <section className="public-guides">
            <h2 className="public-guides__title">Hướng dẫn sử dụng</h2>

            <div className="public-guides__list">
              {product.images.map((image, index) => (
                <Image
                  key={image.id}
                  src={image.url}
                  alt={`Trang hướng dẫn ${index + 1}`}
                  loading="lazy"
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                  preview={false}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  return (
    <>
      <header className="public-header">
        <span className="public-header__accent" aria-hidden="true" />
        <h1 className="public-header__title">Tra cứu sản phẩm</h1>
        <Button
          type="primary"
          ghost
          size="small"
          icon={<QrcodeOutlined />}
          className="public-header__scan"
          onClick={openScanner}
        >
          Quét QR
        </Button>
      </header>

      <main className="public-main">{content}</main>

      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />

      {mounted && (
        <QrScanner
          open={scannerOpen}
          error={scanError}
          decoding={decoding}
          onClose={() => setScannerOpen(false)}
          onPickImage={() => fileInputRef.current?.click()}
          onResult={handleScanResult}
        />
      )}
    </>
  );
}
