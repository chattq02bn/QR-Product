'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Key } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Dropdown, Grid, Space, Typography } from 'antd';
import { DownOutlined, DownloadOutlined, FileExcelOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import ProductTable from '@/components/admin/ProductTable';
import ProductModal from '@/components/admin/ProductModal';
import ProductSearch from '@/components/admin/ProductSearch';
import QrModal from '@/components/admin/QrModal';
import AdminHeader from '@/components/admin/AdminHeader';
import type { QrTarget } from '@/components/admin/QrModal';
import { openInNewTab } from '@/lib/client';
import { getLookupPath, getQrCode } from '@/lib/qr';
import {
  createProduct,
  deleteProduct,
  fetchProductList,
  insertCreatedProduct,
  productListQueryKey,
  removeDeletedProduct,
  replaceUpdatedProduct,
  updateProduct,
} from '@/lib/queries';
import type { ProductListParams, ProductPayload } from '@/lib/queries';
import type { ProductView } from '@/lib/types';

/** Loại file đang tải: gói mã QR nén (.zip/.rar) hoặc bảng Excel (.xlsx). */
type ExportKind = 'qr' | 'excel';

/** Chế độ tải: tất cả sản phẩm hoặc các sản phẩm đang được chọn. */
type ExportMode = 'all' | 'selected';

export default function AdminPanel() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const screens = Grid.useBreakpoint();
  const asCards = !screens.md;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductView | null>(null);
  const [qrTarget, setQrTarget] = useState<QrTarget>(null);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [exporting, setExporting] = useState<{ kind: ExportKind; mode: ExportMode } | null>(null);
  const scrollTopOnLoadRef = useRef(false);

  /** Nhận kết quả tìm kiếm từ ProductSearch (đã debounce trong component con). */
  const handleSearch = useCallback((term: string) => {
    setSearch(term);
    setPage(1);
  }, []);

  const params: ProductListParams = { page, pageSize, search };

  const listQuery = useQuery({
    queryKey: productListQueryKey(params),
    queryFn: () => fetchProductList(params),
    placeholderData: keepPreviousData,
  });

  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const loading = listQuery.isFetching;
  const error = listQuery.isError
    ? listQuery.error instanceof Error
      ? listQuery.error.message
      : 'Không tải được danh sách sản phẩm'
    : null;

  useEffect(() => {
    const data = listQuery.data;
    if (!scrollTopOnLoadRef.current || !data) return;
    scrollTopOnLoadRef.current = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [listQuery.data]);

  const refresh = () => {
    void listQuery.refetch();
  };

  const createMutation = useMutation({
    mutationFn: (payload: ProductPayload) => createProduct(payload),
    onSuccess: (saved) => {
      insertCreatedProduct(queryClient, saved);
      message.success('Đã tạo sản phẩm thành công');
      setModalOpen(false);
      setEditing(null);
      setQrTarget({ name: saved.name, code: getQrCode(saved) });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProductPayload }) =>
      updateProduct(id, payload),
    onSuccess: (saved) => {
      replaceUpdatedProduct(queryClient, saved);
      message.success('Đã cập nhật sản phẩm');
      setModalOpen(false);
      setEditing(null);
      setQrTarget({ name: saved.name, code: getQrCode(saved) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (product: ProductView) => deleteProduct(product.id),
    onSuccess: (_data, product) => {
      removeDeletedProduct(queryClient, product.id);
      setSelectedKeys((keys) => keys.filter((key) => key !== product.id));
      message.success(`Đã xóa "${product.name}"`);
      if (items.length === 1 && page > 1) {
        setPage(page - 1);
      }
    },
    onError: (catched) => {
      message.error(catched instanceof Error ? catched.message : 'Không xóa được sản phẩm');
    },
  });

  const handleAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEdit = (product: ProductView) => {
    setEditing(product);
    setModalOpen(true);
  };

  const handleView = (product: ProductView) => {
    openInNewTab(getLookupPath(getQrCode(product)));
  };

  const handleSave = (
    payload: ProductPayload,
    options: { copy?: boolean } = {},
  ): Promise<ProductView> => {
    // Bản sao: đang mở modal sửa sản phẩm gốc nhưng phải tạo sản phẩm mới
    if (editing && !options.copy) return updateMutation.mutateAsync({ id: editing.id, payload });
    return createMutation.mutateAsync(payload);
  };

  const deletingId = deleteMutation.isPending ? (deleteMutation.variables?.id ?? null) : null;
  const selectedCount = selectedKeys.length;

  const readFilename = (header: string | null): string | null => {
    if (!header) return null;
    const match = /filename="([^"]+)"/.exec(header);
    return match?.[1] ?? null;
  };

  /** Tải file từ API (nhận blob + filename từ header) — dùng chung cho QR và Excel. */
  const downloadFileFromApi = async (options: {
    kind: ExportKind;
    mode: ExportMode;
    url: string;
    pendingMessage: string;
    successMessage: string;
    errorMessage: string;
    fallbackName: string;
  }) => {
    if (exporting) return;
    if (options.mode === 'selected' && selectedCount === 0) {
      message.info('Hãy chọn ít nhất một sản phẩm');
      return;
    }

    setExporting({ kind: options.kind, mode: options.mode });
    const hideLoading = message.loading(options.pendingMessage, 0);
    try {
      const payload = options.mode === 'all' ? { all: true } : { ids: selectedKeys.map(String) };
      const res = await fetch(options.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        message.error(data?.error?.message ?? options.errorMessage);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = readFilename(res.headers.get('Content-Disposition')) ?? options.fallbackName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      message.success(options.successMessage);
    } catch {
      message.error(options.errorMessage);
    } finally {
      hideLoading();
      setExporting(null);
    }
  };

  const downloadQrArchive = (mode: ExportMode) => {
    void downloadFileFromApi({
      kind: 'qr',
      mode,
      url: '/api/qr/export',
      pendingMessage:
        mode === 'all'
          ? `Đang tạo file nén cho ${total} sản phẩm, vui lòng chờ...`
          : `Đang tạo file nén cho ${selectedCount} sản phẩm đã chọn...`,
      successMessage:
        mode === 'all'
          ? `Đã tải mã QR của ${total} sản phẩm`
          : `Đã tải mã QR của ${selectedCount} sản phẩm đã chọn`,
      errorMessage: 'Không tải được file mã QR, vui lòng thử lại',
      fallbackName: 'ma-qr.zip',
    });
  };

  const downloadExcel = (mode: ExportMode) => {
    void downloadFileFromApi({
      kind: 'excel',
      mode,
      url: '/api/export/excel',
      pendingMessage:
        mode === 'all'
          ? `Đang tạo file Excel cho ${total} sản phẩm, vui lòng chờ...`
          : `Đang tạo file Excel cho ${selectedCount} sản phẩm đã chọn...`,
      successMessage:
        mode === 'all'
          ? `Đã tải file Excel của ${total} sản phẩm`
          : `Đã tải file Excel của ${selectedCount} sản phẩm đã chọn`,
      errorMessage: 'Không tải được file Excel, vui lòng thử lại',
      fallbackName: 'danh-sach-san-pham.xlsx',
    });
  };

  const downloadMenu = {
    items: [
      {
        key: 'all',
        icon: <DownloadOutlined />,
        label: `Tải tất cả (${total})`,
      },
      {
        key: 'selected',
        icon: <DownloadOutlined />,
        label: `Tải những QR đã chọn (${selectedCount})`,
        disabled: selectedCount === 0,
      },
    ],
    onClick: ({ key }: { key: string }) => {
      downloadQrArchive(key as ExportMode);
    },
  };

  const excelMenu = {
    items: [
      {
        key: 'all',
        icon: <FileExcelOutlined />,
        label: `Tải tất cả (${total})`,
      },
      {
        key: 'selected',
        icon: <FileExcelOutlined />,
        label: `Tải Excel của ${selectedCount} sản phẩm đã chọn`,
        disabled: selectedCount === 0,
      },
    ],
    onClick: ({ key }: { key: string }) => {
      downloadExcel(key as ExportMode);
    },
  };

  return (
    <>
      <AdminHeader />
      <div className="admin-page">
        <div className="admin-page__header">
          <Typography.Title level={3} className="admin-page__title">
            Quản lý tra cứu sản phẩm
          </Typography.Title>
          <Space wrap>
            <ProductSearch onSearch={handleSearch} placeholder="Tìm theo tên hoặc mã sản phẩm" />
            <Button icon={<ReloadOutlined />} onClick={refresh} loading={loading}>
              Tải lại
            </Button>
            <Dropdown trigger={['click']} menu={downloadMenu}>
              <Button
                icon={<DownloadOutlined />}
                loading={exporting?.kind === 'qr'}
                title={
                  selectedCount === 0
                    ? 'Tải mã QR của tất cả sản phẩm (.zip)'
                    : 'Tải mã QR (.zip): tất cả hoặc sản phẩm đã chọn'
                }
              >
                Tải mã QR <DownOutlined />
              </Button>
            </Dropdown>
            <Dropdown trigger={['click']} menu={excelMenu}>
              <Button
                icon={<FileExcelOutlined />}
                loading={exporting?.kind === 'excel'}
                title={
                  selectedCount === 0
                    ? 'Tải bảng Excel của tất cả sản phẩm (.xlsx)'
                    : 'Tải bảng Excel (.xlsx): tất cả hoặc sản phẩm đã chọn'
                }
              >
                Tải Excel <DownOutlined />
              </Button>
            </Dropdown>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Thêm sản phẩm
            </Button>
          </Space>
        </div>

        {error && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 12 }}
            message={error}
            action={
              <Button size="small" onClick={refresh}>
                Thử lại
              </Button>
            }
          />
        )}

        <ProductTable
          items={items}
          loading={loading}
          total={total}
          page={page}
          pageSize={pageSize}
          asCards={asCards}
          deletingId={deletingId}
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
          onPageChange={(nextPage, nextPageSize) => {
            scrollTopOnLoadRef.current = true;
            setPage(nextPage);
            setPageSize(nextPageSize);
          }}
          onView={handleView}
          onQr={(product) => setQrTarget({ name: product.name, code: getQrCode(product) })}
          onEdit={handleEdit}
          onDelete={(product) => deleteMutation.mutate(product)}
        />

        <ProductModal
          open={modalOpen}
          product={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />

        <QrModal target={qrTarget} onClose={() => setQrTarget(null)} />
      </div>
    </>
  );
}
