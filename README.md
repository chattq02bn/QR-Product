# Tra cứu sản phẩm

Web fullstack (Next.js App Router + TypeScript) giúp quản trị viên tạo sản phẩm kèm ảnh hướng dẫn sử dụng,
tự sinh mã QR cho từng sản phẩm. Người dùng quét mã QR bằng điện thoại sẽ mở trang web hiển thị đúng
các ảnh hướng dẫn của sản phẩm đó.

## Tính năng

**Quản trị (`/admin`)**

- Header quản trị (nền navy, vạch nhấn đỏ) gồm link "Xem trang công khai" và nút "Đăng xuất"
  (nút đăng xuất chỉ hiện khi đặt `ADMIN_PASSWORD`).
- Thêm / sửa / xóa sản phẩm, tìm kiếm theo tên, phân trang; cột "Hạn QR" hiển thị trạng thái
  (Vĩnh viễn / ngày hết hạn / Còn X giờ / Đã hết hạn).
- **Bắt buộc tối thiểu 1 ảnh hướng dẫn** khi tạo/sửa (form disable nút Lưu, API trả 400 nếu thiếu ảnh).
- Upload ảnh hướng dẫn lên Cloudinary (chỉ server giữ API secret), xem trước, xóa, kéo thả đổi thứ tự ảnh.
- **Chèn link ảnh có sẵn**: dán nhiều link (mỗi dòng một link) vào form, kiểm tra URL hợp lệ,
  không bắt buộc qua Cloudinary.
- **Thời hạn mã QR**: chọn _Vĩnh viễn_ hoặc _Tự động hết hạn sau_ N phút / giờ / ngày
  (form hiện trước thời điểm hết hạn). Hết hạn thì trang tra cứu sẽ báo "Mã QR đã hết hạn".
- Mã tra cứu (`slug`) **tự sinh từ tên sản phẩm** khi tạo (bỏ dấu tiếng Việt, chữ thường, nối bằng `-`,
  tự thêm hậu tố `-2`, `-3`... nếu trùng). Khi sửa, mã tra cứu giữ nguyên (không đổi để QR đã in luôn đúng).
- Hiển thị mã QR cho từng sản phẩm, phóng to trong Modal với các nút: Copy link, Tải PNG, In, Mở trang tra cứu.
- Sau khi tạo sản phẩm thành công, Modal "Mã QR" tự mở để tải/in ngay.
- Giao diện responsive: trên điện thoại bảng chuyển thành dạng danh sách card.

**Trang công khai (`/?code=<slug>`)**

- Truy vấn dữ liệu ngay trên Server Component (tải nhanh khi quét QR).
- Header cố định nền navy `#10357a` có vạch nhấn đỏ bên trái, tên sản phẩm, các ảnh hướng dẫn xếp dọc
  đúng thứ tự, bấm vào để phóng to (zoom/xoay), chú thích "Trang hướng dẫn n".
- QR đã hết hạn → thông báo "Mã QR đã hết hạn" (không hiển thị ảnh hướng dẫn).
- Không có `code` → ô nhập mã + nút "Tra cứu"; mã không tồn tại → thông báo không tìm thấy sản phẩm.
- Không hiển thị bất kỳ link nào tới `/admin`.

## Công nghệ

- Next.js 14 (App Router) + TypeScript – frontend và backend (Route Handlers trong `app/api`)
- Ant Design v5 + `@ant-design/nextjs-registry` (không còn flash style khi SSR), `ConfigProvider` locale `viVN`
- PostgreSQL + Prisma ORM
- Cloudinary (upload phía server bằng SDK `cloudinary`)
- Mã QR: `antd/QRCode` để hiển thị, thư viện `qrcode` để xuất PNG chất lượng cao
- Validate bằng `zod`, bảo vệ admin bằng `jose` (cookie httpOnly có chữ ký)

## Cấu trúc thư mục

