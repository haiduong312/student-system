import { api } from './api';
import type { ApiResponse } from '@/types/auth';
import type { Paginated } from '@/types/domain';

export async function getData<T>(url: string, params?: Record<string, unknown>) {
  const response = await api.get<ApiResponse<T>>(url, { params });
  return response.data.data;
}

export async function getPage<T>(url: string, params?: Record<string, unknown>) {
  const response = await api.get<Paginated<T>>(url, { params });
  return response.data;
}

export async function postData<T, B = unknown>(url: string, body?: B) {
  const response = await api.post<ApiResponse<T>>(url, body);
  return response.data.data;
}

export async function patchData<T, B = unknown>(url: string, body?: B) {
  const response = await api.patch<ApiResponse<T>>(url, body);
  return response.data.data;
}

export async function deleteData<T>(url: string) {
  const response = await api.delete<ApiResponse<T>>(url);
  return response.data.data;
}
