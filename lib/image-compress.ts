/** Dung lượng mục tiêu sau khi nén — dưới giới hạn body (~4.5MB) của Vercel/proxy để tránh lỗi 413. */
const TARGET_MAX_BYTES = 3 * 1024 * 1024;
/** Chiều dài cạnh lớn nhất sau khi thu nhỏ (giữ nét ảnh hướng dẫn). */
const MAX_DIMENSION = 2000;
const JPEG_QUALITIES = [0.85, 0.72, 0.6, 0.45] as const;

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

function withJpgExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base}.jpg`;
}

/**
 * Nén ảnh trước khi upload (giảm dung lượng request, tránh lỗi 413 khi tải nhiều ảnh).
 * Chỉ xử lý file ảnh lớn hơn TARGET_MAX_BYTES; nếu nén không nhỏ hơn bản gốc
 * hoặc trình duyệt không giải mã được thì giữ nguyên file gốc.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size <= TARGET_MAX_BYTES) return file;

  let objectUrl = '';
  try {
    objectUrl = URL.createObjectURL(file);
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Không đọc được ảnh'));
      element.src = objectUrl;
    });

    const naturalWidth = image.naturalWidth || image.width;
    const naturalHeight = image.naturalHeight || image.height;
    if (!naturalWidth || !naturalHeight) return file;

    const scale = Math.min(1, MAX_DIMENSION / Math.max(naturalWidth, naturalHeight));
    const width = Math.max(1, Math.round(naturalWidth * scale));
    const height = Math.max(1, Math.round(naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return file;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    let smallest: Blob | null = null;
    for (const quality of JPEG_QUALITIES) {
      const blob = await canvasToBlob(canvas, quality);
      if (!blob) break;
      smallest = blob;
      if (blob.size <= TARGET_MAX_BYTES) break;
    }

    if (!smallest || smallest.size >= file.size) return file;

    return new File([smallest], withJpgExtension(file.name), {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}
