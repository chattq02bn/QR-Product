'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Image } from 'antd';
import { isValidHttpUrl } from '@/lib/format';
import type { ProductView } from '@/lib/types';

type Props = {
  product: ProductView;
};

export default function ProductInfoCard({ product }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const descRef = useRef<HTMLParagraphElement | null>(null);
  const expandedRef = useRef(false);

  const imageUrl = product.imageUrl?.trim() ?? '';
  const manufacturer = product.manufacturer?.trim() ?? '';
  const description = product.description?.trim() ?? '';

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
          {manufacturer && (
            <p className="product-info__row">
              <span className="product-info__label">NSX:</span> {manufacturer}
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
