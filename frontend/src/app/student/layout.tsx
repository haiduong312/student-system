import { RoleLayout } from '@/components/layout/RoleLayout';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <RoleLayout role="STUDENT">{children}</RoleLayout>;
}
