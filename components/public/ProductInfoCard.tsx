'use client';

import { Image } from 'antd';
import { isValidHttpUrl } from '@/lib/format';
import type { ProductView, SpecEntry } from '@/lib/types';

type Props = {
  product: ProductView;
};

/** Lấy giá trị của một trường trong JSON thông số theo danh sách tên gọi (không phân biệt hoa thường). */
function findSpecValue(entries: SpecEntry[] | null, labels: string[]): string {
  if (!Array.isArray(entries)) return '';
  const wanted = labels.map((label) => label.trim().toLowerCase());
  const found = entries.find((entry) => wanted.includes((entry.label ?? '').trim().toLowerCase()));
  return (found?.value ?? '').trim();
}

export default function ProductInfoCard({ product }: Props) {
  const imageUrl = product.imageUrl?.trim() ?? '';
  const description = product.description?.trim() ?? '';
  const productCode = product.productCode?.trim() ?? '';
  const model = findSpecValue(product.specs, ['Model', 'Mô hình']);
  const brand = findSpecValue(product.specs, ['Nhãn hiệu', 'Thương hiệu', 'Brand']);

  const hasImage = isValidHttpUrl(imageUrl);

  return (
    <section className="product-info">
      <div className={`product-info__body${hasImage ? '' : ' product-info__body--single'}`}>
        {hasImage && (
          <div className="product-info__media">
            <Image src={imageUrl} alt={product.name} preview={{ mask: 'Xem ảnh' }} />
          </div>
        )}

        <div className="product-info__meta">
          <p className="product-info__name">{product.name}</p>

          {productCode && (
            <p className="product-info__row">
              <span className="product-info__label">Mã sản phẩm:</span> {productCode}
            </p>
          )}

          {model && (
            <p className="product-info__row">
              <span className="product-info__label">Model:</span> {model}
            </p>
          )}

          {brand && (
            <p className="product-info__row">
              <span className="product-info__label">Nhãn hiệu:</span> {brand}
            </p>
          )}

          {description && <p className="product-info__desc">{description}</p>}
        </div>
      </div>
    </section>
  );
}
