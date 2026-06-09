import type { AuthUser } from '@/types/auth';

const USER_KEY = 'student_system_user';
const LEGACY_ACCESS_TOKEN_KEY = 'student_system_access_token';
const LEGACY_REFRESH_TOKEN_KEY = 'student_system_refresh_token';
let accessToken: string | null = null;

export const authStorage = {
  getAccessToken() {
    return accessToken;
  },
  getUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  },
  setSession(nextAccessToken: string, user: AuthUser) {
    accessToken = nextAccessToken;
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clearSession() {
    accessToken = null;
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  },
};
