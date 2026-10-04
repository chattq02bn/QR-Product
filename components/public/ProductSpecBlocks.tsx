'use client';

import type { ProductView, SpecEntry } from '@/lib/types';

type Props = {
  product: ProductView;
};

function hasEntries(entries: SpecEntry[] | null): entries is SpecEntry[] {
  return Array.isArray(entries) && entries.length > 0;
}

function SpecBlock({ title, entries }: { title: string; entries: SpecEntry[] }) {
  return (
    <section className="public-specs">
      <h2 className="public-specs__title">{title}</h2>
      <dl className="public-specs__list">
        {entries.map((entry, index) => (
          <div className="public-specs__row" key={`${entry.label}-${index}`}>
            <dt className="public-specs__label">{entry.label}</dt>
            <dd className="public-specs__value">{entry.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Khối "Thông số kỹ thuật" và "Nhà sản xuất / Đơn vị phân phối" trên trang tra cứu. */
export default function ProductSpecBlocks({ product }: Props) {
  const specs = product.specs;
  const distributor = product.distributor;

  if (!hasEntries(specs) && !hasEntries(distributor)) return null;

  return (
    <>
      {hasEntries(specs) && <SpecBlock title="Thông số kỹ thuật" entries={specs} />}
      {hasEntries(distributor) && (
        <SpecBlock title="Nhà sản xuất / Đơn vị phân phối" entries={distributor} />
      )}
    </>
  );
}
