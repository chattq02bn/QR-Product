const VIETNAMESE_DIACRITICS = /[\u0300-\u036f\u1EA0-\u1EF9\u1EBE-\u1EC7\u02C6\u0323\u0331]/g;

/**
 * Bỏ dấu tiếng Việt, chuyển về chữ thường và nối bằng dấu gạch ngang.
 * Ví dụ: "Quạt trần LEDTECH 5 cánh" -> "quat-tran-ledtech-5-canh"
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(VIETNAMESE_DIACRITICS, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Thêm hậu tố "-2", "-3", ... cho slug bị trùng. */
export function withSuffix(slug: string, suffix: number): string {
  return `${slug}-${suffix}`;
}

/**
 * Sinh slug duy nhất từ chuỗi: nếu slug đã tồn tại thì tự thêm hậu tố.
 * `exists` trả về true nếu slug đã được sử dụng.
 */
export async function generateUniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const root = slugify(base) || 'san-pham';
  if (!(await exists(root))) return root;
  for (let i = 2; i < 1000; i += 1) {
    const candidate = withSuffix(root, i);
    if (!(await exists(candidate))) return candidate;
  }
  return `${root}-${Date.now()}`;
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
