export type ExpiryStatus = 'permanent' | 'expired' | 'soon' | 'active';

export type ExpiryInfo = { label: string; status: ExpiryStatus };

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export function isExpired(iso?: string | null, now = Date.now()): boolean {
  if (!iso) return false;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return false;
  return time <= now;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Mô tả thời hạn mã QR để hiển thị (table/card/trang công khai). */
export function describeExpiry(iso?: string | null, now = Date.now()): ExpiryInfo {
  if (!iso) return { label: 'Vĩnh viễn', status: 'permanent' };

  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return { label: 'Vĩnh viễn', status: 'permanent' };

  if (time <= now) return { label: 'Đã hết hạn', status: 'expired' };

  const diff = time - now;
  const totalMinutes = Math.ceil(diff / MINUTE_MS);

  if (totalMinutes < 60) {
    return { label: `Còn ${totalMinutes} phút`, status: 'soon' };
  }

  if (diff < DAY_MS) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const label = minutes > 0 ? `Còn ${hours} giờ ${minutes} phút` : `Còn ${hours} giờ`;
    return { label, status: 'soon' };
  }

  const date = new Date(time);
  return {
    label: `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(
      date.getMinutes(),
    )}`,
    status: 'active',
  };
}

export const EXPIRY_COLORS: Record<ExpiryStatus, string> = {
  permanent: 'green',
  expired: 'red',
  soon: 'orange',
  active: 'blue',
};

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
