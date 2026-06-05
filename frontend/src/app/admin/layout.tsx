import { RoleLayout } from '@/components/layout/RoleLayout';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RoleLayout role="ADMIN">{children}</RoleLayout>;
}
