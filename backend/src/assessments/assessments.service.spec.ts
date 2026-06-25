import { BadRequestException } from '@nestjs/common';
import {
  AssessmentStatus,
  CatalogStatus,
  QuestionStatus,
  QuestionType,
  SkillType,
} from '@prisma/client';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AssessmentsService } from './assessments.service';

const activeProfile = (specializationId: string | null) => ({
  id: 'student-1',
  profile: {
    careerGoalId: 'goal-1',
    specializationId,
    careerGoal: {
      id: 'goal-1',
      status: CatalogStatus.ACTIVE,
    },
    specialization: specializationId
      ? {
          id: specializationId,
          careerGoalId: 'goal-1',
          status: CatalogStatus.ACTIVE,
        }
      : null,
  },
});

describe('AssessmentsService specialization scope', () => {
  it('stores specializationId when starting an assessment', async () => {
    const startedAt = new Date('2026-06-25T08:00:00.000Z');
    let createdAssessmentData: any;

    const prisma = {
      student: {
        findUnique: async () => activeProfile('frontend-1'),
      },
      assessment: {
        findFirst: async () => null,
        count: async () => 0,
      },
      careerRequiredSkill: {
        findMany: async () => [
          {
            skillId: 'skill-1',
            requiredLevel: 1,
            learningOrder: 1,
            specializationId: 'frontend-1',
            skill: {
              id: 'skill-1',
              name: 'React',
              type: SkillType.CAREER_SPECIFIC,
            },
          },
        ],
      },
      assessmentQuestion: {
        findMany: async () => [
          {
            id: 'question-1',
            skillId: 'skill-1',
            questionText: 'React question',
            questionType: QuestionType.SINGLE_CHOICE,
            level: 1,
            status: QuestionStatus.ACTIVE,
            explanation: null,
            createdAt: startedAt,
            updatedAt: startedAt,
            options: [
              {
                id: 'option-1',
                questionId: 'question-1',
                optionText: 'A',
                isCorrect: true,
                orderIndex: 1,
                createdAt: startedAt,
                updatedAt: startedAt,
              },
              {
                id: 'option-2',
                questionId: 'question-1',
                optionText: 'B',
                isCorrect: false,
                orderIndex: 2,
                createdAt: startedAt,
                updatedAt: startedAt,
              },
            ],
          },
        ],
      },
      $transaction: async (callback: any) =>
        callback({
          assessment: {
            create: async (args: any) => {
              createdAssessmentData = args.data;
              return {
                id: 'assessment-1',
                careerGoalId: args.data.careerGoalId,
                specializationId: args.data.specializationId,
                startedAt,
              };
            },
          },
        }),
    };
    const service = new AssessmentsService(prisma as any);

    const result = await service.startAssessment('user-1', {});

    assert.equal(createdAssessmentData.studentId, 'student-1');
    assert.equal(createdAssessmentData.careerGoalId, 'goal-1');
    assert.equal(createdAssessmentData.specializationId, 'frontend-1');
    assert.equal(createdAssessmentData.status, AssessmentStatus.IN_PROGRESS);
    assert.equal(result.specializationId, 'frontend-1');
  });

  it('scopes active attempts, attempt count, and cooldown by specializationId', async () => {
    const findFirstWheres: any[] = [];
    let countWhere: any;
    const service = new AssessmentsService({
      assessment: {
        findFirst: async ({ where }: any) => {
          findFirstWheres.push(where);
          if (
            where.status === AssessmentStatus.IN_PROGRESS &&
            where.specializationId !== 'backend-1'
          ) {
            return {
              id: 'frontend-active-assessment',
              startedAt: new Date(),
            };
          }

          return null;
        },
        count: async ({ where }: any) => {
          countWhere = where;
          return where.specializationId === 'backend-1' ? 0 : 3;
        },
      },
    } as any);

    await (service as any).assertCanStartAssessment({
      studentId: 'student-1',
      careerGoalId: 'goal-1',
      specializationId: 'backend-1',
    });

    assert.equal(findFirstWheres[0].specializationId, 'backend-1');
    assert.equal(countWhere.specializationId, 'backend-1');
    assert.equal(findFirstWheres[1].specializationId, 'backend-1');
  });

  it('keeps null specialization as its own assessment scope', async () => {
    let countWhere: any;
    const service = new AssessmentsService({
      assessment: {
        findFirst: async () => null,
        count: async ({ where }: any) => {
          countWhere = where;
          return 0;
        },
      },
    } as any);

    await (service as any).assertCanStartAssessment({
      studentId: 'student-1',
      careerGoalId: 'goal-1',
      specializationId: null,
    });

    assert.equal(countWhere.specializationId, null);
  });

  it('rejects submitting an assessment from a previous specialization', async () => {
    const service = new AssessmentsService({
      student: {
        findUnique: async () => activeProfile('backend-1'),
      },
      $transaction: async (callback: any) =>
        callback({
          assessment: {
            findUnique: async () => ({
              id: 'assessment-1',
              studentId: 'student-1',
              careerGoalId: 'goal-1',
              specializationId: 'frontend-1',
              status: AssessmentStatus.IN_PROGRESS,
              startedAt: new Date(),
              items: [],
            }),
          },
        }),
    } as any);

    await assert.rejects(
      () =>
        service.submitAssessment('user-1', 'assessment-1', {
          answers: [{ questionId: 'question-1', selectedOptionId: 'option-1' }],
        }),
      BadRequestException,
    );
  });
});
