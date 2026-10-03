import { PrismaClient } from '@prisma/client';
import { slugify } from '../lib/slug';

const prisma = new PrismaClient();

const PRODUCT_NAME = 'Quạt trần LEDTECH 5 cánh';
const PRODUCT_SLUG = 'quat-tran-ledtech-5-canh';

const SEED_IMAGES = [
  {
    url: 'https://res.cloudinary.com/demo/image/upload/w_1200,q_auto/sample.jpg',
    publicId: 'sample',
    order: 0,
  },
  {
    url: 'https://res.cloudinary.com/demo/image/upload/c_fill,w_1200,h_900,q_auto/sample.jpg',
    publicId: 'sample',
    order: 1,
  },
  {
    url: 'https://res.cloudinary.com/demo/image/upload/c_fill,w_1200,h_1500,q_auto/sample.jpg',
    publicId: 'sample',
    order: 2,
  },
];

const TOTAL_PRODUCTS = 320;

const BRANDS = [
  'LEDTECH',
  'SANAKY',
  'PANASONIC',
  'ELECTROLUX',
  'PHILIPS',
  'SUNHOUSE',
  'BLUESTONE',
  'KANGAROO',
  'ASAKA',
  'SUPREME',
  'GOLDEN INOX',
  'MITSUBISHI',
  'TOSHIBA',
  'LOCKNLOCK',
  'COINCO',
];

const CATEGORIES = [
  { label: 'Quạt trần', models: ['5 cánh', '4 cánh', '3 cánh', 'đảo trần'] },
  { label: 'Quạt cây', models: ['đứng', 'bàn', 'remote', 'mini'] },
  { label: 'Đèn LED', models: ['downlight', 'tuýp', 'panel', 'ban công'] },
  { label: 'Máy lọc nước', models: ['âm tủ', 'RO 7 cấp', 'đứng', 'công nghiệp'] },
  { label: 'Máy lọc không khí', models: ['mini', 'phòng ngủ', 'phòng khách', 'công nghiệp'] },
  { label: 'Lò vi sóng', models: ['23L', '25L', 'nướng đối lưu', 'kéo phím'] },
  { label: 'Nồi cơm điện', models: ['1.8L', '2.0L', 'đôi', 'mini'] },
  { label: 'Máy hút bụi', models: ['hút khô', 'hút ướt', 'robot', 'mini'] },
];

const GUIDE_IMAGE_URLS = [
  'https://res.cloudinary.com/demo/image/upload/w_1200,q_auto/sample.jpg',
  'https://res.cloudinary.com/demo/image/upload/c_fill,w_1200,h_900,q_auto/sample.jpg',
  'https://res.cloudinary.com/demo/image/upload/c_fill,w_1200,h_1500,q_auto/sample.jpg',
  'https://res.cloudinary.com/demo/image/upload/c_fill,w_900,h_1200,q_auto/sample.jpg',
  'https://res.cloudinary.com/demo/image/upload/c_fill,w_1600,h_900,q_auto/sample.jpg',
  'https://res.cloudinary.com/demo/image/upload/c_fill,w_1200,h_1200,q_auto/sample.jpg',
];

const DAY_MS = 24 * 60 * 60 * 1000;

function buildDescription(name: string, brand: string, category: string): string {
  return [
    `${name} là sản phẩm thuộc nhóm ${category.toLowerCase()}, do ${brand} sản xuất.`,
    'Sản phẩm được kiểm định chất lượng trước khi đóng gói và kèm hướng dẫn lắp đặt, sử dụng chi tiết.',
    'Quét mã QR trên bao bì để xem hướng dẫn sử dụng, video lắp đặt, chính sách bảo hành và các lưu ý an toàn.',
    'Liên hệ nhà phân phối gần nhất nếu cần hỗ trợ kỹ thuật hoặc thay thế phụ kiện chính hãng.',
  ].join(' ');
}

function expiryFor(index: number): Date | null {
  if (index % 11 === 0) return new Date(Date.now() - 5 * DAY_MS);
  if (index % 7 === 0) return new Date(Date.now() + 30 * DAY_MS);
  return null;
}

