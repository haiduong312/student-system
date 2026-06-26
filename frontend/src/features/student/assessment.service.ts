import { postData } from '@/lib/request';
import type {
  AssessmentAnswerInput,
  AssessmentStartResponse,
  AssessmentSubmitResponse,
} from '@/types/domain';

export type {
  AssessmentAnswerInput,
  AssessmentLevelBreakdown,
  AssessmentSkillResult,
  AssessmentStartQuestion,
  AssessmentStartResponse,
  AssessmentSubmitResponse,
} from '@/types/domain';

export function startAssessment() {
  return postData<AssessmentStartResponse, Record<string, never>>('/assessments/start', {});
}

export function submitAssessment(assessmentId: string, answers: AssessmentAnswerInput[]) {
  return postData<AssessmentSubmitResponse, { answers: AssessmentAnswerInput[] }>(
    `/assessments/${assessmentId}/submit`,
    { answers },
  );
}
