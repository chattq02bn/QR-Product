import { cache } from 'react';
import type { Metadata } from 'next';
import type { ProductView } from '@/lib/types';
import { toProductView } from '@/lib/serialize';
import { findProductByCode } from '@/lib/lookup';
import { isValidHttpUrl } from '@/lib/format';
import { getAppUrl, getLookupUrl } from '@/lib/qr';
import PublicContent from '@/components/public/PublicContent';

export const dynamic = 'force-dynamic';

const SITE_NAME = 'Tra cứu sản phẩm';
/** Next 14 không áp title template cho trang cấp ngay dưới RootLayout nên tự nối hậu tố. */
const TITLE_SUFFIX = ' | Tra cứu sản phẩm';
const DEFAULT_DESCRIPTION = 'Quét mã QR để xem hướng dẫn sử dụng chi tiết của từng sản phẩm.';

type PageProps = {
  searchParams: { code?: string };
};

type LookupResult = {
  product: ProductView | null;
  loadError: boolean;
};

const lookupProduct = cache(async (code: string): Promise<LookupResult> => {
  try {
    const found = await findProductByCode(code);
    return { product: found ? toProductView(found) : null, loadError: false };
  } catch (error) {
    console.error('[lookup] lỗi truy vấn dữ liệu:', error);
    return { product: null, loadError: true };
  }
});

/** Ảnh chia sẻ: ảnh sản phẩm đầu tiên -> ảnh hướng dẫn đầu tiên -> ảnh mã QR (luôn có ảnh cho OGP). */
function pickShareImage(product: ProductView): string {
  const productImage = product.images.find((image) => image.kind === 'product');
  const guideImage = product.images.find((image) => image.kind === 'guide');
  const candidates = [productImage?.url?.trim() ?? '', guideImage?.url?.trim() ?? ''];
  const absolute = candidates.find((url) => isValidHttpUrl(url));
  if (absolute) return absolute;
  const relative = candidates.find((url) => url.startsWith('/'));
  if (relative) return `${getAppUrl()}${relative}`;
  return `${getAppUrl()}/api/qr/${encodeURIComponent(product.slug)}`;
}

function truncate(text: string, max = 300): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1).trimEnd()}…`;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const code = searchParams.code?.trim() ?? '';

  if (!code) {
    return {
      description: DEFAULT_DESCRIPTION,
      openGraph: {
        type: 'website',
        locale: 'vi_VN',
        siteName: SITE_NAME,
        description: DEFAULT_DESCRIPTION,
      },
      twitter: { card: 'summary' },
    };
  }

  const { product } = await lookupProduct(code);

  if (!product) {
    const shareTitle = 'Không tìm thấy sản phẩm';
    const description = `Mã tra cứu "${code}" không tồn tại. Hãy quét lại mã QR in trên sản phẩm.`;
    return {
      title: { absolute: `${shareTitle}${TITLE_SUFFIX}` },
      description,
      openGraph: {
        type: 'website',
        locale: 'vi_VN',
        siteName: SITE_NAME,
        title: shareTitle,
        description,
      },
      twitter: { card: 'summary', title: shareTitle, description },
    };
  }

  const shareTitle = product.name;
  const description = truncate(
    product.description?.trim() ||
      `${product.manufacturer?.trim() ? `${product.manufacturer.trim()} — ` : ''}Hướng dẫn sử dụng và thông tin chi tiết sản phẩm "${product.name}" (mã tra cứu ${code}).`,
  );
  const image = pickShareImage(product);

  return {
    title: { absolute: `${shareTitle}${TITLE_SUFFIX}` },
    description,
    openGraph: {
      type: 'website',
      locale: 'vi_VN',
      siteName: SITE_NAME,
      title: shareTitle,
      description,
      images: [{ url: image, alt: product.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: shareTitle,
      description,
      images: [image],
    },
  };
}

export default async function HomePage({ searchParams }: PageProps) {
  const code = searchParams.code?.trim() ?? '';
  const { product, loadError } = code
    ? await lookupProduct(code)
    : { product: null, loadError: false };

  const canonicalUrl = code ? getLookupUrl(code) : `${getAppUrl()}/`;

  return (
    <>
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:url" content={canonicalUrl} />
      <PublicContent code={code} product={product} loadError={loadError} />
    </>
  );
}
