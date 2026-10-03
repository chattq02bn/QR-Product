'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

type Props = {
  onSearch: (value: string) => void;
  placeholder?: string;
  width?: number;
  /** Thời gian chờ gõ ngừng rồi mới gọi onSearch (ms). */
  debounceMs?: number;
};

/**
 * Ô tìm kiếm theo tên sản phẩm, tự quản lý state ô nhập
 * và tự debounce trước khi báo ra ngoài.
 */
export default function ProductSearch({
  onSearch,
  placeholder = 'Tìm theo tên sản phẩm',
  width = 260,
  debounceMs = 400,
}: Props) {
  const [value, setValue] = useState('');
  const onSearchRef = useRef(onSearch);

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchRef.current(value.trim());
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [value, debounceMs]);

  return (
    <Input
      allowClear
      prefix={<SearchOutlined />}
      placeholder={placeholder}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      style={{ width }}
      aria-label={placeholder}
    />
  );
}
