'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authService } from '@/features/auth/auth.service';
import { authStorage } from '@/lib/storage';
import type { AuthUser, LoginRequest, UserRole } from '@/types/auth';

const roleHome: Record<UserRole, string> = {
  ADMIN: '/admin/dashboard',
  LECTURER: '/lecturer/dashboard',
  STUDENT: '/student/dashboard',
};

export function useCurrentUser() {
  return useQuery<AuthUser | null>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      if (!authStorage.getAccessToken()) {
        try {
          const session = await authService.refreshSession();
          authStorage.setSession(session.accessToken, session.user);
          return session.user;
        } catch {
          authStorage.clearSession();
          return null;
        }
      }
      return authService.me();
    },
    initialData: () => authStorage.getUser(),
  });
}

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LoginRequest) => authService.login(payload),
    onSuccess: (session) => {
      authStorage.setSession(session.accessToken, session.user);
      queryClient.setQueryData(['auth', 'me'], session.user);
      router.replace(roleHome[session.user.role]);
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return async () => {
    try {
      await authService.logout();
    } finally {
      authStorage.clearSession();
      queryClient.clear();
      router.replace('/login');
    }
  };
}
