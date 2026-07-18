import { getPage } from '@/lib/request';
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
};
