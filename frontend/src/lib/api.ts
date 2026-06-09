import axios from 'axios';
import { authStorage } from './storage';
import type { ApiResponse, LoginResponse } from '@/types/auth';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api',
  timeout: 15000,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = authStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest?._retry ||
      originalRequest?.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    try {
      const response = await axios.post<ApiResponse<LoginResponse>>(
        `${api.defaults.baseURL}/auth/refresh`,
        undefined,
        { withCredentials: true },
      );
      const session = response.data.data;
      authStorage.setSession(session.accessToken, session.user);
      originalRequest.headers.Authorization = `Bearer ${session.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      authStorage.clearSession();
      return Promise.reject(refreshError);
    }
  },
);
