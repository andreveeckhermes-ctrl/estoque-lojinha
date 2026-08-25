import { ReactNode } from 'react';
import { AuthGuard } from '@/components/layout/AuthGuard';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
