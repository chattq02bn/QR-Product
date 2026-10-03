'use client';

import type { CSSProperties, Key } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Card,
  Image,
  Pagination,
  Popconfirm,
  QRCode,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  LeftOutlined,
  QrcodeOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { openInNewTab } from '@/lib/client';
import { getLookupPath, getLookupUrl } from '@/lib/qr';
import { EXPIRY_COLORS, describeExpiry } from '@/lib/format';
import type { ProductView } from '@/lib/types';

type Props = {
  items: ProductView[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  asCards: boolean;
  deletingId: string | null;
  selectedKeys: Key[];
  onSelectionChange: (keys: Key[]) => void;
  onPageChange: (page: number, pageSize: number) => void;
  onView: (product: ProductView) => void;
  onQr: (product: ProductView) => void;
  onEdit: (product: ProductView) => void;
  onDelete: (product: ProductView) => void;
};

const thumbnailStyle: CSSProperties = {
  width: 44,
  height: 44,
  objectFit: 'cover',
  borderRadius: 6,
};

const GUIDE_COLUMN_WIDTH = 180;
const GUIDE_VISIBLE_COUNT = 3;
const GUIDE_GAP = 6;

function GuideImageSlider({ product }: { product: ProductView }) {
  const images = product.images;
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportWidth, setViewportWidth] = useState(GUIDE_COLUMN_WIDTH);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateEdges = useCallback(() => {
    const element = viewportRef.current;
    if (!element) return;
    setAtStart(element.scrollLeft <= 1);
    setAtEnd(element.scrollLeft + element.clientWidth >= element.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return undefined;

    const update = () => {
      setViewportWidth(element.clientWidth);
      updateEdges();
    };
    update();

    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [updateEdges]);

  if (images.length === 0) {
    return <Tag color="default">Chưa có ảnh</Tag>;
  }

  const baseWidth = viewportWidth > 0 ? viewportWidth : GUIDE_COLUMN_WIDTH;
  const cellWidth = (baseWidth - GUIDE_GAP * (GUIDE_VISIBLE_COUNT - 1)) / GUIDE_VISIBLE_COUNT;
  const step = cellWidth + GUIDE_GAP;
  const canPrev = !atStart;
  const canNext = !atEnd;

  const scrollByStep = (direction: 1 | -1) => {
    viewportRef.current?.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  return (
    <div className="admin-img-slider">
      <div className="admin-img-slider__viewport" ref={viewportRef} onScroll={updateEdges}>
        <div className="admin-img-slider__track">
          {images.map((image) => (
            <span key={image.id} className="admin-img-slider__cell" style={{ width: cellWidth }}>
              <Image src={image.url} alt={`${product.name} - hướng dẫn`} />
            </span>
          ))}
        </div>
      </div>

      {canPrev && (
        <button
          type="button"
          className="admin-img-slider__btn admin-img-slider__btn--prev"
          aria-label="Ảnh trước"
          title="Ảnh trước"
          onClick={() => scrollByStep(-1)}
        >
          <LeftOutlined />
        </button>
      )}

      {canNext && (
        <button
          type="button"
          className="admin-img-slider__btn admin-img-slider__btn--next"
          aria-label="Ảnh kế tiếp"
          title="Ảnh kế tiếp"
          onClick={() => scrollByStep(1)}
        >
          <RightOutlined />
        </button>
      )}
    </div>
  );
}

function ProductImageCell({ product }: { product: ProductView }) {
  if (!product.imageUrl) {
    return <Tag color="default">Chưa có ảnh</Tag>;
  }
  return (
    <Image
      src={product.imageUrl}
      width={44}
      height={44}
      style={thumbnailStyle}
      alt={product.name}
    />
  );
}

function ExpiryTag({ product }: { product: ProductView }) {
  const info = describeExpiry(product.qrExpiresAt);
  return <Tag color={EXPIRY_COLORS[info.status]}>{info.label}</Tag>;
}

export default function ProductTable({
  items,
  loading,
  total,
  page,
  pageSize,
  asCards,
  deletingId,
  selectedKeys,
  onSelectionChange,
  onPageChange,
  onView,
  onQr,
  onEdit,
  onDelete,
}: Props) {
  const columns: TableColumnsType<ProductView> = [
    {
      title: 'Tên sản phẩm',
      dataIndex: 'name',
      key: 'name',
      width: 260,
      ellipsis: true,
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: 'Ảnh sản phẩm',
      key: 'productImage',
      width: 110,
      align: 'center',
      render: (_, product) => <ProductImageCell product={product} />,
    },
    {
      title: 'Ảnh hướng dẫn',
      key: 'images',
      width: GUIDE_COLUMN_WIDTH,
      onCell: () => ({ style: { paddingLeft: 0, paddingRight: 0 } }),
      onHeaderCell: () => ({ style: { paddingLeft: 0 } }),
      render: (_, product) => <GuideImageSlider product={product} />,
    },
    {
      title: 'Mã QR',
      key: 'qr',
      width: 110,
      align: 'center',
      render: (_, product) => (
        <span
          className="admin-qr-cell"
          title="Nhấn để phóng to mã QR"
          onClick={() => onQr(product)}
        >
          <QRCode
            value={getLookupUrl(product.slug)}
            size={80}
            bordered
            color="#10357a"
            bgColor="#ffffff"
          />
        </span>
      ),
    },
    {
      title: 'Hạn QR',
      key: 'expiry',
      width: 170,
      render: (_, product) => <ExpiryTag product={product} />,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 260,
      render: (_, product) => (
        <Space wrap size={4}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => onView(product)}>
            Xem thử
          </Button>
          <Button size="small" icon={<QrcodeOutlined />} onClick={() => onQr(product)}>
            Mã QR
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(product)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xóa sản phẩm?"
            description="Sản phẩm và toàn bộ ảnh hướng dẫn sẽ bị xóa vĩnh viễn."
            okText="Xóa"
            okButtonProps={{ danger: true }}
            cancelText="Hủy"
            onConfirm={() => onDelete(product)}
          >
            <Button
              size="small"
              danger
              loading={deletingId === product.id}
              icon={<DeleteOutlined />}
            >
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const pagination = {
    current: page,
    pageSize,
    total,
    showSizeChanger: false,
    showTotal: (t: number) => `${t} sản phẩm`,
    onChange: onPageChange,
  };

  if (asCards) {
    return (
      <div className={`admin-card-list${loading ? ' admin-card-list--loading' : ''}`}>
        {loading && (
          <div className="admin-card-list__loading" role="status" aria-label="Đang tải dữ liệu">
            <Spin size="large" />
          </div>
        )}
        {items.map((product) => (
          <Card
            key={product.id}
            size="small"
            title={
              <Typography.Text strong ellipsis title={product.name}>
                {product.name}
              </Typography.Text>
            }
            styles={{ body: { display: 'flex', flexDirection: 'column', gap: 12 } }}
          >
            <div>
              <Typography.Text type="secondary">Ảnh sản phẩm: </Typography.Text>
              <ProductImageCell product={product} />
            </div>

            <div>
              <Typography.Text type="secondary">Ảnh hướng dẫn: </Typography.Text>
              <GuideImageSlider product={product} />
            </div>

            <div>
              <Typography.Text type="secondary">Hạn QR: </Typography.Text>
              <ExpiryTag product={product} />
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span
                className="admin-qr-cell"
                title="Nhấn để phóng to mã QR"
                onClick={() => onQr(product)}
              >
                <QRCode
                  value={getLookupUrl(product.slug)}
                  size={72}
                  bordered
                  color="#10357a"
                  bgColor="#ffffff"
                />
              </span>
              <div className="admin-card-actions">
                <Button size="small" icon={<EyeOutlined />} onClick={() => onView(product)}>
                  Xem thử
                </Button>
                <Button size="small" icon={<QrcodeOutlined />} onClick={() => onQr(product)}>
                  Mã QR
                </Button>
                <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(product)}>
                  Sửa
                </Button>
                <Popconfirm
                  title="Xóa sản phẩm?"
                  description="Sản phẩm và toàn bộ ảnh hướng dẫn sẽ bị xóa vĩnh viễn."
                  okText="Xóa"
                  okButtonProps={{ danger: true }}
                  cancelText="Hủy"
                  onConfirm={() => onDelete(product)}
                >
                  <Button
                    size="small"
                    danger
                    loading={deletingId === product.id}
                    icon={<DeleteOutlined />}
                  >
                    Xóa
                  </Button>
                </Popconfirm>
              </div>
            </div>
          </Card>
        ))}

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            showSizeChanger={false}
            onChange={onPageChange}
            showTotal={(t) => `${t} sản phẩm`}
          />
        </div>
      </div>
    );
  }

  return (
    <Table<ProductView>
      rowKey="id"
      columns={columns}
      dataSource={items}
      loading={loading}
      pagination={pagination}
      tableLayout="fixed"
      rowSelection={{
        selectedRowKeys: selectedKeys,
        onChange: (keys) => onSelectionChange(keys as Key[]),
        preserveSelectedRowKeys: true,
        columnWidth: 48,
      }}
      scroll={{ x: 1108 }}
    />
  );
}