async function ensureDemoProduct() {
  const existing = await prisma.product.findUnique({
    where: { slug: PRODUCT_SLUG },
    include: { images: true },
  });

  if (existing) {
    if (existing.images.length === 0) {
      await prisma.productImage.createMany({
        data: SEED_IMAGES.map((image) => ({ ...image, productId: existing.id })),
      });
      console.log(`Đã thêm ${SEED_IMAGES.length} ảnh mẫu cho "${existing.name}".`);
    } else {
      console.log(`Sản phẩm "${existing.name}" đã tồn tại, không seed lại.`);
    }
    return;
  }

  const product = await prisma.product.create({
    data: {
      name: PRODUCT_NAME,
      slug: PRODUCT_SLUG,
      manufacturer: 'LEDTECH',
      description: buildDescription(PRODUCT_NAME, 'LEDTECH', 'Quạt trần'),
      imageUrl: 'https://picsum.photos/seed/quat-tran-ledtech-5-canh/600/400',
      images: { create: SEED_IMAGES },
    },
    include: { images: true },
  });

  console.log(`Đã tạo sản phẩm mẫu: "${product.name}" (mã tra cứu: ${product.slug})`);
  console.log('Ảnh hướng dẫn:', product.images.length);
}

async function seedProducts() {
  const countBefore = await prisma.product.count();
  const target = Math.max(TOTAL_PRODUCTS - countBefore, 0);

  if (target === 0) {
    console.log(`Đã có ${countBefore} sản phẩm, không cần seed thêm.`);
    return;
  }

  const existing = await prisma.product.findMany({ select: { slug: true } });
  const used = new Set(existing.map((row) => row.slug));

  const maxModels = Math.max(...CATEGORIES.map((category) => category.models.length));
  const maxCombos = BRANDS.length * CATEGORIES.length * maxModels;

  const wanted: Array<{
    name: string;
    slug: string;
    manufacturer: string;
    description: string;
    imageUrl: string;
  }> = [];

  for (let i = 0; wanted.length < target && i < maxCombos; i += 1) {
    const brand = BRANDS[i % BRANDS.length];
    const category = CATEGORIES[Math.floor(i / BRANDS.length) % CATEGORIES.length];
    const model =
      category.models[Math.floor(i / (BRANDS.length * CATEGORIES.length)) % category.models.length];
    const name = `${category.label} ${brand} ${model}`;
    const slug = slugify(name);
    if (used.has(slug)) continue;
    used.add(slug);

    wanted.push({
      name,
      slug,
      manufacturer: brand,
      description: buildDescription(name, brand, category.label),
      imageUrl: `https://picsum.photos/seed/${slug}/600/400`,
    });
  }

  if (wanted.length === 0) {
    console.log('Không có dữ liệu mới để seed.');
    return;
  }

  const now = Date.now();
  await prisma.product.createMany({
    data: wanted.map((product, index) => ({
      ...product,
      qrExpiresAt: expiryFor(index),
      createdAt: new Date(now - index * 60_000),
    })),
  });

  const created = await prisma.product.findMany({
    where: { slug: { in: wanted.map((product) => product.slug) } },
    select: { id: true },
  });

  await prisma.productImage.createMany({
    data: created.flatMap((product, index) => {
      const count = (index % 6) + 1;
      return Array.from({ length: count }, (_, order) => ({
        productId: product.id,
        url: GUIDE_IMAGE_URLS[order % GUIDE_IMAGE_URLS.length],
        publicId: '',
        order,
      }));
    }),
  });

  const totalAfter = await prisma.product.count();
  console.log(`Đã seed ${wanted.length} sản phẩm mới, tổng cộng ${totalAfter} sản phẩm.`);
}

const RICH_IMAGE_COUNT = 5;
const RICH_PRODUCT_TARGET = 20;

async function boostGuideImages() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      images: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const candidates = products
    .filter((product) => product.images.length < RICH_IMAGE_COUNT)
    .slice(0, RICH_PRODUCT_TARGET);

  if (candidates.length === 0) {
    console.log('Đã đủ sản phẩm có nhiều ảnh hướng dẫn.');
    return;
  }

  await prisma.productImage.createMany({
    data: candidates.flatMap((product) => {
      const startOrder = product.images.length;
      return Array.from({ length: RICH_IMAGE_COUNT - product.images.length }, (_, index) => ({
        productId: product.id,
        url: GUIDE_IMAGE_URLS[(startOrder + index) % GUIDE_IMAGE_URLS.length],
        publicId: '',
        order: startOrder + index,
      }));
    }),
  });

  console.log(
    `Đã bổ sung ảnh hướng dẫn lên ${RICH_IMAGE_COUNT} ảnh cho ${candidates.length} sản phẩm.`,
  );
}

async function main() {
  await ensureDemoProduct();
  await seedProducts();
  await boostGuideImages();
}

main()
  .catch((error) => {
    console.error('Seed thất bại:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
