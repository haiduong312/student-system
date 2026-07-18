import { getData, patchData, postData } from '@/lib/request';
import type { Roadmap, RoadmapHistoryItem, RoadmapItemStatus } from '@/types/domain';

export interface GenerateRoadmapPayload {
  archiveCurrentActiveRoadmap: boolean;
  excludedRecommendationIds?: string[];
}

export interface UpdateRoadmapItemStatusPayload {
  status: RoadmapItemStatus;
  note?: string;
}

export const roadmapService = {
  getMyActiveRoadmap() {
    return getData<Roadmap | null>('/roadmaps/me');
  },
  listMyHistory() {
    return getData<RoadmapHistoryItem[]>('/roadmaps/history/me');
  },
  generateMine(payload: GenerateRoadmapPayload = { archiveCurrentActiveRoadmap: true }) {
    return postData<Roadmap, GenerateRoadmapPayload>('/roadmaps/generate/me', payload);
  },
  updateItemStatus(id: string, payload: UpdateRoadmapItemStatusPayload) {
    return patchData<Roadmap, UpdateRoadmapItemStatusPayload>(
      `/roadmaps/items/${id}/status`,
      payload,
    );
  },
};
