import { getData, getPage, postData } from '@/lib/request';
import type {
  AdvisorReview,
  AdvisorReviewQueryParams,
  CreateAdvisorReviewRequest,
} from '@/types/management';

export const advisorReviewsService = {
  createAdvisorReview(studentId: string, payload: CreateAdvisorReviewRequest) {
    return postData<AdvisorReview, CreateAdvisorReviewRequest>(
      `/advisor-reviews/students/${studentId}`,
      payload,
    );
  },

  getReviewsByStudent(studentId: string, params: AdvisorReviewQueryParams = {}) {
    return getPage<AdvisorReview>(`/advisor-reviews/students/${studentId}`, {
      ...params,
      studentId: undefined,
    });
  },

  getAdvisorReviewDetail(id: string) {
    return getData<AdvisorReview>(`/advisor-reviews/${id}`);
  },
};
