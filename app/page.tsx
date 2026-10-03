import type { ProductView } from '@/lib/types';
import { prisma } from '@/lib/prisma';
import { toProductView } from '@/lib/serialize';
import PublicContent from '@/components/public/PublicContent';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: { code?: string };
};

export default async function HomePage({ searchParams }: PageProps) {
  const code = searchParams.code?.trim() ?? '';
  let product: ProductView | null = null;
  let loadError = false;

  if (code) {
    try {
      const found = await prisma.product.findUnique({
        where: { slug: code },
        include: { images: { orderBy: { order: 'asc' } } },
      });
      if (found) product = toProductView(found);
    } catch (error) {
      console.error('[lookup] lỗi truy vấn dữ liệu:', error);
      loadError = true;
    }
  }

  return (
    <>
      <header className="public-header">
        <span className="public-header__accent" aria-hidden="true" />
        <h1 className="public-header__title">Tra cứu sản phẩm</h1>
      </header>
      <main className="public-main">
        <PublicContent code={code} product={product} loadError={loadError} />
      </main>
    </>
  );
}
