import type { Metadata } from 'next';
import AdminPanel from '@/components/admin/AdminPanel';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Quản trị tra cứu sản phẩm',
  robots: { index: false },
};

export default function AdminPage() {
  return <AdminPanel />;
}
