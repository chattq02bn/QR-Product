-- Mã hiển thị cho phép để trống (null = không hiển thị mã sản phẩm trên giao diện)
ALTER TABLE "Product" ALTER COLUMN "productCodeAlias" DROP NOT NULL;
