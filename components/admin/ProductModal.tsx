'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Divider,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Typography,
  Upload,
} from 'antd';
import type { RcFile, UploadFile, UploadProps } from 'antd/es/upload/interface';
import { DeleteOutlined, LinkOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { apiFetch } from '@/lib/client';
import { isValidHttpUrl } from '@/lib/format';
import { checkProductCode, uploadProductImage } from '@/lib/queries';
import type { ProductPayload } from '@/lib/queries';
import {
  MAX_IMAGE_BYTES,
  MAX_IMAGES_PER_PRODUCT,
  MAX_PRODUCT_CODE_LENGTH,
  PRODUCT_CODE_PATTERN,
} from '@/lib/validators';
import type { ProductView, SpecEntry } from '@/lib/types';

type ImageItem = {
  key: string;
  id?: string;
  url: string;
  publicId: string;
  uploading: boolean;
  file?: RcFile;
};

type LocalProductImage = {
  file: RcFile;
  preview: string;
};

type ExpiryUnit = 'minute' | 'hour' | 'day';
type ExpiryMode = 'permanent' | 'duration';

type FormValues = {
  name: string;
  /** Mã sản phẩm in trên bao bì / báo giá. */
  productCode: string;
  qrMode: ExpiryMode;
  qrDuration: number;
  qrUnit: ExpiryUnit;
  imageUrl?: string;
  description?: string;
  manufacturer?: string;
  /** Thông số kỹ thuật: danh sách "tên trường - giá trị" lưu JSON. */
  specs?: SpecEntry[];
  /** Nhà sản xuất / Đơn vị phân phối: danh sách "tên trường - giá trị" lưu JSON. */
  distributor?: SpecEntry[];
};

type Props = {
  open: boolean;
  product: ProductView | null;
  onClose: () => void;
  onSave: (payload: ProductPayload) => Promise<ProductView>;
};

const UNIT_MS: Record<ExpiryUnit, number> = {
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
};

const UNIT_LABEL: Record<ExpiryUnit, string> = {
  minute: 'phút',
  hour: 'giờ',
  day: 'ngày',
};

/** Chọn đơn vị + số liệu sao cho giá trị dễ đọc (1 phút, 2 giờ, 3 ngày...). */
function splitDuration(ms: number): { duration: number; unit: ExpiryUnit } {
  const safe = Math.max(ms, UNIT_MS.minute);
  if (safe < UNIT_MS.day) {
    return { duration: Math.max(1, Math.round(safe / UNIT_MS.minute)), unit: 'minute' };
  }
  if (safe % UNIT_MS.day === 0) {
    return { duration: safe / UNIT_MS.day, unit: 'day' };
  }
  if (safe % UNIT_MS.hour === 0) {
    return { duration: safe / UNIT_MS.hour, unit: 'hour' };
  }
  return { duration: Math.round((safe / UNIT_MS.day) * 10) / 10, unit: 'day' };
}

function toImageItems(product: ProductView): ImageItem[] {
  return product.images.map((image) => ({
    key: image.id,
    id: image.id,
    url: image.url,
    publicId: image.publicId,
    uploading: false,
  }));
}

const MAX_DESCRIPTION_WORDS = 500;

function countWords(value?: string): number {
  return (value ?? '').trim().split(/\s+/).filter(Boolean).length;
}

function formatDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

/** Các trường gợi ý sẵn cho "Thông số kỹ thuật" khi thêm sản phẩm mới. */
const DEFAULT_SPEC_LABELS = ['Tên sản phẩm', 'Nhãn hiệu', 'Model', 'Công suất động cơ'];

/** Các trường gợi ý sẵn cho "Nhà sản xuất / Đơn vị phân phối" khi thêm sản phẩm mới. */
const DEFAULT_DISTRIBUTOR_LABELS = ['Tên đơn vị', 'Mã số thuế', 'Địa chỉ', 'Điện thoại', 'Email'];

/**
 * Đưa dữ liệu JSON đã lưu về dạng dòng của Form.List.
 * Sản phẩm chưa có dữ liệu -> mở sẵn các dòng gợi ý, admin chỉ việc nhập giá trị.
 */
function toFormEntries(
  entries: SpecEntry[] | null | undefined,
  fallbackLabels: string[],
): SpecEntry[] {
  if (entries && entries.length > 0) {
    return entries.map((entry) => ({ label: entry.label, value: entry.value }));
  }
  return fallbackLabels.map((label) => ({ label, value: '' }));
}

type CollectResult = { ok: true; entries: SpecEntry[] } | { ok: false; error: string };

/** Bỏ dòng trống, bắt lỗi dòng có giá trị nhưng thiếu tên trường. */
function collectEntries(rows: SpecEntry[] | undefined, section: string): CollectResult {
  const cleaned = (rows ?? [])
    .map((row) => ({
      label: (row?.label ?? '').trim(),
      value: (row?.value ?? '').trim(),
    }))
    .filter((row) => row.label || row.value);

  const missing = cleaned.find((row) => !row.label);
  if (missing) {
    return {
      ok: false,
      error: `${section}: dòng có giá trị "${missing.value}" thì phải nhập tên trường`,
    };
  }

  return { ok: true, entries: cleaned };
}

export default function ProductModal({ open, product, onClose, onSave }: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [items, setItems] = useState<ImageItem[]>([]);
  const [linkText, setLinkText] = useState('');
  const [expiryTouched, setExpiryTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localProductImage, setLocalProductImage] = useState<LocalProductImage | null>(null);
  const dragKeyRef = useRef<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const blobUrlsRef = useRef<Set<string>>(new Set());
  /** Kết quả kiểm tra "mã sản phẩm đã tồn tại" theo từng mã, tránh gọi API lặp lại. */
  const codeCheckCacheRef = useRef<Map<string, boolean>>(new Map());

  const mode = Form.useWatch('qrMode', form) ?? 'permanent';
  const duration = Form.useWatch('qrDuration', form) ?? 1;
  const unit = Form.useWatch('qrUnit', form) ?? 'day';
  const imageUrlValue = (Form.useWatch('imageUrl', form) ?? '') as string;
  const descriptionValue = (Form.useWatch('description', form) ?? '') as string;
  const descriptionWords = countWords(descriptionValue);
  const uploadingCount = items.filter((item) => item.uploading).length;
  const pendingCount = items.filter((item) => item.file && !item.id).length;
  const isEditing = Boolean(product);

  /** Thời điểm hết hạn sẽ được lưu (hiển thị cho admin xem trước). */
  const expiryPreview = useMemo(() => {
    if (mode !== 'duration') return null;
    // Sửa sản phẩm mà chưa đụng vào phần hạn -> giữ nguyên hạn cũ
    if (product && !expiryTouched && product.qrExpiresAt) {
      return new Date(product.qrExpiresAt);
    }
    const ms = (Number(duration) || 0) * UNIT_MS[unit as ExpiryUnit];
    if (!Number.isFinite(ms) || ms <= 0) return null;
    return new Date(Date.now() + ms);
  }, [mode, product, expiryTouched, duration, unit]);

  useEffect(() => {
    form.resetFields();
    setExpiryTouched(false);
    setSaving(false);
    setDragOverKey(null);
    dragKeyRef.current = null;
    setLocalProductImage(null);
    blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    blobUrlsRef.current.clear();
    codeCheckCacheRef.current.clear();

    if (!open) {
      setItems([]);
      setLinkText('');
      return;
    }

    const split = product?.qrExpiresAt
      ? splitDuration(new Date(product.qrExpiresAt).getTime() - Date.now())
      : null;
    form.setFieldsValue({
      name: product?.name ?? '',
      productCode: product?.productCode ?? '',
      imageUrl: product?.imageUrl ?? '',
      description: product?.description ?? '',
      manufacturer: product?.manufacturer ?? '',
      specs: toFormEntries(product?.specs, DEFAULT_SPEC_LABELS),
      distributor: toFormEntries(product?.distributor, DEFAULT_DISTRIBUTOR_LABELS),
      qrMode: split ? 'duration' : 'permanent',
      qrDuration: split?.duration ?? 7,
      qrUnit: split?.unit ?? 'day',
    });
    setItems(product ? toImageItems(product) : []);
    setLinkText('');
  }, [open, product, form]);

  const onValuesChange = (changed: Partial<FormValues>) => {
    if ('qrMode' in changed || 'qrDuration' in changed || 'qrUnit' in changed) {
      setExpiryTouched(true);
    }
  };

  const rememberBlob = (url: string) => {
    blobUrlsRef.current.add(url);
  };

  const forgetBlob = (url: string) => {
    if (blobUrlsRef.current.delete(url)) URL.revokeObjectURL(url);
  };

  const customRequest: UploadProps['customRequest'] = (options) => {
    const { file, onSuccess: onOk, onError } = options;
    const rcFile = file as RcFile;

    if (rcFile.size > MAX_IMAGE_BYTES) {
      message.error(`Ảnh "${rcFile.name}" vượt quá 10MB`);
      onError?.(new Error('File quá lớn'));
      return;
    }

    if (items.length >= MAX_IMAGES_PER_PRODUCT) {
      message.error(`Tối đa ${MAX_IMAGES_PER_PRODUCT} ảnh cho một sản phẩm`);
      onError?.(new Error('Vượt quá số ảnh cho phép'));
      return;
    }

    const url = URL.createObjectURL(rcFile);
    rememberBlob(url);
    setItems((prev) => [
      ...prev,
      { key: rcFile.uid, url, publicId: '', uploading: false, file: rcFile },
    ]);
    onOk?.({});
  };

  const handleChange: UploadProps['onChange'] = (info) => {
    if (info.file.status === 'removed') {
      const key = info.file.uid;
      setItems((prev) => prev.filter((item) => item.key !== key));
    }
  };

  const handleRemove: UploadProps['onRemove'] = (file) => {
    const removed = items.find((item) => item.key === file.uid);
    if (removed) forgetBlob(removed.url);
    if (removed?.publicId && !removed.id) {
      void apiFetch(`/api/upload?publicId=${encodeURIComponent(removed.publicId)}`, {
        method: 'DELETE',
      }).catch(() => undefined);
    }
    return true;
  };

  const itemRender: UploadProps['itemRender'] = (originNode, file) => (
    <div
      className={`upload-drag-item${dragOverKey === file.uid ? ' upload-drag-item--over' : ''}`}
      draggable
      title="Kéo để đổi thứ tự ảnh"
      onDragStart={(event) => {
        dragKeyRef.current = file.uid;
        event.dataTransfer.effectAllowed = 'move';
      }}
      onDragEnter={() => setDragOverKey(file.uid)}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDragLeave={() => setDragOverKey((prev) => (prev === file.uid ? null : prev))}
      onDragEnd={() => {
        dragKeyRef.current = null;
        setDragOverKey(null);
      }}
      onDrop={(event) => {
        event.preventDefault();
        const from = dragKeyRef.current;
        setDragOverKey(null);
        dragKeyRef.current = null;
        if (!from || from === file.uid) return;
        setItems((prev) => {
          const fromIndex = prev.findIndex((item) => item.key === from);
          const toIndex = prev.findIndex((item) => item.key === file.uid);
          if (fromIndex < 0 || toIndex < 0) return prev;
          const next = [...prev];
          const [moved] = next.splice(fromIndex, 1);
          if (!moved) return prev;
          next.splice(toIndex, 0, moved);
          return next;
        });
      }}
    >
      {originNode}
    </div>
  );

  const fileList: UploadFile[] = items.map((item) => ({
    uid: item.key,
    name: item.file?.name ?? (item.url ? (item.url.split('/').pop() ?? 'image') : 'image'),
    status: item.uploading ? 'uploading' : 'done',
    url: item.url || undefined,
    percent: item.uploading ? 70 : 100,
  }));

  const handleProductImageUpload: UploadProps['customRequest'] = (options) => {
    const { file, onSuccess: onOk, onError } = options;
    const rcFile = file as RcFile;

    if (rcFile.size > MAX_IMAGE_BYTES) {
      message.error(`Ảnh "${rcFile.name}" vượt quá 10MB`);
      onError?.(new Error('File quá lớn'));
      return;
    }

    if (localProductImage) forgetBlob(localProductImage.preview);
    const preview = URL.createObjectURL(rcFile);
    rememberBlob(preview);
    setLocalProductImage({ file: rcFile, preview });
    // Đã tải ảnh sản phẩm -> bỏ link cũ trong ô "Ảnh sản phẩm"
    form.setFieldsValue({ imageUrl: '' });
    onOk?.({});
  };

  const clearLocalProductImage = () => {
    if (localProductImage) forgetBlob(localProductImage.preview);
    setLocalProductImage(null);
  };

  const handleAddLinks = () => {
    const lines = linkText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      message.warning('Dán ít nhất một link ảnh (mỗi dòng một link)');
      return;
    }

    const invalid: string[] = [];
    const added: ImageItem[] = [];

    for (const line of lines) {
      if (!isValidHttpUrl(line)) {
        invalid.push(line);
        continue;
      }
      if (items.some((item) => item.url === line) || added.some((item) => item.url === line)) {
        continue;
      }
      added.push({
        key: `link-${Date.now()}-${added.length}`,
        url: line,
        publicId: '',
        uploading: false,
      });
    }

    if (invalid.length > 0) {
      message.error(`Link không hợp lệ: ${invalid.slice(0, 3).join(', ')}`);
    }

    if (items.length + added.length > MAX_IMAGES_PER_PRODUCT) {
      message.error(`Tối đa ${MAX_IMAGES_PER_PRODUCT} ảnh cho một sản phẩm`);
      return;
    }

    if (added.length > 0) {
      setItems((prev) => [...prev, ...added]);
      setLinkText('');
      message.success(`Đã thêm ${added.length} ảnh từ link`);
    }
  };

  /**
   * Kiểm tra mã sản phẩm đã tồn tại trên hệ thống hay chưa (không tính chính nó).
   * Không kiểm tra được (mất kết nối...) thì cho qua: API vẫn chặn khi lưu.
   */
  const isProductCodeTaken = async (code: string, excludeId?: string): Promise<boolean> => {
    const key = `${excludeId ?? ''}::${code.toLowerCase()}`;
    const cached = codeCheckCacheRef.current.get(key);
    if (cached !== undefined) return cached;
    try {
      const exists = await checkProductCode(code, excludeId);
      codeCheckCacheRef.current.set(key, exists);
      return exists;
    } catch {
      return false;
    }
  };

  const handleOk = async () => {
    let values: FormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const imageCount = items.filter((item) => item.url).length;
    if (imageCount === 0) {
      message.error('Sản phẩm bắt buộc phải có ít nhất 1 ảnh hướng dẫn');
      return;
    }

    let qrExpiresAt: string | null = null;
    if (values.qrMode === 'duration') {
      const ms = (Number(values.qrDuration) || 0) * UNIT_MS[values.qrUnit];
      if (ms <= 0) {
        message.error('Thời hạn mã QR phải lớn hơn 0');
        return;
      }
      // Sửa sản phẩm mà admin không đụng vào phần hạn -> giữ nguyên hạn cũ
      if (product && !expiryTouched) {
        qrExpiresAt = product.qrExpiresAt;
      } else {
        qrExpiresAt = new Date(Date.now() + ms).toISOString();
      }
    }

    const pendingItems = items.filter((item) => item.file && !item.id);

    const specsResult = collectEntries(values.specs, 'Thông số kỹ thuật');
    if (!specsResult.ok) {
      message.error(specsResult.error);
      return;
    }

    const distributorResult = collectEntries(values.distributor, 'Nhà sản xuất / Đơn vị phân phối');
    if (!distributorResult.ok) {
      message.error(distributorResult.error);
      return;
    }

    setSaving(true);
    try {
      const uploadedByKey = new Map<string, { url: string; publicId: string }>();

      if (pendingItems.length > 0) {
        setItems((prev) =>
          prev.map((item) =>
            pendingItems.some((pending) => pending.key === item.key)
              ? { ...item, uploading: true }
              : item,
          ),
        );

        const results = await Promise.allSettled(
          pendingItems.map((item) => uploadProductImage(item.file as RcFile)),
        );

        const uploads = new Map<string, { url: string; publicId: string }>();
        results.forEach((result, index) => {
          const pending = pendingItems[index];
          if (pending && result.status === 'fulfilled') {
            uploads.set(pending.key, result.value);
          }
        });

        setItems((prev) =>
          prev.map((item) => {
            const uploaded = uploads.get(item.key);
            if (!uploaded) return { ...item, uploading: false };
            return {
              ...item,
              url: uploaded.url,
              publicId: uploaded.publicId,
              file: undefined,
              uploading: false,
            };
          }),
        );

        const failed = results.find((result) => result.status === 'rejected');
        if (failed && failed.status === 'rejected') {
          throw failed.reason instanceof Error
            ? failed.reason
            : new Error('Upload ảnh hướng dẫn thất bại');
        }

        uploads.forEach((value, key) => uploadedByKey.set(key, value));
      }

      let imageUrl = values.imageUrl?.trim() || null;
      if (localProductImage) {
        const uploaded = await uploadProductImage(localProductImage.file);
        imageUrl = uploaded.url;
        form.setFieldsValue({ imageUrl: uploaded.url });
        forgetBlob(localProductImage.preview);
        setLocalProductImage(null);
      }

      const payload: ProductPayload = {
        name: values.name.trim(),
        productCode: values.productCode.trim(),
        imageUrl,
        description: values.description?.trim() || null,
        manufacturer: values.manufacturer?.trim() || null,
        specs: specsResult.entries,
        distributor: distributorResult.entries,
        qrExpiresAt,
        images: items
          .map((item) => {
            const uploaded = uploadedByKey.get(item.key);
            return {
              ...(item.id ? { id: item.id } : {}),
              url: uploaded?.url ?? item.url,
              publicId: uploaded?.publicId ?? item.publicId,
            };
          })
          .filter((image) => Boolean(image.url) && !image.url.startsWith('blob:')),
      };
      // Chế độ sửa giữ nguyên mã tra cứu (không cho đổi slug trên form)
      if (product) payload.slug = product.slug;

      await onSave(payload);
      codeCheckCacheRef.current.clear();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không lưu được sản phẩm');
    } finally {
      setSaving(false);
    }
  };

  /** Danh sách "tên trường - giá trị" cho một khối JSON (thêm/sửa/xóa dòng tùy ý). */
  const renderEntryList = (
    name: 'specs' | 'distributor',
    labelPlaceholder: string,
    valuePlaceholder: string,
  ) => (
    <Form.List name={name}>
      {(fields, { add, remove }) => (
        <div className="entry-list">
          {fields.map((field) => (
            <div className="entry-list__row" key={field.key}>
              <Form.Item name={[field.name, 'label']} style={{ marginBottom: 0 }}>
                <Input
                  placeholder={labelPlaceholder}
                  maxLength={120}
                  allowClear
                  disabled={saving}
                />
              </Form.Item>
              <Form.Item name={[field.name, 'value']} style={{ marginBottom: 0 }}>
                <Input
                  placeholder={valuePlaceholder}
                  maxLength={500}
                  allowClear
                  disabled={saving}
                />
              </Form.Item>
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                title="Xóa dòng"
                aria-label="Xóa dòng"
                disabled={saving}
                onClick={() => remove(field.name)}
              />
            </div>
          ))}

          <Button
            type="dashed"
            block
            icon={<PlusOutlined />}
            disabled={saving}
            onClick={() => add({ label: '', value: '' })}
          >
            Thêm trường
          </Button>
        </div>
      )}
    </Form.List>
  );

  return (
    <Modal
      open={open}
      title={isEditing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
      okText={isEditing ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
      cancelText="Hủy"
      confirmLoading={saving}
      okButtonProps={{
        disabled: items.length === 0,
        loading: saving,
      }}
      onOk={() => void handleOk()}
      onCancel={() => {
        if (saving) return;
        onClose();
      }}
      maskClosable={false}
      destroyOnHidden
      width="min(96vw, 1100px)"
      centered
      styles={{ body: { maxHeight: '78vh', overflowY: 'auto', overscrollBehavior: 'contain' } }}
    >
      <Form<FormValues>
        form={form}
        layout="vertical"
        onValuesChange={onValuesChange}
        autoComplete="off"
        initialValues={{ qrMode: 'permanent', qrDuration: 7, qrUnit: 'day', productCode: '' }}
      >
        <div className="product-modal__grid">
          <div className="product-modal__side">
            <p className="product-modal__side-title">Thông tin sản phẩm</p>

            <div className="product-image">
              <div className="product-image__frame">
                {localProductImage ? (
                  <Image
                    src={localProductImage.preview}
                    alt="Ảnh sản phẩm"
                    className="product-image__img"
                    preview={{ mask: 'Xem ảnh' }}
                  />
                ) : isValidHttpUrl(imageUrlValue.trim()) ? (
                  <Image
                    src={imageUrlValue.trim()}
                    alt="Ảnh sản phẩm"
                    className="product-image__img"
                    preview={{ mask: 'Xem ảnh' }}
                  />
                ) : (
                  <span className="product-image__placeholder">Chưa có ảnh sản phẩm</span>
                )}
              </div>

              <Upload
                accept="image/*"
                showUploadList={false}
                customRequest={handleProductImageUpload}
                disabled={saving}
              >
                <Button block icon={<UploadOutlined />} disabled={saving}>
                  Tải ảnh sản phẩm
                </Button>
              </Upload>

              {localProductImage && (
                <Space size={4} wrap>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Ảnh local — sẽ tải lên Cloudinary khi bạn bấm Lưu.
                  </Typography.Text>
                  <Button
                    type="link"
                    size="small"
                    onClick={clearLocalProductImage}
                    disabled={saving}
                  >
                    Bỏ chọn
                  </Button>
                </Space>
              )}

              <Form.Item
                name="imageUrl"
                label="Ảnh sản phẩm"
                extra="Tải ảnh lên (lưu local, đẩy lên Cloudinary khi lưu) hoặc dán link ảnh có sẵn."
                style={{ marginBottom: 0 }}
                rules={[
                  {
                    validator: (_, value?: string) => {
                      const trimmed = (value ?? '').trim();
                      if (!trimmed) return Promise.resolve();
                      return isValidHttpUrl(trimmed)
                        ? Promise.resolve()
                        : Promise.reject(new Error('Link ảnh sản phẩm không hợp lệ'));
                    },
                  },
                ]}
              >
                <Input
                  prefix={<LinkOutlined />}
                  placeholder="https://example.com/anh.jpg"
                  allowClear
                  disabled={saving}
                />
              </Form.Item>
            </div>

            <Form.Item
              name="description"
              label="Mô tả sản phẩm"
              extra={`${descriptionWords} / ${MAX_DESCRIPTION_WORDS} từ`}
              style={{ marginBottom: 0 }}
              rules={[
                {
                  validator: (_, value?: string) =>
                    countWords(value) <= MAX_DESCRIPTION_WORDS
                      ? Promise.resolve()
                      : Promise.reject(new Error(`Tối đa ${MAX_DESCRIPTION_WORDS} từ`)),
                },
              ]}
            >
              <Input.TextArea
                rows={5}
                placeholder="Mô tả ngắn về sản phẩm, công dụng, thông số..."
                disabled={saving}
              />
            </Form.Item>

            <Form.Item
              name="manufacturer"
              label="Nhà sản xuất"
              style={{ marginBottom: 0 }}
              rules={[
                {
                  validator: (_, value?: string) => {
                    const trimmed = (value ?? '').trim();
                    if (!trimmed) return Promise.resolve();
                    return trimmed.length >= 2 && trimmed.length <= 200
                      ? Promise.resolve()
                      : Promise.reject(new Error('Nhà sản xuất từ 2 đến 200 ký tự'));
                  },
                },
              ]}
            >
              <Input placeholder="Ví dụ: LEDTECH" allowClear disabled={saving} />
            </Form.Item>
          </div>

          <div className="product-modal__main">
            <Form.Item
              name="name"
              label="Tên sản phẩm"
              rules={[
                { required: true, message: 'Vui lòng nhập tên sản phẩm' },
                { min: 2, message: 'Tên sản phẩm phải có ít nhất 2 ký tự' },
                { max: 200, message: 'Tên sản phẩm tối đa 200 ký tự' },
              ]}
              extra={
                product
                  ? undefined
                  : 'Mã tra cứu sẽ tự sinh từ tên sản phẩm (bỏ dấu, nối bằng dấu gạch ngang).'
              }
            >
              <Input placeholder="Ví dụ: Quạt trần LEDTECH 5 cánh" allowClear />
            </Form.Item>

            <Form.Item
              name="productCode"
              label="Mã sản phẩm"
              required
              validateTrigger="onBlur"
              extra="Mã in trên bao bì / báo giá, hiển thị ở trang tra cứu và khối thông số kỹ thuật."
              rules={[
                {
                  validator: async (_, value?: string) => {
                    const trimmed = (value ?? '').trim();
                    if (!trimmed) throw new Error('Vui lòng nhập mã sản phẩm');
                    if (trimmed.length < 2 || trimmed.length > MAX_PRODUCT_CODE_LENGTH) {
                      throw new Error(`Mã sản phẩm từ 2 đến ${MAX_PRODUCT_CODE_LENGTH} ký tự`);
                    }
                    if (!PRODUCT_CODE_PATTERN.test(trimmed)) {
                      throw new Error('Mã sản phẩm chỉ gồm chữ, số, dấu cách và ký tự . - _');
                    }
                    // Mã không đổi so với ban đầu -> không cần kiểm tra lại
                    if (trimmed === (product?.productCode ?? '').trim()) return;
                    if (await isProductCodeTaken(trimmed, product?.id)) {
                      throw new Error('Mã sản phẩm đã tồn tại trên hệ thống');
                    }
                  },
                },
              ]}
            >
              <Input
                placeholder="Ví dụ: OML-QT26-F51-YM"
                maxLength={MAX_PRODUCT_CODE_LENGTH}
                allowClear
                disabled={saving}
              />
            </Form.Item>

            <Form.Item
              label="Thời hạn mã QR"
              required
              extra="Mã QR sau khi hết hạn sẽ hiển thị thông báo hết hạn trên trang tra cứu."
            >
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Form.Item name="qrMode" noStyle>
                  <Radio.Group>
                    <Radio value="permanent">Vĩnh viễn</Radio>
                    <Radio value="duration">Tự động hết hạn sau</Radio>
                  </Radio.Group>
                </Form.Item>

                {mode === 'duration' && (
                  <Space wrap size={8}>
                    <Form.Item
                      name="qrDuration"
                      noStyle
                      rules={[
                        { required: true, message: 'Nhập số' },
                        {
                          validator: (_, value: number) =>
                            Number(value) >= 1 && Number(value) <= 100000
                              ? Promise.resolve()
                              : Promise.reject(new Error('Từ 1 đến 100000')),
                        },
                      ]}
                    >
                      <InputNumber min={1} max={100000} style={{ width: 140 }} />
                    </Form.Item>
                    <Form.Item name="qrUnit" noStyle>
                      <Select
                        style={{ width: 120 }}
                        options={[
                          { value: 'minute', label: 'phút' },
                          { value: 'hour', label: 'giờ' },
                          { value: 'day', label: 'ngày' },
                        ]}
                      />
                    </Form.Item>
                    {expiryPreview && (
                      <Typography.Text type="secondary">
                        Hết hạn lúc {formatDateTime(expiryPreview)}
                      </Typography.Text>
                    )}
                  </Space>
                )}
              </Space>
            </Form.Item>

            <Divider orientation="left" plain style={{ margin: '8px 0 16px' }}>
              Ảnh hướng dẫn
            </Divider>

            <Upload
              listType="picture-card"
              multiple
              accept="image/*"
              fileList={fileList}
              maxCount={MAX_IMAGES_PER_PRODUCT}
              customRequest={customRequest}
              onChange={handleChange}
              onRemove={handleRemove}
              itemRender={itemRender}
              disabled={saving}
            >
              {items.length >= MAX_IMAGES_PER_PRODUCT ? null : (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8, fontSize: 12 }}>Tải ảnh</div>
                </div>
              )}
            </Upload>

            {uploadingCount > 0 && (
              <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                Đang tải lên {uploadingCount} ảnh...
              </Typography.Paragraph>
            )}

            {pendingCount > 0 && uploadingCount === 0 && (
              <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                {pendingCount} ảnh local sẽ được tải lên Cloudinary khi bạn lưu.
              </Typography.Paragraph>
            )}

            <Form.Item
              style={{ marginTop: 16, marginBottom: 0 }}
              extra={`Hoặc dán link ảnh có sẵn, mỗi dòng một link. Tối đa ${MAX_IMAGES_PER_PRODUCT} ảnh, mỗi ảnh tối đa 10MB.`}
            >
              <Typography.Text>Chèn link ảnh</Typography.Text>
              <Input.TextArea
                value={linkText}
                onChange={(event) => setLinkText(event.target.value)}
                rows={3}
                style={{ marginTop: 6 }}
                placeholder={
                  'https://example.com/huong-dan-1.jpg\nhttps://example.com/huong-dan-2.jpg'
                }
                disabled={saving}
              />
              <Button
                icon={<LinkOutlined />}
                onClick={handleAddLinks}
                style={{ marginTop: 8 }}
                disabled={saving}
              >
                Thêm link ảnh
              </Button>
            </Form.Item>

            {items.length === 0 && (
              <Alert
                type="error"
                showIcon
                style={{ marginTop: 12 }}
                message="Bắt buộc phải có ít nhất 1 ảnh hướng dẫn trước khi lưu."
              />
            )}
          </div>
        </div>

        <Divider orientation="left" plain style={{ margin: '4px 0 12px' }}>
          Thông số kỹ thuật
        </Divider>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 10 }}>
          Nhập sẵn: Tên sản phẩm, Nhãn hiệu, Model, Công suất động cơ. Cần thêm trường nào thì bấm
          &quot;Thêm trường&quot;.
        </Typography.Paragraph>
        {renderEntryList('specs', 'Tên sản phẩm', 'Ví dụ: Quạt trần 8 cánh ECOFAN E8')}

        <Divider orientation="left" plain style={{ margin: '20px 0 12px' }}>
          Nhà sản xuất / Đơn vị phân phối
        </Divider>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 10 }}>
          Nhập sẵn: Tên đơn vị, Mã số thuế, Địa chỉ, Điện thoại, Email. Cần thêm trường nào thì bấm
          &quot;Thêm trường&quot;.
        </Typography.Paragraph>
        {renderEntryList('distributor', 'Tên đơn vị', 'Nhập giá trị')}
      </Form>
    </Modal>
  );
}
