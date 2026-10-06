-- Mã sản phẩm hiển thị (chỉ hiển thị, không dùng để tra cứu)
ALTER TABLE "Product" ADD COLUMN "productCodeAlias" TEXT;

-- Sản phẩm cũ: mã hiển thị lấy theo mã sản phẩm hiện có
UPDATE "Product" SET "productCodeAlias" = "productCode";

ALTER TABLE "Product" ALTER COLUMN "productCodeAlias" SET NOT NULL;

-- Không cho trùng mã hiển thị
CREATE UNIQUE INDEX "Product_productCodeAlias_key" ON "Product"("productCodeAlias");
