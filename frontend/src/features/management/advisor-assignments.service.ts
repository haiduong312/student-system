import { deleteData, getData, getPage, patchData, postData } from '@/lib/request';
import type {
  AdvisorAssignment,
  AdvisorAssignmentQueryParams,
  CreateAdvisorAssignmentRequest,
  DeleteResult,
  UpdateAdvisorAssignmentRequest,
} from '@/types/management';

export const advisorAssignmentsService = {
  getAdvisorAssignments(params: AdvisorAssignmentQueryParams = {}) {
    return getPage<AdvisorAssignment>('/advisor-assignments', { ...params });
  },

  getAdvisorAssignmentDetail(id: string) {
    return getData<AdvisorAssignment>(`/advisor-assignments/${id}`);
  },

  createAdvisorAssignment(payload: CreateAdvisorAssignmentRequest) {
    return postData<AdvisorAssignment, CreateAdvisorAssignmentRequest>(
      '/advisor-assignments',
      payload,
    );
  },

  updateAdvisorAssignment(id: string, payload: UpdateAdvisorAssignmentRequest) {
    return patchData<AdvisorAssignment, UpdateAdvisorAssignmentRequest>(
      `/advisor-assignments/${id}`,
      payload,
    );
  },

  deleteAdvisorAssignment(id: string) {
    return deleteData<DeleteResult>(`/advisor-assignments/${id}`);
  },
};
