import { postData } from '@/lib/request';
import type { SkillType } from '@/types/domain';

export type AssessmentQuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE';

export interface AssessmentStartOption {
  id: string;
  optionText: string;
  orderIndex: number;
}

export interface AssessmentStartQuestion {
  id: string;
  skillId: string;
  skillName: string;
  skillType: SkillType;
  questionText: string;
  questionType: AssessmentQuestionType;
  level: number;
  options: AssessmentStartOption[];
}

export interface AssessmentWarning {
  skillId: string;
  skillName: string;
  message: string;
}

export interface AssessmentStartResponse {
  assessmentId: string;
  careerGoalId: string;
  questions: AssessmentStartQuestion[];
  warnings: AssessmentWarning[];
}

export interface AssessmentAnswerInput {
  questionId: string;
  selectedOptionId: string;
}

export interface AssessmentLevelBreakdown {
  total: number;
  correct: number;
  percentage: number;
}

export interface AssessmentSkillResult {
  skillId: string;
  skillName: string;
  skillType: SkillType;
  calculatedLevel: number;
  totalQuestions: number;
  correctQuestions: number;
  levelBreakdown: Record<string, AssessmentLevelBreakdown>;
}

export interface AssessmentSubmitResponse {
  assessmentId: string;
  status: 'GRADED';
  skillResults: AssessmentSkillResult[];
}

export function startAssessment(careerGoalId: string) {
  return postData<AssessmentStartResponse, { careerGoalId: string }>(
    '/assessments/start',
    { careerGoalId },
  );
}

export function submitAssessment(assessmentId: string, answers: AssessmentAnswerInput[]) {
  return postData<AssessmentSubmitResponse, { answers: AssessmentAnswerInput[] }>(
    `/assessments/${assessmentId}/submit`,
    { answers },
  );
}
