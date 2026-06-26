import { deleteData, getPage, patchData, postData } from '@/lib/request';
import type {
  AssessmentQuestion,
  QuestionStatus,
  QuestionType,
  Skill,
  SkillType,
} from '@/types/domain';

export interface AssessmentQuestionOptionPayload {
  optionText: string;
  isCorrect: boolean;
  orderIndex?: number;
}

export interface AssessmentQuestionPayload {
  skillId: string;
  questionText: string;
  questionType: QuestionType;
  level: number;
  explanation?: string | null;
  status?: QuestionStatus;
  options: AssessmentQuestionOptionPayload[];
}

export interface AssessmentQuestionFilters {
  search?: string;
  skillId?: string;
  skillType?: SkillType;
  level?: number;
  status?: QuestionStatus;
  questionType?: QuestionType;
}

export const assessmentQuestionService = {
  listQuestions(filters: AssessmentQuestionFilters) {
    return getPage<AssessmentQuestion>('/assessment-questions', {
      limit: 50,
      ...filters,
    });
  },
  listSkills() {
    return getPage<Skill>('/skills', { limit: 200, status: 'ACTIVE' });
  },
  saveQuestion(payload: AssessmentQuestionPayload, id?: string) {
    return id
      ? patchData<AssessmentQuestion, AssessmentQuestionPayload>(
          `/assessment-questions/${id}`,
          payload,
        )
      : postData<AssessmentQuestion, AssessmentQuestionPayload>(
          '/assessment-questions',
          payload,
        );
  },
  deleteQuestion(id: string) {
    return deleteData<{ deleted: boolean }>(`/assessment-questions/${id}`);
  },
};
