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
  { label: 'Tên đơn vị', value: 'Công ty TNHH Năng Lượng Xanh LEDTECH' },
  { label: 'Mã số thuế', value: '0110797973' },
  {
    label: 'Địa chỉ',
    value:
      'Số nhà 12, ngách 31/25, ngõ 25, tổ 37, đường Độc Lập, phường Long Biên, thành phố Hà Nội, Việt Nam',
  },
  { label: 'Điện thoại', value: '0982016699' },
  { label: 'Email', value: 'nangluongxanhledtech@gmail.com' },
];

const GUIDE_IMAGE_URLS = [
  'https://res.cloudinary.com/demo/image/upload/w_1200,q_auto/sample.jpg',
  'https://res.cloudinary.com/demo/image/upload/c_fill,w_1200,h_900,q_auto/sample.jpg',
  'https://res.cloudinary.com/demo/image/upload/c_fill,w_1200,h_1500,q_auto/sample.jpg',
];

const PRODUCT_IMAGE_URL = 'https://res.cloudinary.com/demo/image/upload/w_1200,q_auto/sample.jpg';

type SeedProduct = {
  /** Tên sản phẩm (cột B). */
  name: string;
  /** Mã sản phẩm / model (cột C). */
  model: string;
  /** Thông số kỹ thuật (cột E), mỗi dòng "nhãn: giá trị". */
  specs: SpecEntry[];
  /** Mô tả sản phẩm (cột F). */
  description: string;
};

