import { getData, getPage, patchData } from '@/lib/request';
import type {
  LearningResource,
  ResourceProgressStatus,
  StudentResourceProgress,
} from '@/types/domain';

export interface UpdateResourceProgressPayload {
  status: ResourceProgressStatus;
  recommendationId?: string;
  note?: string | null;
}

export const learningResourceService = {
  listResources() {
    return getPage<LearningResource>('/learning-resources', {
      limit: 50,
      status: 'ACTIVE',
    });
  },
  getResource(id: string) {
    return getData<LearningResource>(`/learning-resources/${id}`);
  },
  updateProgress(resourceId: string, payload: UpdateResourceProgressPayload) {
    return patchData<StudentResourceProgress, UpdateResourceProgressPayload>(
      `/learning-resources/${resourceId}/progress`,
      payload,
    );
  },
};
