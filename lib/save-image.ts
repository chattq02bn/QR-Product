/** Kiểm tra đang chạy trên iPhone/iPad (iOS/iPadOS Safari). */
function isAppleMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ giả lập thành macOS
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

type ShareNavigator = Navigator & {
  canShare?: (data?: ShareData) => boolean;
  share?: (data?: ShareData) => Promise<void>;
};

function triggerDownload(url: string, filename: string): void {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

/**
 * Lưu ảnh PNG về thiết bị.
 *
 * - iPhone/iPad: mở bảng chọn (Web Share) với file ảnh -> chọn "Lưu ảnh"
 *   là ảnh vào thẳng thư viện Photos.
 * - Android/máy tính: tải trực tiếp file PNG (Android ghi vào Downloads,
 *   ảnh trong Downloads hiển thị trong thư viện/album).
 *
 * Trả về 'shared' | 'downloaded' | 'cancelled'.
 */
export async function saveImageToDevice(
  url: string,
  filename: string,
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const response = await fetch(url, { credentials: 'same-origin' });
  if (!response.ok) throw new Error('Không tải được ảnh');
  const blob = await response.blob();

  if (isAppleMobile()) {
    const nav = navigator as ShareNavigator;
    if (nav.canShare && nav.share) {
      const file = new File([blob], filename, { type: blob.type || 'image/png' });
      if (nav.canShare({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: filename });
          return 'shared';
        } catch (error) {
          // Người dùng đóng bảng chọn -> không tải lại cho đỡ khó chịu
          if (error instanceof DOMException && error.name === 'AbortError') {
            return 'cancelled';
          }
        }
      }
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    triggerDownload(objectUrl, filename);
  } finally {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  }
  return 'downloaded';
}
