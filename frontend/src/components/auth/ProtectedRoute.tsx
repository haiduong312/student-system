'use client';

import { Spin } from 'antd';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useCurrentUser } from '@/hooks/useAuth';
import type { UserRole } from '@/types/auth';

export function ProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, isLoading } = useCurrentUser();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!allowedRoles.includes(user.role)) {
      router.replace('/login');
    }
  }, [allowedRoles, isLoading, pathname, router, user]);

  if (isLoading || !user || !allowedRoles.includes(user.role)) {
    return (
      <div style={{ display: 'grid', minHeight: '100vh', placeItems: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return children;
}
