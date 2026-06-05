import { RoleLayout } from '@/components/layout/RoleLayout';

export default function LecturerLayout({ children }: { children: React.ReactNode }) {
  return <RoleLayout role="LECTURER">{children}</RoleLayout>;
}
