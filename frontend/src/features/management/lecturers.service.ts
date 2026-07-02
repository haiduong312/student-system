import { getData, getPage, patchData, postData } from '@/lib/request';
import type {
  CreateLecturerRequest,
  DeactivateUserResult,
  Lecturer,
  LecturerQueryParams,
  ReactivateUserResult,
  UpdateLecturerRequest,
} from '@/types/management';

export const lecturersService = {
  getLecturers(params: LecturerQueryParams = {}) {
    return getPage<Lecturer>('/lecturers', { ...params });
  },

  getLecturerDetail(id: string) {
    return getData<Lecturer>(`/lecturers/${id}`);
  },

  createLecturer(payload: CreateLecturerRequest) {
    return postData<Lecturer, CreateLecturerRequest>('/lecturers', payload);
  },

  updateLecturer(id: string, payload: UpdateLecturerRequest) {
    return patchData<Lecturer, UpdateLecturerRequest>(`/lecturers/${id}`, payload);
  },

  deactivateLecturer(id: string) {
    return patchData<DeactivateUserResult>(`/lecturers/${id}/deactivate`);
  },

  reactivateLecturer(id: string) {
    return patchData<ReactivateUserResult>(`/lecturers/${id}/reactivate`);
  },
};
