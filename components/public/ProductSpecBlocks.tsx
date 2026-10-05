'use client';

import type { ProductView, SpecEntry } from '@/lib/types';

type Props = {
  product: ProductView;
};

/** Nhãn dòng mã sản phẩm hiển thị trong khối "Thông số kỹ thuật". */
const PRODUCT_CODE_LABEL = 'Mã sản phẩm';

/** Các nhãn đứng trước mã sản phẩm để chèn dòng ngay phía sau. */
const PRECEDING_LABELS = ['nhãn hiệu', 'thương hiệu', 'brand', 'tên sản phẩm'];

function hasEntries(entries: SpecEntry[] | null): entries is SpecEntry[] {
  return Array.isArray(entries) && entries.length > 0;
}

function normalizeLabel(label?: string): string {
  return (label ?? '').trim().toLowerCase();
}

/**
 * Chèn dòng "Mã sản phẩm" (lấy từ cột productCode) vào danh sách thông số.
 * Không chèn trùng khi dữ liệu đã sẵn dòng "Mã sản phẩm".
 */
function withProductCode(entries: SpecEntry[] | null, productCode: string): SpecEntry[] {
  const rows = Array.isArray(entries) ? entries.map((entry) => ({ ...entry })) : [];

  const duplicated = rows.some(
    (row) => normalizeLabel(row.label) === normalizeLabel(PRODUCT_CODE_LABEL),
  );
  if (duplicated) return rows;

  // Chèn ngay sau dòng thông tin định danh gần nhất (nhãn hiệu / tên sản phẩm).
  const precedingIndex = rows.reduce(
    (found, row, index) => (PRECEDING_LABELS.includes(normalizeLabel(row.label)) ? index : found),
    -1,
  );

  rows.splice(precedingIndex + 1, 0, { label: PRODUCT_CODE_LABEL, value: productCode });
  return rows;
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
  const productCode = product.productCode?.trim() ?? '';
  const specs = productCode ? withProductCode(product.specs, productCode) : product.specs;
  const distributor = product.distributor;

  if (!hasEntries(specs) && !hasEntries(distributor)) return null;

  return (
    <>
      {hasEntries(specs) && <SpecBlock title="Thông số kỹ thuật" entries={specs} />}
      {hasEntries(distributor) && (
        <SpecBlock title="Đơn vị nhập khẩu" entries={distributor} />
      )}
    </>
  );
}
