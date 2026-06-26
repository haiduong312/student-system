import { getPage, postData } from '@/lib/request';
import type { AnalysisHistoryItem, CompetencyAnalysis } from '@/types/domain';

export const analysisService = {
  analyzeMine() {
    return postData<CompetencyAnalysis>('/competency/analyze/me', {});
  },
  listMyHistory() {
    return getPage<AnalysisHistoryItem>('/competency/analysis-history/me', {
      limit: 20,
      sortOrder: 'desc',
    });
  },
};
