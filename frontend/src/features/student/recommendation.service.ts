import { getPage, patchData } from '@/lib/request';
import type { Recommendation, StudentRecommendationStatus } from '@/types/domain';

export const recommendationService = {
  listMine() {
    return getPage<Recommendation>('/recommendations/me', { limit: 50 });
  },
  updateStatus(id: string, status: StudentRecommendationStatus) {
    return patchData<Recommendation, { status: StudentRecommendationStatus }>(
      `/recommendations/${id}/status`,
      { status },
    );
  },
};
