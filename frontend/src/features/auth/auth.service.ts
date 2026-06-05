import { api } from '@/lib/api';
import type { ApiResponse, AuthUser, LoginRequest, LoginResponse } from '@/types/auth';

export const authService = {
  async login(payload: LoginRequest) {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', payload);
    return response.data.data;
  },
  async me() {
    const response = await api.get<ApiResponse<AuthUser>>('/auth/me');
    return response.data.data;
  },
  async logout() {
    await api.post('/auth/logout');
  },
};
