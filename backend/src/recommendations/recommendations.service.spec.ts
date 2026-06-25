import { NotFoundException } from '@nestjs/common';
import {
  AnalysisResultStatus,
  CatalogStatus,
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

  it('does not return recommendations from an old career goal or specialization in the default list', async () => {
    const recommendations = [
      {
        id: 'recommendation-current',
        studentId: 'student-1',
        analysisResultId: 'analysis-current',
        skillId: 'skill-1',
        recommendationTemplateId: null,
        status: StudentRecommendationStatus.NEW,
        title: 'Current recommendation',
        description: null,
        reason: null,
        priorityScore: 10,
        roadmapPhase: null,
        createdAt: new Date('2026-06-25T08:00:00.000Z'),
        updatedAt: new Date('2026-06-25T08:00:00.000Z'),
        skill: { id: 'skill-1', status: CatalogStatus.ACTIVE },
        recommendationTemplate: null,
        analysisResult: {
          id: 'analysis-current',
          studentId: 'student-1',
          careerGoalId: 'goal-current',
          specializationId: 'spec-current',
          status: AnalysisResultStatus.CURRENT,
        },
        resourceLinks: [],
      },
      {
        id: 'recommendation-old-goal',
        studentId: 'student-1',
        analysisResultId: 'analysis-old-goal',
        skillId: 'skill-1',
        recommendationTemplateId: null,
        status: StudentRecommendationStatus.NEW,
        title: 'Old goal recommendation',
        description: null,
        reason: null,
        priorityScore: 20,
        roadmapPhase: null,
        createdAt: new Date('2026-06-24T08:00:00.000Z'),
        updatedAt: new Date('2026-06-24T08:00:00.000Z'),
        skill: { id: 'skill-1', status: CatalogStatus.ACTIVE },
        recommendationTemplate: null,
        analysisResult: {
          id: 'analysis-old-goal',
          studentId: 'student-1',
          careerGoalId: 'goal-old',
          specializationId: 'spec-current',
          status: AnalysisResultStatus.CURRENT,
        },
        resourceLinks: [],
      },
      {
        id: 'recommendation-old-spec',
        studentId: 'student-1',
        analysisResultId: 'analysis-old-spec',
        skillId: 'skill-1',
        recommendationTemplateId: null,
        status: StudentRecommendationStatus.NEW,
        title: 'Old specialization recommendation',
        description: null,
        reason: null,
        priorityScore: 30,
        roadmapPhase: null,
        createdAt: new Date('2026-06-23T08:00:00.000Z'),
        updatedAt: new Date('2026-06-23T08:00:00.000Z'),
        skill: { id: 'skill-1', status: CatalogStatus.ACTIVE },
        recommendationTemplate: null,
        analysisResult: {
          id: 'analysis-old-spec',
          studentId: 'student-1',
          careerGoalId: 'goal-current',
          specializationId: 'spec-old',
          status: AnalysisResultStatus.CURRENT,
        },
        resourceLinks: [],
      },
    ];
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
          const currentContext = where.AND[1].OR[0].analysisResult;

          return recommendations.filter(
            (recommendation) =>
              recommendation.studentId === where.studentId &&
              where.status.in.includes(recommendation.status) &&
              recommendation.analysisResult.studentId === currentContext.studentId &&
              recommendation.analysisResult.careerGoalId ===
                currentContext.careerGoalId &&
              recommendation.analysisResult.specializationId ===
                currentContext.specializationId &&
              recommendation.analysisResult.status === currentContext.status,
          );
        },
        count: async () => 1,
      },
      studentResourceProgress: {
        findMany: async () => [],
      },
    } as any);

    const result = await service.findMine('user-1', {} as any);

    assert.deepEqual(
      result.data.map((recommendation: any) => recommendation.id),
      ['recommendation-current'],
    );
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

  it('does not list recommendations from OBSOLETE analysis results in the default flow', async () => {
    const recommendations = [
      {
        id: 'recommendation-obsolete',
        studentId: 'student-1',
        analysisResultId: 'analysis-obsolete',
        skillId: 'skill-1',
        recommendationTemplateId: null,
        status: StudentRecommendationStatus.NEW,
        title: 'Old recommendation',
        description: null,
        reason: null,
        priorityScore: 20,
        roadmapPhase: null,
        createdAt: new Date('2026-06-24T08:00:00.000Z'),
        updatedAt: new Date('2026-06-24T08:00:00.000Z'),
        skill: { id: 'skill-1', status: CatalogStatus.ACTIVE },
        recommendationTemplate: null,
        analysisResult: {
          id: 'analysis-obsolete',
          studentId: 'student-1',
          careerGoalId: 'goal-current',
          specializationId: 'spec-current',
          status: AnalysisResultStatus.OBSOLETE,
        },
        resourceLinks: [],
      },
      {
        id: 'recommendation-current',
        studentId: 'student-1',
        analysisResultId: 'analysis-current',
        skillId: 'skill-1',
        recommendationTemplateId: null,
        status: StudentRecommendationStatus.NEW,
        title: 'Current recommendation',
        description: null,
        reason: null,
        priorityScore: 10,
        roadmapPhase: null,
        createdAt: new Date('2026-06-25T08:00:00.000Z'),
        updatedAt: new Date('2026-06-25T08:00:00.000Z'),
        skill: { id: 'skill-1', status: CatalogStatus.ACTIVE },
        recommendationTemplate: null,
        analysisResult: {
          id: 'analysis-current',
          studentId: 'student-1',
          careerGoalId: 'goal-current',
          specializationId: 'spec-current',
          status: AnalysisResultStatus.CURRENT,
        },
        resourceLinks: [],
      },
    ];
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
          assert.equal(
            where.AND[1].OR[0].analysisResult.status,
            AnalysisResultStatus.CURRENT,
          );

          return recommendations.filter(
            (recommendation) =>
              recommendation.analysisResult.status ===
              where.AND[1].OR[0].analysisResult.status,
          );
        },
        count: async () =>
          recommendations.filter(
            (recommendation) =>
              recommendation.analysisResult.status ===
              AnalysisResultStatus.CURRENT,
          ).length,
      },
      studentResourceProgress: {
        findMany: async () => [],
      },
    } as any);

    const result = await service.findMine('user-1', {} as any);

    assert.deepEqual(
      result.data.map((recommendation: any) => recommendation.id),
      ['recommendation-current'],
    );
    assert.equal(result.meta.total, 1);
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

  it('does not let a student update another student recommendation by changing the id', async () => {
    let findWhere: any;
    let updateCalled = false;
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
          findWhere = where;
          return null;
        },
        update: async () => {
          updateCalled = true;
          return {};
        },
      },
    } as any);

    await assert.rejects(
      () =>
        service.updateStatus('user-1', 'recommendation-owned-by-student-2', {
          status: StudentRecommendationStatus.SAVED,
        }),
      NotFoundException,
    );

    assert.equal(findWhere.id, 'recommendation-owned-by-student-2');
    assert.equal(findWhere.studentId, 'student-1');
    assert.equal(updateCalled, false);
  });
});
