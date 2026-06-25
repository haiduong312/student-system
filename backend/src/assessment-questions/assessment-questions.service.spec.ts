import { QuestionStatus, QuestionType } from '@prisma/client';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AssessmentQuestionsService } from './assessment-questions.service';

describe('AssessmentQuestionsService catalog invalidation', () => {
  it('cancels in-progress assessments that contain a deactivated question', async () => {
    const question = {
      id: 'question-1',
      skillId: 'skill-1',
      questionText: 'JS?',
      questionType: QuestionType.SINGLE_CHOICE,
      level: 1,
      explanation: null,
      status: QuestionStatus.ACTIVE,
      skill: null,
      options: [],
    };
    const tx = {
      assessmentQuestion: {
        update: async () => ({
          ...question,
          status: QuestionStatus.INACTIVE,
        }),
      },
    };
    let cancelledQuestionId: string | null = null;
    const service = new AssessmentQuestionsService(
      {
        assessmentQuestion: {
          findUnique: async () => question,
        },
        $transaction: async (callback: (tx: any) => Promise<unknown>) =>
          callback(tx),
      } as any,
      { record: async () => undefined } as any,
      {
        cancelInProgressAssessmentsUsingQuestion: async (
          txArg: any,
          questionId: string,
        ) => {
          assert.equal(txArg, tx);
          cancelledQuestionId = questionId;
        },
      } as any,
    );

    await service.remove('question-1');

    assert.equal(cancelledQuestionId, 'question-1');
  });
});
