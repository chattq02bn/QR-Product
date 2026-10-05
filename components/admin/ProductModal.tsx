'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Divider,
  Form,
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
import { CopyOutlined, DeleteOutlined, LinkOutlined, PlusOutlined } from '@ant-design/icons';
import { apiFetch } from '@/lib/client';
import { isValidHttpUrl } from '@/lib/format';
import { checkProductCode, uploadProductImage } from '@/lib/queries';
import type { ProductPayload } from '@/lib/queries';
import {
  isSupportedImageType,
  MAX_IMAGE_BYTES,
  MAX_IMAGES_PER_PRODUCT,
  MAX_PRODUCT_CODE_LENGTH,
  PRODUCT_CODE_PATTERN,
  unsupportedImageMessage,
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

/** Loại ảnh: "product" = ảnh sản phẩm, "guide" = ảnh hướng dẫn sử dụng. */
type ImageKind = 'product' | 'guide';

const IMAGE_KINDS: ImageKind[] = ['product', 'guide'];

const EMPTY_IMAGE_ITEMS: Record<ImageKind, ImageItem[]> = { product: [], guide: [] };

const IMAGE_KIND_LABEL: Record<ImageKind, string> = { product: 'sản phẩm', guide: 'hướng dẫn' };

const IMAGE_KIND_TITLE: Record<ImageKind, string> = {
  product: 'Ảnh sản phẩm',
  guide: 'Ảnh hướng dẫn',
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
  /**
   * Lưu sản phẩm. `copy = true` khi đang tạo bản sao: modal đang hiển thị sản phẩm gốc
   * nhưng phải tạo mới (POST) thay vì cập nhật sản phẩm đó.
   */
  onSave: (payload: ProductPayload, options: { copy: boolean }) => Promise<ProductView>;
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

/** Lấy ảnh của một loại (sản phẩm / hướng dẫn) từ dữ liệu sản phẩm. */
function toImageItems(product: ProductView, kind: ImageKind): ImageItem[] {
  return product.images
    .filter((image) => image.kind === kind)
    .map((image) => ({
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
  const [imageItems, setImageItems] = useState<Record<ImageKind, ImageItem[]>>(EMPTY_IMAGE_ITEMS);
  /** Ô dán link ảnh dùng chung cho cả 2 loại ảnh (sản phẩm / hướng dẫn). */
  const [linkText, setLinkText] = useState('');
  const [expiryTouched, setExpiryTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const dragKeyRef = useRef<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const blobUrlsRef = useRef<Set<string>>(new Set());
  /** Kết quả kiểm tra "mã sản phẩm đã tồn tại" theo từng mã, tránh gọi API lặp lại. */
  const codeCheckCacheRef = useRef<Map<string, boolean>>(new Map());
  /** Mã sản phẩm của sản phẩm gốc khi đang tạo bản sao (null = không ở chế độ copy). */
  const [copiedFrom, setCopiedFrom] = useState<string | null>(null);
  const isCopy = copiedFrom !== null;

  const mode = Form.useWatch('qrMode', form) ?? 'permanent';
  const duration = Form.useWatch('qrDuration', form) ?? 1;
  const unit = Form.useWatch('qrUnit', form) ?? 'day';
  const descriptionValue = (Form.useWatch('description', form) ?? '') as string;
  const descriptionWords = countWords(descriptionValue);
  // Bản sao là đang tạo sản phẩm mới (không phải sửa sản phẩm gốc)
  const isEditing = Boolean(product) && !isCopy;

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
    setCopiedFrom(null);
    setDragOverKey(null);
    dragKeyRef.current = null;
    blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    blobUrlsRef.current.clear();
    codeCheckCacheRef.current.clear();

    if (!open) {
      setImageItems(EMPTY_IMAGE_ITEMS);
      setLinkText('');
      return;
    }

    const split = product?.qrExpiresAt
      ? splitDuration(new Date(product.qrExpiresAt).getTime() - Date.now())
      : null;
    form.setFieldsValue({
      name: product?.name ?? '',
      productCode: product?.productCode ?? '',
      description: product?.description ?? '',
      manufacturer: product?.manufacturer ?? '',
      specs: toFormEntries(product?.specs, DEFAULT_SPEC_LABELS),
      distributor: toFormEntries(product?.distributor, DEFAULT_DISTRIBUTOR_LABELS),
      qrMode: split ? 'duration' : 'permanent',
      qrDuration: split?.duration ?? 7,
      qrUnit: split?.unit ?? 'day',
    });
    setImageItems(
      product
        ? {
            product: toImageItems(product, 'product'),
            guide: toImageItems(product, 'guide'),
          }
        : EMPTY_IMAGE_ITEMS,
    );
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

  /** Cập nhật danh sách ảnh của một loại, các loại ảnh còn lại giữ nguyên. */
  const updateItems = (kind: ImageKind, updater: (prev: ImageItem[]) => ImageItem[]) =>
    setImageItems((prev) => ({ ...prev, [kind]: updater(prev[kind]) }));

  const customRequest =
    (kind: ImageKind): UploadProps['customRequest'] =>
    (options) => {
      const { file, onSuccess: onOk, onError } = options;
      const rcFile = file as RcFile;

      if (rcFile.type && !isSupportedImageType(rcFile.type)) {
        const reason = unsupportedImageMessage(rcFile.name);
        message.error(reason);
        onError?.(new Error(reason));
        return;
      }

      if (rcFile.size > MAX_IMAGE_BYTES) {
        message.error(`Ảnh "${rcFile.name}" vượt quá 10MB`);
        onError?.(new Error('File quá lớn'));
        return;
      }

      if (imageItems[kind].length >= MAX_IMAGES_PER_PRODUCT) {
        message.error(`Tối đa ${MAX_IMAGES_PER_PRODUCT} ảnh ${IMAGE_KIND_LABEL[kind]}`);
        onError?.(new Error('Vượt quá số ảnh cho phép'));
        return;
      }

      const url = URL.createObjectURL(rcFile);
      rememberBlob(url);
      updateItems(kind, (prev) => [
        ...prev,
        { key: rcFile.uid, url, publicId: '', uploading: false, file: rcFile },
      ]);
      onOk?.({});
    };

  const handleChange =
    (kind: ImageKind): UploadProps['onChange'] =>
    (info) => {
      if (info.file.status === 'removed') {
        const key = info.file.uid;
        updateItems(kind, (prev) => prev.filter((item) => item.key !== key));
      }
    };

  const handleRemove =
    (kind: ImageKind): UploadProps['onRemove'] =>
    (file) => {
      const removed = imageItems[kind].find((item) => item.key === file.uid);
      if (removed) forgetBlob(removed.url);
      if (removed?.publicId && !removed.id) {
        void apiFetch(`/api/upload?publicId=${encodeURIComponent(removed.publicId)}`, {
          method: 'DELETE',
        }).catch(() => undefined);
      }
      return true;
    };

  const itemRender = (kind: ImageKind): UploadProps['itemRender'] => {
    const renderItem: UploadProps['itemRender'] = (originNode, file) => (
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
          updateItems(kind, (prev) => {
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

    return renderItem;
  };

  const fileList = (kind: ImageKind): UploadFile[] =>
    imageItems[kind].map((item) => ({
      uid: item.key,
      name: item.file?.name ?? (item.url ? (item.url.split('/').pop() ?? 'image') : 'image'),
      status: item.uploading ? 'uploading' : 'done',
      url: item.url || undefined,
      percent: item.uploading ? 70 : 100,
    }));

  const handleAddLinks = (kind: ImageKind) => {
    const label = IMAGE_KIND_LABEL[kind];
    const current = imageItems[kind];
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
      if (current.some((item) => item.url === line) || added.some((item) => item.url === line)) {
        continue;
      }
      added.push({
        key: `link-${kind}-${Date.now()}-${added.length}`,
        url: line,
        publicId: '',
        uploading: false,
      });
    }

    if (invalid.length > 0) {
      message.error(`Link không hợp lệ: ${invalid.slice(0, 3).join(', ')}`);
    }

    if (current.length + added.length > MAX_IMAGES_PER_PRODUCT) {
      message.error(`Tối đa ${MAX_IMAGES_PER_PRODUCT} ảnh ${label}`);
      return;
    }

    if (added.length > 0) {
      updateItems(kind, (prev) => [...prev, ...added]);
      setLinkText('');
      message.success(`Đã thêm ${added.length} ảnh ${label} từ link`);
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

  /**
   * Tạo bản sao: sao chép toàn bộ thông tin (tên, mô tả, thông số, đơn vị, hạn QR,
   * ảnh sản phẩm, toàn bộ ảnh hướng dẫn) từ sản phẩm đang mở, chỉ xóa mã sản phẩm
   * để admin nhập mã mới. Sau đó bấm "Tạo sản phẩm" sẽ tạo 1 sản phẩm hoàn toàn mới.
   */
  const handleCopy = () => {
    if (!product || saving) return;

    setCopiedFrom(product.productCode || product.slug);
    codeCheckCacheRef.current.clear();

    const split = product.qrExpiresAt
      ? splitDuration(new Date(product.qrExpiresAt).getTime() - Date.now())
      : null;

    form.setFieldsValue({
      name: product.name,
      productCode: '',
      description: product.description ?? '',
      manufacturer: product.manufacturer ?? '',
      specs: toFormEntries(product.specs, DEFAULT_SPEC_LABELS),
      distributor: toFormEntries(product.distributor, DEFAULT_DISTRIBUTOR_LABELS),
      qrMode: split ? 'duration' : 'permanent',
      qrDuration: split?.duration ?? 7,
      qrUnit: split?.unit ?? 'day',
    });
    setImageItems({
      product: toImageItems(product, 'product'),
      guide: toImageItems(product, 'guide'),
    });
    setLinkText('');
    setExpiryTouched(false);

    message.success(`Đã copy thông tin từ mã ${product.productCode} — hãy nhập mã sản phẩm mới`);
    window.setTimeout(() => {
      form.focusField('productCode');
      void form.validateFields(['productCode']).catch(() => undefined);
    }, 0);
  };

  const handleOk = async () => {
    let values: FormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    // Ảnh hợp lệ: đã có url thật (upload/link) hoặc còn file chờ upload (url blob)
    const validCount = (kind: ImageKind) =>
      imageItems[kind].filter(
        (item) => Boolean(item.file) || (Boolean(item.url) && !item.url.startsWith('blob:')),
      ).length;
    if (validCount('product') === 0) {
      message.error('Sản phẩm bắt buộc phải có ít nhất 1 ảnh sản phẩm');
      return;
    }
    if (validCount('guide') === 0) {
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

    const pendingEntries = IMAGE_KINDS.flatMap((kind) =>
      imageItems[kind].filter((item) => item.file && !item.id).map((item) => ({ kind, item })),
    );

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
      const uploadKey = (kind: ImageKind, key: string) => `${kind}::${key}`;

      if (pendingEntries.length > 0) {
        setImageItems((prev) => {
          const next = { ...prev };
          for (const kind of IMAGE_KINDS) {
            next[kind] = next[kind].map((item) =>
              pendingEntries.some(
                (pending) => pending.kind === kind && pending.item.key === item.key,
              )
                ? { ...item, uploading: true }
                : item,
            );
          }
          return next;
        });

        const results = await Promise.allSettled(
          pendingEntries.map((entry) => uploadProductImage(entry.item.file as RcFile)),
        );

        const uploads = new Map<string, { url: string; publicId: string }>();
        results.forEach((result, index) => {
          const pending = pendingEntries[index];
          if (pending && result.status === 'fulfilled') {
            uploads.set(uploadKey(pending.kind, pending.item.key), result.value);
          }
        });

        setImageItems((prev) => {
          const next = { ...prev };
          for (const kind of IMAGE_KINDS) {
            next[kind] = next[kind].map((item) => {
              const uploaded = uploads.get(uploadKey(kind, item.key));
              if (!uploaded) return { ...item, uploading: false };
              return {
                ...item,
                url: uploaded.url,
                publicId: uploaded.publicId,
                file: undefined,
                uploading: false,
              };
            });
          }
          return next;
        });

        const failed = results.find((result) => result.status === 'rejected');
        if (failed && failed.status === 'rejected') {
          throw failed.reason instanceof Error ? failed.reason : new Error('Upload ảnh thất bại');
        }

        uploads.forEach((value, key) => uploadedByKey.set(key, value));
      }

      const buildImages = (kind: ImageKind) =>
        imageItems[kind]
          .map((item) => {
            const uploaded = uploadedByKey.get(uploadKey(kind, item.key));
            return {
              ...(item.id ? { id: item.id } : {}),
              url: uploaded?.url ?? item.url,
              publicId: uploaded?.publicId ?? item.publicId,
            };
          })
          .filter((image) => Boolean(image.url) && !image.url.startsWith('blob:'));

      const payload: ProductPayload = {
        name: values.name.trim(),
        productCode: values.productCode.trim(),
        description: values.description?.trim() || null,
        manufacturer: values.manufacturer?.trim() || null,
        specs: specsResult.entries,
        distributor: distributorResult.entries,
        qrExpiresAt,
        // Ảnh sản phẩm: ảnh đầu tiên là ảnh đại diện ở trang tra cứu
        productImages: buildImages('product'),
        guideImages: buildImages('guide'),
      };
      // Chế độ sửa giữ nguyên mã tra cứu (không cho đổi slug trên form);
      // bản sao là sản phẩm mới -> slug tự sinh từ tên sản phẩm
      if (product && !isCopy) payload.slug = product.slug;

      await onSave(payload, { copy: isCopy });
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

  /** Khối upload ảnh cho một loại ảnh (ảnh sản phẩm / ảnh hướng dẫn). */
  const renderImageGallery = (kind: ImageKind) => {
    const title = IMAGE_KIND_TITLE[kind];
    const list = imageItems[kind];
    const uploading = list.filter((item) => item.uploading).length;
    const pending = list.filter((item) => item.file && !item.id).length;

    return (
      <>
        <Divider orientation="left" plain style={{ margin: '8px 0 16px' }}>
          {title}
        </Divider>

        <Upload
          listType="picture-card"
          multiple
          accept="image/*"
          fileList={fileList(kind)}
          maxCount={MAX_IMAGES_PER_PRODUCT}
          customRequest={customRequest(kind)}
          onChange={handleChange(kind)}
          onRemove={handleRemove(kind)}
          itemRender={itemRender(kind)}
          disabled={saving}
        >
          {list.length >= MAX_IMAGES_PER_PRODUCT ? null : (
            <div>
              <PlusOutlined />
              <div style={{ marginTop: 8, fontSize: 12 }}>Tải ảnh</div>
            </div>
          )}
        </Upload>

        {uploading > 0 && (
          <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            Đang tải lên {uploading} ảnh...
          </Typography.Paragraph>
        )}

        {pending > 0 && uploading === 0 && (
          <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            {pending} ảnh local sẽ được tải lên Cloudinary khi bạn lưu.
          </Typography.Paragraph>
        )}

        {list.length === 0 && (
          <Alert
            type="error"
            showIcon
            style={{ marginTop: 12 }}
            message={`Bắt buộc phải có ít nhất 1 ${title.toLowerCase()} trước khi lưu.`}
          />
        )}
      </>
    );
  };

  /** Một ô dán link dùng chung, bên dưới là 2 nút gán link cho ảnh sản phẩm / ảnh hướng dẫn. */
  const renderLinkBox = () => (
    <Form.Item
      style={{ marginTop: 16, marginBottom: 0 }}
      extra={`Dán link ảnh có sẵn, mỗi dòng một link, rồi bấm nút gán vào loại ảnh cần thêm. Tối đa ${MAX_IMAGES_PER_PRODUCT} ảnh mỗi loại, mỗi ảnh tối đa 10MB.`}
    >
      <Typography.Text>Chèn link ảnh</Typography.Text>
      <Input.TextArea
        value={linkText}
        onChange={(event) => setLinkText(event.target.value)}
        rows={3}
        style={{ marginTop: 6 }}
        placeholder={
          'https://example.com/anh-san-pham-1.jpg\nhttps://example.com/anh-huong-dan-1.jpg'
        }
        disabled={saving}
      />
      <Space wrap style={{ marginTop: 8 }}>
        <Button icon={<LinkOutlined />} onClick={() => handleAddLinks('product')} disabled={saving}>
          {`Thêm link ảnh ${IMAGE_KIND_LABEL.product}`}
        </Button>
        <Button icon={<LinkOutlined />} onClick={() => handleAddLinks('guide')} disabled={saving}>
          {`Thêm link ảnh ${IMAGE_KIND_LABEL.guide}`}
        </Button>
      </Space>
    </Form.Item>
  );

  return (
    <Modal
      open={open}
      title={
        isCopy
          ? `Tạo sản phẩm (bản sao từ mã ${copiedFrom})`
          : isEditing
            ? 'Sửa sản phẩm'
            : 'Thêm sản phẩm'
      }
      footer={
        <Space wrap>
          {product && !isCopy && (
            <Button icon={<CopyOutlined />} onClick={handleCopy} disabled={saving}>
              Tạo bản sao
            </Button>
          )}
          <Button
            onClick={() => {
              if (saving) return;
              onClose();
            }}
            disabled={saving}
          >
            Hủy
          </Button>
          <Button
            type="primary"
            onClick={() => void handleOk()}
            loading={saving}
            disabled={imageItems.product.length === 0 || imageItems.guide.length === 0}
          >
            {isEditing ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
          </Button>
        </Space>
      }
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
                isEditing
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
              extra={
                isCopy
                  ? `Đang tạo bản sao từ mã ${copiedFrom} — hãy nhập mã sản phẩm mới (khác mã gốc).`
                  : 'Mã in trên bao bì / báo giá, hiển thị ở trang tra cứu và khối thông số kỹ thuật.'
              }
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
                    // Mã không đổi so với ban đầu -> không cần kiểm tra lại (bản sao luôn kiểm tra)
                    if (!isCopy && trimmed === (product?.productCode ?? '').trim()) return;
                    if (await isProductCodeTaken(trimmed, isCopy ? undefined : product?.id)) {
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
              name="description"
              label="Mô tả sản phẩm"
              extra={`${descriptionWords} / ${MAX_DESCRIPTION_WORDS} từ`}
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

            {renderImageGallery('product')}
            {renderImageGallery('guide')}
            {renderLinkBox()}
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
