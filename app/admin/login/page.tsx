import type { Metadata } from 'next';
import LoginForm from '@/components/admin/LoginForm';

export const metadata: Metadata = {
  title: 'Đăng nhập quản trị',
  robots: { index: false },
};

export default function LoginPage() {
  return <LoginForm />;
}
