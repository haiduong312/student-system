import { getData, getPage, patchData } from '@/lib/request';
import type {
  DeactivateUserResult,
  ReactivateUserResult,
  ResetPasswordRequest,
  ResetPasswordResult,
  UpdateUserRequest,
  User,
  UserQueryParams,
} from '@/types/management';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export const usersService = {
  getUsers(params: UserQueryParams = {}) {
    const { page = DEFAULT_PAGE, limit = DEFAULT_PAGE_SIZE, ...filters } = params;
    return getPage<User>('/users', { page, limit, ...filters });
  },

  getUserDetail(id: string) {
    return getData<User>(`/users/${id}`);
  },

  updateUser(id: string, payload: UpdateUserRequest) {
    return patchData<User, UpdateUserRequest>(`/users/${id}`, payload);
  },

  deactivateUser(id: string) {
    return patchData<DeactivateUserResult>(`/users/${id}/deactivate`);
  },

  reactivateUser(id: string) {
    return patchData<ReactivateUserResult>(`/users/${id}/reactivate`);
  },

  resetPassword(id: string, payload: ResetPasswordRequest) {
    return patchData<ResetPasswordResult, ResetPasswordRequest>(
      `/users/${id}/reset-password`,
      payload,
    );
  },
};
