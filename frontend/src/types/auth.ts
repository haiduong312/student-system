export type UserRole = 'ADMIN' | 'LECTURER' | 'STUDENT';
export type UserStatus = 'ACTIVE' | 'LOCKED' | 'INACTIVE';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
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
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthUser;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: unknown;
}