/** Dữ liệu lấy từ file báo giá QT_OML (sheet "BG QUAT TRAN"). */
const PRODUCTS: SeedProduct[] = [
  {
    name: 'Quạt trần DC ECOFAN F5',
    model: '',
    specs: [
      { label: 'Kích thước quạt trần', value: '56 inch / 1422mm' },
      { label: 'Quy cách động cơ', value: 'DC153 × 16mm' },
      { label: 'Chất liệu cánh quạt', value: 'ABS / 5 cánh' },
      { label: 'Công suất động cơ', value: '55W' },
      { label: 'Nguồn sáng', value: 'LED 18W / 3 chế độ màu' },
      { label: 'Điện áp / Tần số', value: '220V–240V / 50Hz' },
      { label: 'Loại điều khiển', value: 'Remote 9 tốc độ' },
      { label: 'Kích thước ty treo', value: '26.5 × 170mm / 26.5 × 300mm' },
      { label: 'Màu sản phẩm', value: 'Màu vàng gold + màu gỗ đậm' },
    ],
    description:
      'Quạt trần DC Ecofan F5 mang thiết kế sang trọng với sắc vàng gold kết hợp màu gỗ đậm, phù hợp nhiều phong cách nội thất. Động cơ DC 55W vận hành êm ái, tiết kiệm điện hơn, giúp tối ưu chi phí sử dụng lâu dài. 5 cánh ABS đường kính 56 inch tạo luồng gió mạnh và ổn định. Quạt tích hợp đèn LED 18W với 3 chế độ màu cùng remote 9 tốc độ, mang đến sự mát mẻ, tiện nghi và thoải mái cho không gian sống.',
  },
  {
    name: 'Quạt trần DC ECOFAN F5',
    model: '',
    specs: [
      { label: 'Kích thước quạt trần', value: '56 inch / 1422mm' },
      { label: 'Quy cách động cơ', value: 'DC153 × 16mm' },
      { label: 'Chất liệu cánh quạt', value: 'ABS / 5 cánh' },
      { label: 'Công suất động cơ', value: '55W' },
      { label: 'Nguồn sáng', value: 'LED 18W / 3 chế độ màu' },
      { label: 'Điện áp / Tần số', value: '220V–240V / 50Hz' },
      { label: 'Loại điều khiển', value: 'Remote 9 tốc độ' },
      { label: 'Kích thước ty treo', value: '26.5 × 170mm / 26.5 × 300mm' },
      { label: 'Màu sản phẩm', value: 'Toàn bộ màu vàng gold' },
    ],
    description:
      'Quạt trần DC Ecofan F5 sở hữu thiết kế sang trọng với màu vàng Gold nổi bật, tạo điểm nhấn tinh tế cho không gian sống. Động cơ DC 55W vận hành êm ái, tiết kiệm điện, giúp tối ưu chi phí sử dụng lâu dài. 5 cánh ABS đường kính 56 inch tạo luồng gió mạnh và ổn định. Tích hợp đèn LED 18W với 3 chế độ màu cùng remote 9 tốc độ, mang đến không gian mát mẻ, tiện nghi và thoải mái.',
  },
  {
    name: 'Quạt trần DC ECOFAN F5',
    model: '',
    specs: [
      { label: 'Kích thước quạt trần', value: '56” / 1422mm' },
      { label: 'Quy cách động cơ', value: 'DC153 × 16mm' },
      { label: 'Chất liệu cánh quạt', value: 'ABS / 5 cánh' },
      { label: 'Công suất động cơ', value: '55W' },
      { label: 'Nguồn sáng', value: 'LED 18W / 3 chế độ màu' },
      { label: 'Điện áp / Tần số', value: '220V–240V / 50Hz' },
      { label: 'Loại điều khiển', value: 'Remote 9 tốc độ' },
      { label: 'Kích thước ty treo', value: '26.5 × 170mm / 26.5 × 300mm' },
      { label: 'Màu sản phẩm', value: 'Màu AB' },
    ],
    description:
      'Quạt trần DC Ecofan F5 sở hữu thiết kế hiện đại, tinh tế với màu AB sang trọng, dễ dàng tạo điểm nhấn cho không gian sống. Động cơ DC 55W vận hành êm ái, tiết kiệm điện, giúp tối ưu chi phí sử dụng lâu dài. 5 cánh ABS đường kính 56 inch tạo luồng gió mạnh và ổn định. Tích hợp đèn LED 18W với 3 chế độ màu cùng remote 9 tốc độ, mang đến không gian mát mẻ, tiện nghi và thoải mái.',
  },
  {
    name: 'Quạt trần DC ECOFAN F5',
    model: '',
    specs: [
      { label: 'Kích thước quạt trần', value: '56 inch / 1422mm' },
      { label: 'Quy cách động cơ', value: 'DC153 × 16mm' },
      { label: 'Chất liệu cánh quạt', value: 'ABS / 5 cánh' },
      { label: 'Công suất động cơ', value: '55W' },
      { label: 'Nguồn sáng', value: 'Không đèn' },
      { label: 'Điện áp / Tần số', value: '220V–240V / 50Hz' },
      { label: 'Loại điều khiển', value: 'Remote 9 tốc độ' },
      { label: 'Kích thước ty treo', value: '26.5 × 170mm / 26.5 × 300mm' },
      { label: 'Màu sản phẩm', value: 'Màu vàng gold + màu gỗ đậm' },
    ],
    description:
      'Quạt trần DC Ecofan F5 mang thiết kế sang trọng với sự kết hợp tinh tế giữa màu vàng Gold và màu gỗ đậm, tạo điểm nhấn nổi bật cho không gian sống. Động cơ DC 55W vận hành êm ái, tiết kiệm điện, giúp tối ưu chi phí sử dụng lâu dài. 5 cánh ABS đường kính 56 inch tạo luồng gió mạnh và ổn định. Remote 9 tốc độ giúp dễ dàng điều chỉnh luồng gió theo nhu cầu, mang đến sự mát mẻ và thoải mái cho gia đình.',
  },
  {
    name: 'Quạt trần DC ECOFAN F5',
    model: '',
    specs: [
      { label: 'Kích thước quạt trần', value: '56 inch / 1422mm' },
      { label: 'Quy cách động cơ', value: 'DC153 × 16mm' },
      { label: 'Chất liệu cánh quạt', value: 'ABS / 5 cánh' },
      { label: 'Công suất động cơ', value: '55W' },
      { label: 'Nguồn sáng', value: 'Không đèn' },
      { label: 'Điện áp / Tần số', value: '220V–240V / 50Hz' },
      { label: 'Loại điều khiển', value: 'Remote 9 tốc độ' },
      { label: 'Kích thước ty treo', value: '26.5 × 170mm / 26.5 × 300mm' },
      { label: 'Màu sản phẩm', value: 'Toàn bộ màu vàng gold' },
    ],
    description:
      'Quạt trần DC Ecofan F5 nổi bật với thiết kế sang trọng, đồng bộ màu vàng Gold, mang đến vẻ đẹp hiện đại và tinh tế cho không gian sống. Động cơ DC 55W vận hành êm ái, tiết kiệm điện, giúp tối ưu chi phí sử dụng lâu dài. 5 cánh ABS đường kính 56 inch tạo luồng gió mạnh, ổn định. Remote 9 tốc độ giúp dễ dàng điều chỉnh theo nhu cầu, mang đến không gian mát mẻ, thoải mái và tiện nghi.',
  },
  {
    name: 'Quạt trần DC ECOFAN F5',
    model: '',
    specs: [
      { label: 'Kích thước quạt trần', value: '56” / 1422mm' },
      { label: 'Quy cách động cơ', value: 'DC153 × 16mm' },
      { label: 'Chất liệu cánh quạt', value: 'ABS / 5 cánh' },
      { label: 'Công suất động cơ', value: '55W' },
      { label: 'Nguồn sáng', value: 'Không đèn' },
      { label: 'Điện áp / Tần số', value: '220V–240V / 50Hz' },
      { label: 'Loại điều khiển', value: 'Remote 9 tốc độ' },
      { label: 'Kích thước ty treo', value: '26.5 × 170mm / 26.5 × 300mm' },
      { label: 'Màu sản phẩm', value: 'Màu AB' },
    ],
    description:
      'Quạt trần DC Ecofan F5 mang thiết kế hiện đại, tinh tế với màu AB sang trọng, phù hợp với nhiều phong cách nội thất. Động cơ DC 55W vận hành êm ái, tiết kiệm điện, giúp giảm chi phí sử dụng lâu dài. 5 cánh ABS đường kính 56 inch tạo luồng gió mạnh và ổn định, mang lại cảm giác mát mẻ dễ chịu. Thiết kế không đèn tối giản, kết hợp remote 9 tốc độ, linh hoạt điều chỉnh theo nhu cầu.',
  },
  {
    name: 'Quạt trần DC ECOFAN F5',
    model: '',
    specs: [
      { label: 'Kích thước quạt trần', value: '60inch / 1524mm' },
      { label: 'Quy cách động cơ', value: 'DC153 × 20mm' },
      { label: 'Chất liệu cánh quạt', value: 'ABS / 5 cánh' },
      { label: 'Công suất động cơ', value: '65W' },
      { label: 'Công suất đèn', value: '18W/3CCT' },
      { label: 'Điện áp / Tần số', value: '220V–240V / 50Hz' },
      { label: 'Loại điều khiển', value: 'Remote 9 tốc độ' },
      { label: 'Kích thước ty treo', value: '26.5 × 148mm + ốp trần' },
      { label: 'Màu sản phẩm', value: 'Toàn bộ màu vàng gold' },
    ],
    description:
      'Quạt trần 60 inch sở hữu thiết kế sang trọng, nổi bật với tông màu vàng Gold đồng bộ, tạo điểm nhấn tinh tế và đẳng cấp cho không gian sống. Động cơ DC 65W vận hành êm ái, tiết kiệm điện, giúp tối ưu chi phí sử dụng lâu dài. 5 cánh ABS đường kính 60 inch tạo luồng gió mạnh và ổn định. Tích hợp đèn LED 18W với 3 chế độ màu cùng remote 9 tốc độ, mang đến không gian mát mẻ, tiện nghi và thoải mái.',
  },
  {
    name: 'Quạt trần DC ECOFAN F5',
    model: '',
    specs: [
      { label: 'Kích thước quạt trần', value: '60inch / 1524mm' },
      { label: 'Quy cách động cơ', value: 'DC153 × 20mm' },
      { label: 'Chất liệu cánh quạt', value: 'ABS / 5 cánh' },
      { label: 'Công suất động cơ', value: '65W' },
      { label: 'Công suất đèn', value: '18W/3CCT' },
      { label: 'Điện áp / Tần số', value: '220V–240V / 50Hz' },
      { label: 'Loại điều khiển', value: 'Remote 9 tốc độ' },
      { label: 'Kích thước ty treo', value: '26.5 × 148mm + ốp trần' },
      { label: 'Màu sản phẩm', value: 'Toàn bộ màu nâu' },
    ],
    description:
      'Quạt trần 60 inch sở hữu thiết kế sang trọng, ấm áp với tông màu nâu đồng bộ, dễ dàng tạo điểm nhấn tinh tế cho không gian sống. Động cơ DC 65W vận hành êm ái, tiết kiệm điện, giúp tối ưu chi phí sử dụng lâu dài. 5 cánh ABS đường kính 60 inch tạo luồng gió mạnh và ổn định. Tích hợp đèn LED 18W với 3 chế độ màu cùng remote 9 tốc độ, mang đến không gian mát mẻ, tiện nghi và thoải mái.',
  },
  {
    name: 'Quạt trần DC ECOFAN F5',
    model: '',
    specs: [
      { label: 'Kích thước quạt trần', value: '60inch / 1524mm' },
      { label: 'Quy cách động cơ', value: 'DC153 × 20mm' },
      { label: 'Chất liệu cánh quạt', value: 'ABS / 5 cánh' },
      { label: 'Công suất động cơ', value: '65W' },
      { label: 'Công suất đèn', value: '18W/3CCT' },
      { label: 'Điện áp / Tần số', value: '220V–240V / 50Hz' },
      { label: 'Loại điều khiển', value: 'Remote 9 tốc độ' },
      { label: 'Kích thước ty treo', value: '26.5 × 148mm + ốp trần' },
      { label: 'Màu sản phẩm', value: 'Toàn bộ màu bạc' },
    ],
    description:
      'Quạt trần 60 inch sở hữu thiết kế hiện đại, thanh lịch với tông màu bạc đồng bộ, tạo vẻ sang trọng và tinh tế cho không gian sống. Động cơ DC 65W vận hành êm ái, tiết kiệm điện, giúp tối ưu chi phí sử dụng lâu dài. 5 cánh ABS đường kính 60 inch tạo luồng gió mạnh và ổn định. Tích hợp đèn LED 18W với 3 chế độ màu cùng remote 9 tốc độ, mang đến không gian mát mẻ, tiện nghi và thoải mái.',
  },
  {
    name: 'Quạt trần DC ECOFAN E8',
    model: '',
    specs: [
      { label: 'Kích thước quạt', value: '60 inch / 1524 mm' },
      { label: 'Động cơ', value: 'DC 153 × 20 mm' },
      { label: 'Cánh quạt', value: 'ABS / 8 cánh' },
      { label: 'Công suất động cơ', value: '65W' },
      { label: 'Đèn LED', value: '24W, 3 chế độ màu (3CCT)' },
      { label: 'Điện áp/Tần số', value: '220V – 240V / 50Hz' },
      { label: 'Điều khiển', value: 'Remote 9 cấp độ gió' },
      { label: 'Ty treo', value: '26.5 × 170 mm / 26.5 × 300 mm' },
      { label: 'Màu sắc', value: 'Vân gỗ đậm (Walnut Dark Wood)' },
    ],
    description:
      'Quạt trần 60 inch mang thiết kế sang trọng với gam vân gỗ đậm Walnut Dark Wood, tạo cảm giác ấm cúng và tinh tế cho không gian sống. Động cơ DC 65W vận hành êm ái, tiết kiệm điện, giúp tối ưu chi phí sử dụng lâu dài. 8 cánh ABS đường kính 60 inch tạo luồng gió mạnh và ổn định. Tích hợp đèn LED 24W với 3 chế độ màu cùng remote 9 cấp độ gió, mang đến sự mát mẻ, tiện nghi và thoải mái.',
  },
  {
    name: 'Quạt trần DC ECOFAN E8',
    model: '',
    specs: [
      { label: 'Kích thước quạt', value: '60 inch / 1524 mm' },
      { label: 'Động cơ', value: 'DC 153 × 20 mm' },
      { label: 'Cánh quạt', value: 'ABS / 8 cánh' },
      { label: 'Công suất động cơ', value: '65W' },
      { label: 'Đèn LED', value: '24W, 3 chế độ màu (3CCT)' },
      { label: 'Điện áp/Tần số', value: '220V – 240V / 50Hz' },
      { label: 'Điều khiển', value: 'Remote 9 cấp độ gió' },
      { label: 'Ty treo', value: '26.5 × 170 mm / 26.5 × 300 mm' },
      { label: 'Màu sắc', value: 'Màu bạc' },
    ],
    description:
      'Quạt trần 60 inch sở hữu thiết kế hiện đại, thanh lịch với màu bạc tinh tế, dễ dàng kết hợp với nhiều phong cách nội thất. Động cơ DC 65W vận hành êm ái, tiết kiệm điện, giúp tối ưu chi phí sử dụng lâu dài. 8 cánh ABS đường kính 60 inch tạo luồng gió mạnh và ổn định. Tích hợp đèn LED 24W với 3 chế độ màu cùng remote 9 cấp độ gió, mang đến không gian mát mẻ, tiện nghi và thoải mái.',
  },
  {
    name: 'Quạt trần DC ECOFAN S6',
    model: '',
    specs: [
      { label: 'Kích thước quạt', value: '66 inch / 1676 mm' },
      { label: 'Động cơ', value: 'DC153 × 16 mm' },
      { label: 'Chất liệu cánh', value: 'ABS / 6 cánh' },
      { label: 'Công suất động cơ', value: '65W' },
      { label: 'Đèn LED', value: '25W, 3 chế độ màu (3CCT)' },
      { label: 'Điện áp/Tần số', value: '220V – 240V / 50Hz' },
      { label: 'Điều khiển', value: 'Remote 6 cấp độ gió' },
      { label: 'Ty treo', value: '26.5 × 170 mm / 26.5 × 300 mm' },
      { label: 'Chụp đèn', value: 'Acrylic' },
      { label: 'Màu sắc', value: 'Đen mờ + màu gỗ đậm (Dark Wood)' },
    ],
    description:
      'Quạt trần 66 inch sở hữu thiết kế hiện đại, mạnh mẽ với sự kết hợp tinh tế giữa đen mờ và màu gỗ đậm, tạo điểm nhấn sang trọng cho không gian sống. Động cơ DC 65W vận hành êm ái, tiết kiệm điện, giúp tối ưu chi phí sử dụng lâu dài. 6 cánh ABS đường kính lớn 66 inch tạo luồng gió mạnh và ổn định. Tích hợp đèn LED 25W với 3 chế độ màu cùng remote 6 cấp độ gió, mang đến không gian mát mẻ, tiện nghi và thoải mái.',
  },
  {
    name: 'Quạt trần DC ECOFAN S6',
    model: '',
    specs: [
      { label: 'Kích thước quạt', value: '54 inch / 1370 mm' },
      { label: 'Thông số động cơ', value: 'DC153 × 16 mm' },
      { label: 'Chất liệu cánh quạt', value: 'ABS / 6 cánh' },
      { label: 'Công suất động cơ', value: '55W' },
      { label: 'Nguồn sáng', value: 'LED 24W / 3 chế độ màu' },
      { label: 'Điện áp', value: '220V – 240V / 50Hz' },
      { label: 'Điều khiển', value: 'Remote 9 cấp độ gió' },
      { label: 'Ty treo', value: '26.5 × 170 mm / 26.5 × 300 mm' },
      { label: 'Màu sắc tổng thể', value: 'Đen + màu gỗ đậm (Dark Wood)' },
    ],
    description:
      'Quạt trần DC Ecofan S6 mang thiết kế hiện đại, mạnh mẽ với sự kết hợp tinh tế giữa màu đen và màu gỗ đậm, tạo điểm nhấn sang trọng cho không gian sống. Động cơ DC 55W vận hành êm ái, tiết kiệm điện, giúp tối ưu chi phí sử dụng lâu dài. 6 cánh ABS đường kính 54 inch tạo luồng gió mạnh và ổn định. Tích hợp đèn LED 24W với 3 chế độ màu cùng remote 9 cấp độ gió, mang đến không gian mát mẻ, tiện nghi và thoải mái.',
  },
  {
    name: 'Quạt trần DC ECOFAN S6',
    model: '',
    specs: [
      { label: 'Kích thước quạt', value: '66 inch / 1676 mm' },
      { label: 'Động cơ', value: 'DC153 × 16 mm' },
      { label: 'Chất liệu cánh', value: 'ABS / 6 cánh' },
      { label: 'Công suất động cơ', value: '65W' },
      { label: 'Đèn LED', value: '24W, 3 chế độ màu (3CCT)' },
      { label: 'Điện áp/Tần số', value: '220V – 240V / 50Hz' },
      { label: 'Điều khiển', value: 'Remote 6 cấp độ gió' },
      { label: 'Ty treo', value: '26.5 × 170 mm / 26.5 × 300 mm' },
      { label: 'Chụp đèn', value: 'Acrylic' },
      { label: 'Màu sắc', value: 'Màu bạc' },
    ],
    description:
      'Quạt trần DC Ecofan S6 sở hữu thiết kế hiện đại, thanh lịch với màu bạc tinh tế, phù hợp với nhiều phong cách nội thất. Động cơ DC 55W vận hành êm ái, tiết kiệm điện, giúp tối ưu chi phí sử dụng lâu dài. 6 cánh ABS đường kính 54 inch tạo luồng gió mạnh và ổn định. Tích hợp đèn LED 24W với 3 chế độ màu cùng remote 9 cấp độ gió, mang đến không gian mát mẻ, thoải mái và tiện nghi.',
  },
  {
    name: 'Quạt trần DC ECOFAN S6',
    model: '',
    specs: [
      { label: 'Kích thước quạt', value: '54 inch / 1370 mm' },
      { label: 'Thông số động cơ', value: 'DC153 × 16 mm' },
      { label: 'Chất liệu cánh quạt', value: 'ABS / 6 cánh' },
      { label: 'Công suất động cơ', value: '55W' },
      { label: 'Nguồn sáng', value: 'LED 24W / 3 chế độ màu' },
      { label: 'Điện áp', value: '220V – 240V / 50Hz' },
      { label: 'Điều khiển', value: 'Remote 9 cấp độ gió' },
      { label: 'Ty treo', value: '26.5 × 170 mm / 26.5 × 300 mm' },
      { label: 'Màu sắc', value: 'Màu bạc' },
    ],
    description:
      'Quạt trần DC Ecofan S6 sở hữu thiết kế hiện đại, thanh lịch với màu bạc tinh tế, phù hợp với nhiều phong cách nội thất. Động cơ DC 55W vận hành êm ái, tiết kiệm điện, giúp tối ưu chi phí sử dụng lâu dài. 6 cánh ABS đường kính 54 inch tạo luồng gió mạnh và ổn định. Tích hợp đèn LED 24W với 3 chế độ màu cùng remote 9 cấp độ gió, mang đến không gian mát mẻ, thoải mái và tiện nghi.',
  },
  {
    name: 'Quạt trần DC ECOFAN S6',
    model: '',
    specs: [
      { label: 'Kích thước quạt', value: '66 inch / 1676 mm' },
      { label: 'Động cơ', value: 'DC153 × 16 mm' },
      { label: 'Chất liệu cánh', value: 'ABS / 6 cánh' },
      { label: 'Công suất động cơ', value: '65W' },
      { label: 'Đèn LED', value: '24W, 3 chế độ màu (3CCT)' },
      { label: 'Điện áp/Tần số', value: '220V – 240V / 50Hz' },
      { label: 'Điều khiển', value: 'Remote 6 cấp độ gió' },
      { label: 'Ty treo', value: '26.5 × 170 mm / 26.5 × 300 mm' },
      { label: 'Chụp đèn', value: 'Acrylic' },
      { label: 'Màu sắc', value: 'Màu vàng Gold' },
    ],
    description:
      'Quạt trần DC Ecofan S6 nổi bật với thiết kế sang trọng, tinh tế cùng sắc vàng Gold, dễ dàng kết hợp với nhiều phong cách nội thất. Động cơ DC 55W vận hành êm ái, tiết kiệm điện, giúp tối ưu chi phí sử dụng lâu dài. 6 cánh ABS đường kính 54 inch tạo luồng gió mạnh và ổn định. Tích hợp đèn LED 24W với 3 chế độ màu cùng remote 9 cấp độ gió, mang đến không gian mát mẻ, thoải mái và tiện nghi.',
  },
  {
    name: 'Quạt trần DC ECOFAN S6',
    model: '',
    specs: [
      { label: 'Kích thước quạt', value: '54 inch / 1370 mm' },
      { label: 'Thông số động cơ', value: 'DC153 × 16 mm' },
      { label: 'Chất liệu cánh quạt', value: 'ABS / 6 cánh' },
      { label: 'Công suất động cơ', value: '55W' },
      { label: 'Nguồn sáng', value: 'LED 24W / 3 chế độ màu' },
      { label: 'Điện áp', value: '220V – 240V / 50Hz' },
      { label: 'Điều khiển', value: 'Remote 9 cấp độ gió' },
      { label: 'Ty treo', value: '26.5 × 170 mm / 26.5 × 300 mm' },
      { label: 'Màu sắc tổng thể', value: 'Màu vàng Gold' },
    ],
    description:
      'Quạt trần DC Ecofan S6 nổi bật với thiết kế sang trọng, tinh tế cùng sắc vàng Gold, dễ dàng kết hợp với nhiều phong cách nội thất. Động cơ DC 55W vận hành êm ái, tiết kiệm điện, giúp tối ưu chi phí sử dụng lâu dài. 6 cánh ABS đường kính 54 inch tạo luồng gió mạnh và ổn định. Tích hợp đèn LED 24W với 3 chế độ màu cùng remote 9 cấp độ gió, mang đến không gian mát mẻ, thoải mái và tiện nghi.',
  },
];