```
app/
  page.tsx                 # Trang công khai /?code=slug (Server Component)
  admin/page.tsx           # Trang quản trị /admin
  admin/login/page.tsx     # Màn hình đăng nhập mật khẩu
  api/products/route.ts    # GET (danh sách), POST (tạo)
  api/products/[id]/route.ts  # GET, PUT, DELETE
  api/lookup/route.ts      # GET công khai theo slug
  api/upload/route.ts      # POST upload ảnh, DELETE xóa ảnh
  api/qr/[slug]/route.ts   # GET ảnh PNG mã QR
  api/auth/login|route.ts  # POST đăng nhập, POST logout
  api/auth/status/route.ts # GET trạng thái đăng nhập (admin header)
components/
  AntdProvider.tsx         # ConfigProvider + App (locale viVN)
  admin/AdminHeader.tsx    # Header quản trị (brand, mở trang công khai, đăng xuất)
  admin/AdminPanel.tsx     # Header trang, tìm kiếm, state danh sách
  admin/ProductTable.tsx   # Bảng (desktop) / card (mobile), cột Hạn QR
  admin/ProductModal.tsx   # Modal thêm/sửa (Upload + link ảnh + hạn QR)
  admin/QrModal.tsx        # Modal mã QR (phóng to, tải PNG, in)
  admin/LoginForm.tsx
  public/PublicContent.tsx # Trang tra cứu (kiểm tra hạn QR)
lib/
  prisma.ts cloudinary.ts slug.ts validators.ts qr.ts auth.ts session.ts
  api.ts client.ts print.ts format.ts
prisma/schema.prisma, prisma/migrations/, prisma/seed.ts
middleware.ts              # Chặn /admin và API ghi khi đặt ADMIN_PASSWORD
```

## Yêu cầu

- Node.js 18.18 trở lên (đã kiểm chứng với Node 24)
- Một database PostgreSQL (local, Neon, Supabase...)
- Tài khoản Cloudinary (miễn phí)

## Cài đặt

### 1. Cài dependencies

```bash
npm install
```

### 2. Tạo database PostgreSQL

Ví dụ với local (PostgreSQL đang chạy trên cổng 5432):

```bash
createdb tracuu            # hoặc: psql -U postgres -c "CREATE DATABASE tracuu;"
```

Với **Neon**: tạo project → copy connection string. Với **Supabase**: mục _Database_ → _Connection string_.

### 3. Điền `.env`

```bash
copy .env.example .env      # macOS/Linux: cp .env.example .env
```

```env
DATABASE_URL="postgresql://user:password@localhost:5432/tracuu?schema=public"
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=tracuu
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_PASSWORD=
```

| Biến                  | Ý nghĩa                                              |
| --------------------- | ---------------------------------------------------- |
| `DATABASE_URL`        | Chuỗi kết nối PostgreSQL                             |
| `CLOUDINARY_*`        | Khóa API Cloudinary để upload ảnh (chỉ server dùng)  |
| `CLOUDINARY_FOLDER`   | Thư mục chứa ảnh trên Cloudinary (mặc định `tracuu`) |
| `NEXT_PUBLIC_APP_URL` | Domain thật, dùng để tạo link trong mã QR            |
| `ADMIN_PASSWORD`      | (Tùy chọn) Mật khẩu bảo vệ `/admin` và các API ghi   |

### 4. Lấy khóa Cloudinary

1. Đăng nhập https://console.cloudinary.com → _Settings → API Keys_.
2. Copy _Cloud name_, _API Key_, _API Secret_ vào `.env` (`CLOUDINARY_FOLDER` tùy ý, ví dụ `tracuu`).
3. API secret **không bao giờ** được đưa ra client – mọi thao tác upload/xóa đều chạy trong Route Handler.

### 5. Chạy migration và seed

```bash
npm run prisma:migrate     # prisma migrate dev  – tạo/cập nhật bảng
npm run prisma:seed        # prisma db seed      – tạo sản phẩm mẫu "Quạt trần LEDTECH 5 cánh"
```

> Nếu đã có migration (deploy môi trường production): `npm run prisma:deploy`.

### 6. Chạy dev

```bash
npm run dev                # http://localhost:3000
```

- Trang công khai: `http://localhost:3000/?code=quat-tran-ledtech-5-canh`
- Quản trị: `http://localhost:3000/admin`

### Scripts trong `package.json`

| Script                   | Mô tả                                 |
| ------------------------ | ------------------------------------- |
| `npm run dev`            | Chạy dev server                       |
| `npm run build`          | Build production                      |
| `npm run start`          | Chạy production server                |
| `npm run lint`           | Kiểm tra ESLint                       |
| `npm run typecheck`      | Kiểm tra TypeScript                   |
| `npm run prisma:migrate` | Tạo migration và áp dụng (dev)        |
| `npm run prisma:deploy`  | Áp dụng migration có sẵn (production) |
| `npm run prisma:seed`    | Seed dữ liệu mẫu                      |

## Bảo vệ admin

- Nếu **đặt** `ADMIN_PASSWORD`:
  - `middleware.ts` chặn `/admin` (chuyển về màn hình đăng nhập) và mọi API ghi
    (`POST/PUT/PATCH/DELETE` trên `/api/*`).
  - Đăng nhập thành công sẽ đặt cookie httpOnly có chữ ký JWT (jose, HS256, hạn 7 ngày).
  - API công khai (`GET /api/lookup`, `GET /api/products`, `GET /api/qr/*`) vẫn truy cập được mà không cần đăng nhập.
