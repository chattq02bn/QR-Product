'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Image } from 'antd';
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
  const [expanded, setExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const descRef = useRef<HTMLParagraphElement | null>(null);
  const expandedRef = useRef(false);

  const imageUrl = product.imageUrl?.trim() ?? '';
  const description = product.description?.trim() ?? '';
  const model = findSpecValue(product.specs, ['Model', 'Mô hình']);
  const brand = findSpecValue(product.specs, ['Nhãn hiệu', 'Thương hiệu', 'Brand']);

  useEffect(() => {
    expandedRef.current = expanded;
  }, [expanded]);

  useEffect(() => {
    const element = descRef.current;
    if (!element) return undefined;

    const update = () => {
      if (expandedRef.current) return;
      setHasOverflow(element.scrollHeight > element.clientHeight + 1);
    };

    update();

    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [description]);

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

          {description && (
            <>
              <p
                ref={descRef}
                className={`product-info__desc${expanded ? '' : ' product-info__desc--clamped'}`}
              >
                {description}
              </p>

              {hasOverflow && (
                <Button
                  type="link"
                  size="small"
                  className="product-info__more"
                  onClick={() => setExpanded((value) => !value)}
                >
                  {expanded ? 'Thu gọn' : 'Xem thêm'}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
