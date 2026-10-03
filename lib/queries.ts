import type { QueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/client';
import type { ProductListData, ProductView, UploadedImage } from '@/lib/types';

export type ProductListParams = { page: number; pageSize: number; search: string };

export type ProductPayload = Record<string, unknown>;

export const productListKey = ['products', 'list'] as const;

export function productListQueryKey(params: ProductListParams) {
  return [...productListKey, params] as const;
}

export async function fetchProductList(params: ProductListParams): Promise<ProductListData> {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.search) query.set('search', params.search);
  return apiFetch<ProductListData>(`/api/products?${query.toString()}`);
}

export async function createProduct(payload: ProductPayload): Promise<ProductView> {
  return apiFetch<ProductView>('/api/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProduct(id: string, payload: ProductPayload): Promise<ProductView> {
  return apiFetch<ProductView>(`/api/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteProduct(id: string): Promise<{ id: string }> {
  return apiFetch<{ id: string }>(`/api/products/${id}`, { method: 'DELETE' });
}

export async function uploadProductImage(file: File): Promise<UploadedImage> {
  const body = new FormData();
  body.append('files', file, file.name);
  const uploaded = await apiFetch<UploadedImage[]>('/api/upload', {
    method: 'POST',
    body,
  });
  const first = uploaded[0];
  if (!first) throw new Error('Không nhận được ảnh trả về');
  return first;
}

function patchProductLists(
  queryClient: QueryClient,
  patch: (data: ProductListData, params: ProductListParams) => ProductListData,
): void {
  const entries = queryClient.getQueriesData<ProductListData>({ queryKey: productListKey });
  for (const [key, data] of entries) {
    if (!data) continue;
    const params = key[2] as ProductListParams | undefined;
    if (!params) continue;
    const next = patch(data, params);
    if (next !== data) queryClient.setQueryData(key, next);
  }
}

export function insertCreatedProduct(queryClient: QueryClient, saved: ProductView): void {
  patchProductLists(queryClient, (data, params) => {
    if (data.items.some((item) => item.id === saved.id)) return data;
    const total = data.total + 1;
    if (params.page !== 1 || params.search) return { ...data, total };
    const items = [saved, ...data.items].slice(0, params.pageSize);
    return { ...data, items, total };
  });
}

export function replaceUpdatedProduct(queryClient: QueryClient, saved: ProductView): void {
  patchProductLists(queryClient, (data) => {
    const index = data.items.findIndex((item) => item.id === saved.id);
    if (index < 0) return data;
    const items = data.items.slice();
    items[index] = saved;
    return { ...data, items };
  });
}

export function removeDeletedProduct(queryClient: QueryClient, id: string): void {
  patchProductLists(queryClient, (data) => {
    if (!data.items.some((item) => item.id === id)) return data;
    return {
      ...data,
      items: data.items.filter((item) => item.id !== id),
      total: Math.max(data.total - 1, 0),
    };
  });
}
