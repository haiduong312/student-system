export type UserRole = 'ADMIN' | 'LECTURER' | 'STUDENT';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  lastLoginAt?: string | null;
  student?: unknown;
  lecturer?: unknown;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthUser;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: unknown;
}
