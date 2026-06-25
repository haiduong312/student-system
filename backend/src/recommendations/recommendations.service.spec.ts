import {
  AnalysisResultStatus,
  StudentRecommendationStatus,
  TemplateStatus,
} from '@prisma/client';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { RecommendationsService } from './recommendations.service';

describe('RecommendationsService analysis lifecycle scope', () => {
  it('lists only recommendations from the current profile context', async () => {
    let whereArg: any;
    const service = new RecommendationsService({
      student: {
        findUnique: async () => ({
          id: 'student-1',
          profile: {
            careerGoalId: 'goal-current',
            specializationId: 'spec-current',
          },
        }),
      },
      studentRecommendation: {
        findMany: async ({ where }: any) => {
          whereArg = where;
          return [];
        },
        count: async () => 0,
      },
    } as any);

    await service.findMine('user-1', {} as any);

    assert.deepEqual(whereArg.studentId, 'student-1');
    assert.deepEqual(whereArg.status, {
      in: [
        StudentRecommendationStatus.NEW,
        StudentRecommendationStatus.SAVED,
        StudentRecommendationStatus.IN_PROGRESS,
        StudentRecommendationStatus.DONE,
      ],
    });
    assert.deepEqual(whereArg.AND[1], {
      OR: [
        {
          analysisResult: {
            studentId: 'student-1',
            careerGoalId: 'goal-current',
            specializationId: 'spec-current',
            status: AnalysisResultStatus.CURRENT,
          },
        },
        {
          analysisResultId: null,
          recommendationTemplate: {
            status: TemplateStatus.ACTIVE,
            careerGoalId: 'goal-current',
            OR: [
              { specializationId: 'spec-current' },
              { specializationId: null },
            ],
          },
        },
      ],
    });
  });

  it('does not return dismissed recommendations in the default list', async () => {
    let whereArg: any;
    const service = new RecommendationsService({
      student: {
        findUnique: async () => ({
          id: 'student-1',
          profile: {
            careerGoalId: 'goal-current',
            specializationId: null,
          },
        }),
      },
      studentRecommendation: {
        findMany: async ({ where }: any) => {
          whereArg = where;
          return [];
        },
        count: async () => 0,
      },
    } as any);

    await service.findMine('user-1', {} as any);

    assert.equal(
      whereArg.status.in.includes(StudentRecommendationStatus.DISMISSED),
      false,
    );
  });

  it('returns an empty default list when the student has no current career goal', async () => {
    const service = new RecommendationsService({
      student: {
        findUnique: async () => ({
          id: 'student-1',
          profile: {
            careerGoalId: null,
            specializationId: null,
          },
        }),
      },
      studentRecommendation: {
        findMany: async () => {
          throw new Error('recommendation query should not run');
        },
      },
    } as any);

    const result = await service.findMine('user-1', {} as any);

    assert.equal(result.meta.total, 0);
    assert.deepEqual(result.data, []);
  });

  it('does not update recommendations from obsolete analysis results', async () => {
    let whereArg: any;
    const service = new RecommendationsService({
      student: {
        findUnique: async () => ({
          id: 'student-1',
          profile: {
            careerGoalId: 'goal-current',
            specializationId: 'spec-current',
          },
        }),
      },
      studentRecommendation: {
        findFirst: async ({ where }: any) => {
          whereArg = where;
          return null;
        },
      },
    } as any);

    await assert.rejects(
      () =>
        service.updateStatus('user-1', 'recommendation-1', {
          status: 'SAVED' as any,
        }),
      /Recommendation not found/,
    );

    assert.deepEqual(whereArg.AND[1], {
      OR: [
        {
          analysisResult: {
            studentId: 'student-1',
            careerGoalId: 'goal-current',
            specializationId: 'spec-current',
            status: AnalysisResultStatus.CURRENT,
          },
        },
        {
          analysisResultId: null,
          recommendationTemplate: {
            status: TemplateStatus.ACTIVE,
            careerGoalId: 'goal-current',
            OR: [
              { specializationId: 'spec-current' },
              { specializationId: null },
            ],
          },
        },
      ],
    });
  });
});
