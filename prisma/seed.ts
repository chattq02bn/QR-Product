import { PrismaClient } from '@prisma/client';
import type { SpecEntry } from '../lib/types';
import { hashPassword } from '../lib/password';
import { slugify } from '../lib/slug';

const prisma = new PrismaClient();

const ADMIN_USERNAME = 'Admin';
const ADMIN_PASSWORD = 'Admin@123';

const BRAND = 'OML';

/** Nhà sản xuất / Đơn vị phân phối (lưu JSON, sửa được trong modal admin). */
const DISTRIBUTOR: SpecEntry[] = [
  { label: 'Tên đơn vị', value: 'Công ty TNHH OML Việt Nam' },
  { label: 'Mã số thuế', value: '0312345678' },
  { label: 'Địa chỉ', value: 'Số 123 Đường Nguyễn Huệ, Quận 1, Thành phố Hồ Chí Minh' },
  { label: 'Điện thoại', value: '028 3822 1111' },
  { label: 'Email', value: 'lienhe@oml.vn' },
];

const GUIDE_IMAGE_URLS = [
  'https://res.cloudinary.com/demo/image/upload/w_1200,q_auto/sample.jpg',
  'https://res.cloudinary.com/demo/image/upload/c_fill,w_1200,h_900,q_auto/sample.jpg',
  'https://res.cloudinary.com/demo/image/upload/c_fill,w_1200,h_1500,q_auto/sample.jpg',
];

const PRODUCT_IMAGE_URL = 'https://res.cloudinary.com/demo/image/upload/w_1200,q_auto/sample.jpg';

type SeedProduct = {
  /** Tên sản phẩm (tiếng Việt). */
  name: string;
  model: string;
  /** Công suất động cơ. */
  power: string;
};

const PRODUCTS: SeedProduct[] = [
  { name: 'Quạt trần 8 cánh ECOFAN E8', model: 'QT26-E8', power: '65W' },
  { name: 'Quạt trần 5 cánh ECOFAN F5', model: 'QT26-F51', power: '55W' },
  { name: 'Quạt trần 5 cánh ECOFAN F5', model: 'QT26-F50', power: '55W' },
  { name: 'Quạt trần 5 cánh ECOFAN F5', model: 'QT26-F51-60', power: '65W' },
  { name: 'Quạt trần 6 cánh ECOFAN S6', model: 'QT26-S6-167', power: '65W' },
  { name: 'Quạt trần 6 cánh ECOFAN S6', model: 'QT26-S6-137', power: '55W' },
];

function buildSpecs(product: SeedProduct): SpecEntry[] {
  return [
    { label: 'Tên sản phẩm', value: product.name },
    { label: 'Nhãn hiệu', value: BRAND },
    { label: 'Model', value: product.model },
    { label: 'Công suất động cơ', value: product.power },
  ];
}

function buildDescription(product: SeedProduct): string {
  return [
    `${product.name} là quạt trần do ${BRAND} sản xuất, công suất động cơ ${product.power}, model ${product.model}.`,
    'Sản phẩm được kiểm định chất lượng trước khi đóng gói và kèm hướng dẫn lắp đặt, sử dụng chi tiết.',
    'Quét mã QR trên bao bì để xem hướng dẫn sử dụng, video lắp đặt, chính sách bảo hành và các lưu ý an toàn.',
    'Liên hệ nhà phân phối gần nhất nếu cần hỗ trợ kỹ thuật hoặc thay thế phụ kiện chính hãng.',
  ].join(' ');
}

/** Xóa toàn bộ dữ liệu cũ trước khi seed lại. */
async function resetData() {
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.admin.deleteMany();
  console.log('Đã xóa toàn bộ dữ liệu sản phẩm, ảnh và tài khoản admin.');
}

async function seedProducts() {
  for (const [index, item] of PRODUCTS.entries()) {
    const slug = slugify(`${item.name} ${item.model}`);
    const product = await prisma.product.create({
      data: {
        name: item.name,
        slug,
        manufacturer: BRAND,
        description: buildDescription(item),
        imageUrl: PRODUCT_IMAGE_URL,
        specs: buildSpecs(item),
        distributor: DISTRIBUTOR,
        images: {
          create: GUIDE_IMAGE_URLS.map((url, order) => ({ url, publicId: '', order })),
        },
      },
    });
    console.log(`[${index + 1}/${PRODUCTS.length}] ${product.name} (mã tra cứu: ${product.slug})`);
  }
}

async function seedAdmin() {
  await prisma.admin.create({
    data: { username: ADMIN_USERNAME, passwordHash: await hashPassword(ADMIN_PASSWORD) },
  });
  console.log(`Đã tạo tài khoản admin "${ADMIN_USERNAME}".`);
}

async function main() {
  await resetData();
  await seedProducts();
  await seedAdmin();
  const total = await prisma.product.count();
  console.log(`Hoàn tất: ${total} sản phẩm trong cơ sở dữ liệu.`);
}

main()
  .catch((error) => {
    console.error('Seed thất bại:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
