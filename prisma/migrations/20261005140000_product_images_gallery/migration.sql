-- Phân loại ảnh: "product" = ảnh sản phẩm, "guide" = ảnh hướng dẫn sử dụng.
ALTER TABLE "ProductImage" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'guide';

-- Chuyển ảnh đại diện cũ (Product.imageUrl) thành dòng ảnh sản phẩm (thứ tự đầu tiên).
INSERT INTO "ProductImage" ("id", "productId", "url", "publicId", "order", "kind")
SELECT
  md5(random()::text || clock_timestamp()::text),
  p."id",
  p."imageUrl",
  '',
  0,
  'product'
FROM "Product" p
WHERE p."imageUrl" IS NOT NULL AND btrim(p."imageUrl") <> '';

-- Bỏ cột ảnh đại diện: ảnh sản phẩm giờ là một gallery (ProductImage.kind = "product").
ALTER TABLE "Product" DROP COLUMN "imageUrl";

-- Index tra cứu theo sản phẩm + loại ảnh.
DROP INDEX IF EXISTS "ProductImage_productId_idx";
CREATE INDEX "ProductImage_productId_kind_idx" ON "ProductImage"("productId", "kind");