- Nếu **không đặt** `ADMIN_PASSWORD`: cho truy cập tự do (phù hợp môi trường dev).

## API

Response luôn theo cấu trúc `{ data }` hoặc `{ error: { message } }` kèm status code đúng
(400 validate, 401 chưa đăng nhập, 404 không tìm thấy, 409 trùng slug, 500 lỗi server).

| Method | Đường dẫn                               | Mô tả                                                                           |
| ------ | --------------------------------------- | ------------------------------------------------------------------------------- |
| GET    | `/api/products?search=&page=&pageSize=` | Danh sách sản phẩm kèm ảnh                                                      |
| POST   | `/api/products`                         | Tạo sản phẩm `{ name, slug?, images[], qrExpiresAt }` – thiếu `slug` sẽ tự sinh |
| GET    | `/api/products/[id]`                    | Chi tiết theo id                                                                |
| PUT    | `/api/products/[id]`                    | Cập nhật tên, hạn QR, ảnh (thêm/xóa/đổi thứ tự) – slug giữ nguyên               |
| DELETE | `/api/products/[id]`                    | Xóa sản phẩm + ảnh trên Cloudinary                                              |
| GET    | `/api/lookup?code=slug`                 | Tra cứu công khai theo slug (404 nếu không có), trả kèm `qrExpiresAt`           |
| POST   | `/api/upload`                           | Upload multipart `files` (image/*, ≤10MB/ảnh)                                   |
| DELETE | `/api/upload?publicId=`                 | Xóa một ảnh đã upload                                                           |
| GET    | `/api/qr/[slug]?size=512&download=1`    | Ảnh PNG mã QR trỏ tới `${NEXT_PUBLIC_APP_URL}/?code=slug`                       |
| POST   | `/api/auth/login`                       | Đăng nhập bằng `ADMIN_PASSWORD`                                                 |
| POST   | `/api/auth/logout`                      | Đăng xuất                                                                       |
| GET    | `/api/auth/status`                      | `{ authEnabled }` – admin header hiện/ẩn nút đăng xuất                          |

Ảnh trong `images[]`: `{ url, publicId?, id? }` – ảnh upload từ Cloudinary có `publicId`,
ảnh chèn bằng link bên ngoài để `publicId` rỗng/không truyền (không bị xóa trên Cloudinary khi lưu).

`qrExpiresAt`: ISO string (`2026-12-31T00:00:00.000Z`) hoặc `null` = vĩnh viễn.

## Deploy (Vercel + Neon)

1. **Postgres (Neon)**: tạo project trên [Neon](https://neon.tech) → copy 2 connection string trong tab
   _Pooled_ và _Direct_.
2. **Cloudinary**: copy 3 khóa vào biến môi trường của Vercel.
3. Push repo lên GitHub → import vào Vercel.
4. Trong _Project Settings → Environment Variables_, thêm:

   - `DATABASE_URL` (Neon – _Pooled_)
   - `DIRECT_DATABASE_URL` (Neon – _Direct_, dùng cho `prisma migrate`)
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER`
   - `NEXT_PUBLIC_APP_URL=https://ten-domain-cua-ban`
   - `ADMIN_PASSWORD` (khuyến nghị)

5. Build Command đã cấu hình sẵn trong `vercel.json`
   (`prisma generate` → `prisma migrate deploy` → `next build`), không cần đổi trong dashboard.

6. Seed dữ liệu cho production (tùy chọn): chạy `npm run prisma:seed` với `DATABASE_URL` trỏ vào Neon.

### ⚠️ Lưu ý quan trọng khi in mã QR

Mã QR chứa link `${NEXT_PUBLIC_APP_URL}/?code=<slug>`. Hãy **đặt `NEXT_PUBLIC_APP_URL` đúng domain
thật (kèm `https://`) trước khi tải/in mã QR** – nếu đổi domain sau khi đã in, các mã QR cũ sẽ trỏ tới
link không còn hiệu lực (tương tự khi đổi `slug` của sản phẩm).

## Ghi chú

- Ảnh mẫu trong `prisma/seed.ts` trỏ tới cloud demo của Cloudinary chỉ để demo ngay sau khi seed;
  hãy thay bằng ảnh hướng dẫn thật trong `/admin`.
- Ảnh bị bỏ khỏi form ở chế độ Sửa sẽ được xóa trên Cloudinary ngay sau khi lưu thành công.
