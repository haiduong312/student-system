import { getData, getPage, postData } from '@/lib/request';
import type {
  AnalysisHistoryItem,
  AnalysisResultDetail,
  CompetencyAnalysis,
} from '@/types/domain';

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
  getResult(id: string) {
    return getData<AnalysisResultDetail>(`/competency/analysis-results/${id}`);
  },
};
