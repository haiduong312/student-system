import { getPage, patchData } from '@/lib/request';
import type { Recommendation, StudentRecommendationStatus } from '@/types/domain';

export interface RecommendationListParams {
  status?: StudentRecommendationStatus;
  limit?: number;
}

export const recommendationService = {
  listMine(params: RecommendationListParams = {}) {
    return getPage<Recommendation>('/recommendations/me', {
      limit: params.limit ?? 50,
      ...(params.status ? { status: params.status } : {}),
    });
  },
  updateStatus(id: string, status: StudentRecommendationStatus) {
    return patchData<Recommendation, { status: StudentRecommendationStatus }>(
      `/recommendations/${id}/status`,
      { status },
    );
  },
};