/**
 * Mã sản phẩm của một dòng seed: dùng model (cột C) nếu có,
 * không thì tự sinh mã duy nhất theo thứ tự (SP-01, SP-02, ...) — model được để trống.
 */
function resolveProductCode(product: SeedProduct, index: number): string {
  const model = product.model?.trim();
  return model ? model : `SP-${String(index + 1).padStart(2, '0')}`;
}

function buildSpecs(product: SeedProduct): SpecEntry[] {
  const model = product.model?.trim();
  return [
    { label: 'Tên sản phẩm', value: product.name },
    { label: 'Nhãn hiệu', value: BRAND },
    // Model có thể để trống -> không thêm dòng rỗng
    ...(model ? [{ label: 'Model', value: model }] : []),
    ...product.specs,
  ];
}

/** Xóa toàn bộ dữ liệu cũ trước khi seed lại. */
async function resetData() {
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.admin.deleteMany();
  console.log('Đã xóa toàn bộ dữ liệu sản phẩm, ảnh và tài khoản admin.');
}

async function seedProducts() {
  const usedSlugs = new Set<string>();

  for (const [index, item] of PRODUCTS.entries()) {
    const productCode = resolveProductCode(item, index);
    // Slug = tên + mã sản phẩm; không có model thì slug lấy từ productCode
    const root = slugify(`${item.name} ${productCode}`) || `san-pham-${index + 1}`;
    const slug = usedSlugs.has(root) ? `${root}-${index + 1}` : root;
    usedSlugs.add(slug);

    const product = await prisma.product.create({
      data: {
        name: item.name,
        slug,
        productCode,
        manufacturer: BRAND,
        description: item.description,
        imageUrl: PRODUCT_IMAGE_URL,
        specs: buildSpecs(item),
        distributor: DISTRIBUTOR,
        images: {
          create: GUIDE_IMAGE_URLS.map((url, order) => ({ url, publicId: '', order })),
        },
      },
    });
    console.log(
      `[${index + 1}/${PRODUCTS.length}] ${product.name} (mã tra cứu: ${product.slug}, mã sản phẩm: ${productCode})`,
    );
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