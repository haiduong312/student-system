import { getPage, patchData } from '@/lib/request';
import { openPrivateFile } from '@/lib/private-files';
import type { Evidence } from '@/types/domain';

export const evidenceService = {
  listMine() {
    return getPage<Evidence>('/evidences/me', { limit: 50 });
  },
  listPending() {
    return getPage<Evidence>('/evidences/pending', { limit: 50 });
  },
  verify(id: string, currentLevel?: number) {
    return patchData<Evidence, { currentLevel?: number }>(
      `/evidences/${id}/verify`,
      currentLevel === undefined ? {} : { currentLevel },
    );
  },
  reject(id: string, reviewerNote: string) {
    return patchData<Evidence, { reviewerNote: string }>(`/evidences/${id}/reject`, {
      reviewerNote,
    });
  },
  openPrivateFile,
};
