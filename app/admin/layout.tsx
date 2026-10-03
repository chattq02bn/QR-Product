import type { ReactNode } from 'react';
import QueryProvider from '@/components/admin/QueryProvider';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}
