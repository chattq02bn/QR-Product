'use client';

import { useEffect, useRef, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Grid, Input, Space, Typography } from 'antd';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import ProductTable from '@/components/admin/ProductTable';
import ProductModal from '@/components/admin/ProductModal';
import QrModal from '@/components/admin/QrModal';
import AdminHeader from '@/components/admin/AdminHeader';
import type { QrTarget } from '@/components/admin/QrModal';
import { openInNewTab } from '@/lib/client';
import { getLookupPath } from '@/lib/qr';
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

export default function AdminPanel() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const screens = Grid.useBreakpoint();
  const asCards = !screens.md;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductView | null>(null);
  const [qrTarget, setQrTarget] = useState<QrTarget>(null);
  const scrollTopOnLoadRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

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
      setQrTarget({ name: saved.name, slug: saved.slug });
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
      setQrTarget({ name: saved.name, slug: saved.slug });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (product: ProductView) => deleteProduct(product.id),
    onSuccess: (_data, product) => {
      removeDeletedProduct(queryClient, product.id);
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
    openInNewTab(getLookupPath(product.slug));
  };

  const handleSave = (payload: ProductPayload): Promise<ProductView> => {
    if (editing) return updateMutation.mutateAsync({ id: editing.id, payload });
    return createMutation.mutateAsync(payload);
  };

  const deletingId = deleteMutation.isPending ? (deleteMutation.variables?.id ?? null) : null;

  return (
    <>
      <AdminHeader />
      <div className="admin-page">
        <div className="admin-page__header">
          <Typography.Title level={3} className="admin-page__title">
            Quản lý tra cứu sản phẩm
          </Typography.Title>
          <Space wrap>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Tìm theo tên sản phẩm"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              style={{ width: 260 }}
              aria-label="Tìm theo tên sản phẩm"
            />
            <Button icon={<ReloadOutlined />} onClick={refresh} loading={loading}>
              Tải lại
            </Button>
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
          onPageChange={(nextPage, nextPageSize) => {
            scrollTopOnLoadRef.current = true;
            setPage(nextPage);
            setPageSize(nextPageSize);
          }}
          onView={handleView}
          onQr={(product) => setQrTarget({ name: product.name, slug: product.slug })}
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
