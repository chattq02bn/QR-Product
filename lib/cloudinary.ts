import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

export type CloudinaryImage = { url: string; publicId: string };

function getConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

export function isCloudinaryConfigured(): boolean {
  return getConfig() !== null;
}

function ensureConfig() {
  const config = getConfig();
  if (!config) {
    throw new Error('Chưa cấu hình Cloudinary (thiếu CLOUDINARY_* trong .env)');
  }
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });
  return config;
}

/** Upload một file ảnh (buffer) lên Cloudinary, trả về { url, publicId }. */
export async function uploadImage(
  buffer: Buffer,
  options: { folder?: string; filename?: string } = {},
): Promise<CloudinaryImage> {
  ensureConfig();
  const folder = options.folder || process.env.CLOUDINARY_FOLDER?.trim() || 'tracuu';

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        public_id: options.filename?.replace(/\.[^.]+$/, ''),
        overwrite: false,
        unique_filename: true,
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      },
      (error, uploadResult) => {
        if (error || !uploadResult) {
          reject(error ?? new Error('Upload ảnh thất bại'));
          return;
        }
        resolve(uploadResult);
      },
    );
    stream.end(buffer);
  });

  return { url: result.secure_url, publicId: result.public_id };
}

/** Xóa một ảnh trên Cloudinary (best-effort, không ném lỗi). */
export async function deleteImage(publicId: string): Promise<boolean> {
  try {
    ensureConfig();
    const res = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    return res.result === 'ok' || res.result === 'not found';
  } catch (error) {
    console.warn('[cloudinary] không xóa được ảnh', publicId, error);
    return false;
  }
}

/** Xóa nhiều ảnh, trả về số ảnh đã xóa được. */
export async function deleteImages(publicIds: string[]): Promise<void> {
  await Promise.all(publicIds.filter(Boolean).map((id) => deleteImage(id)));
}
