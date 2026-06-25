import { NotFoundException } from '@nestjs/common';
import {
  AnalysisResultStatus,
  AssessmentStatus,
  CatalogStatus,
  RoadmapStatus,
  StudentRecommendationStatus,
} from '@prisma/client';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ProfilesService } from './profiles.service';

type ProfileContextStore = {
  profile: {
    studentId: string;
    careerGoalId: string | null;
    specializationId: string | null;
    completionPercent: number;
    matchPercent: number;
    riskScore: number;
    lastAnalyzedAt: Date | null;
    summary?: string | null;
  };
  roadmaps: Array<{
    id: string;
    studentId: string;
    careerGoalId: string;
    specializationId: string | null;
    status: RoadmapStatus;
  }>;
  assessments: Array<{
    id: string;
    studentId: string;
    careerGoalId: string;
    specializationId: string | null;
    status: AssessmentStatus;
  }>;
  analyses: Array<{
    id: string;
    studentId: string;
    careerGoalId: string;
    specializationId: string | null;
    status: AnalysisResultStatus;
  }>;
  recommendations: Array<{
    id: string;
    studentId: string;
    analysisResultId: string;
    status: StudentRecommendationStatus;
  }>;
};

function cloneStore(store: ProfileContextStore): ProfileContextStore {
  return {
    profile: { ...store.profile },
    roadmaps: store.roadmaps.map((item) => ({ ...item })),
    assessments: store.assessments.map((item) => ({ ...item })),
    analyses: store.analyses.map((item) => ({ ...item })),
    recommendations: store.recommendations.map((item) => ({ ...item })),
  };
}

function replaceStore(target: ProfileContextStore, source: ProfileContextStore) {
  target.profile = source.profile;
  target.roadmaps = source.roadmaps;
  target.assessments = source.assessments;
  target.analyses = source.analyses;
  target.recommendations = source.recommendations;
}

function matchesCurrentScope(
  item: { careerGoalId: string; specializationId: string | null },
  scope?: { careerGoalId: string; specializationId: string | null },
) {
  return (
    scope &&
    item.careerGoalId === scope.careerGoalId &&
    (item.specializationId ?? null) === scope.specializationId
  );
}

function createProfileContextPrisma(
  store: ProfileContextStore,
  options: { failDuringInvalidation?: boolean } = {},
) {
  const invalidationCalls = {
    roadmaps: 0,
    assessments: 0,
    analyses: 0,
    recommendations: 0,
  };
  const careerGoals = new Map([
    ['goal-old', { id: 'goal-old', status: CatalogStatus.ACTIVE }],
    ['goal-new', { id: 'goal-new', status: CatalogStatus.ACTIVE }],
  ]);
  const specializations = new Map([
    [
      'spec-old',
      {
        id: 'spec-old',
        careerGoalId: 'goal-old',
        status: CatalogStatus.ACTIVE,
      },
    ],
    [
      'spec-a',
      {
        id: 'spec-a',
        careerGoalId: 'goal-old',
        status: CatalogStatus.ACTIVE,
      },
    ],
    [
      'spec-b',
      {
        id: 'spec-b',
        careerGoalId: 'goal-old',
        status: CatalogStatus.ACTIVE,
      },
    ],
  ]);

  const staleScope = (where: any) => where.NOT;
  const isStale = (
    item: { careerGoalId: string; specializationId: string | null },
    where: any,
  ) => !matchesCurrentScope(item, staleScope(where));

  const createTx = (draft: ProfileContextStore) => ({
    studentProfile: {
      upsert: async ({ create, update }: any) => {
        draft.profile = {
          ...draft.profile,
          ...(draft.profile ? update : create),
        };
        return {
          ...draft.profile,
          careerGoal: draft.profile.careerGoalId
            ? careerGoals.get(draft.profile.careerGoalId)
            : null,
          specialization: draft.profile.specializationId
            ? specializations.get(draft.profile.specializationId)
            : null,
        };
      },
    },
    developmentRoadmap: {
      updateMany: async ({ where, data }: any) => {
        invalidationCalls.roadmaps += 1;
        if (options.failDuringInvalidation) {
          throw new Error('archive failed');
        }
        let count = 0;
        for (const roadmap of draft.roadmaps) {
          if (
            roadmap.studentId === where.studentId &&
            roadmap.status === where.status &&
            isStale(roadmap, where)
          ) {
            roadmap.status = data.status;
            count += 1;
          }
        }
        return { count };
      },
    },
    assessment: {
      updateMany: async ({ where, data }: any) => {
        invalidationCalls.assessments += 1;
        let count = 0;
        for (const assessment of draft.assessments) {
          if (
            assessment.studentId === where.studentId &&
            assessment.status === where.status &&
            isStale(assessment, where)
          ) {
            assessment.status = data.status;
            count += 1;
          }
        }
        return { count };
      },
    },
    competencyAnalysisResult: {
      updateMany: async ({ where, data }: any) => {
        invalidationCalls.analyses += 1;
        let count = 0;
        for (const analysis of draft.analyses) {
          if (
            analysis.studentId === where.studentId &&
            analysis.status === where.status &&
            isStale(analysis, where)
          ) {
            analysis.status = data.status;
            count += 1;
          }
        }
        return { count };
      },
      findMany: async ({ where }: any) =>
        draft.analyses
          .filter(
            (analysis) =>
              analysis.studentId === where.studentId && isStale(analysis, where),
          )
          .map((analysis) => ({ id: analysis.id })),
    },
    studentRecommendation: {
      updateMany: async ({ where, data }: any) => {
        invalidationCalls.recommendations += 1;
        let count = 0;
        for (const recommendation of draft.recommendations) {
          if (
            recommendation.studentId === where.studentId &&
            where.analysisResultId.in.includes(recommendation.analysisResultId) &&
            where.status.in.includes(recommendation.status)
          ) {
            recommendation.status = data.status;
            count += 1;
          }
        }
        return { count };
      },
    },
  });

  return {
    invalidationCalls,
    prisma: {
      student: {
        findUnique: async () => ({ id: store.profile.studentId }),
      },
      studentProfile: {
        findUnique: async () => ({
          careerGoalId: store.profile.careerGoalId,
          specializationId: store.profile.specializationId,
        }),
      },
      careerGoal: {
        findUnique: async ({ where }: any) => careerGoals.get(where.id) ?? null,
      },
      specialization: {
        findUnique: async ({ where }: any) =>
          specializations.get(where.id) ?? null,
      },
      $transaction: async (callback: (tx: any) => Promise<unknown>) => {
        const draft = cloneStore(store);
        const result = await callback(createTx(draft));
        replaceStore(store, draft);
        return result;
      },
    },
  };
}

describe('ProfilesService assessment scope invalidation', () => {
  it('cancels only in-progress assessments outside the next profile scope', async () => {
    let updateManyArgs: any;
    const service = new ProfilesService({} as any, {} as any);
    const tx = {
      assessment: {
        updateMany: async (args: any) => {
          updateManyArgs = args;
          return { count: 1 };
        },
      },
    };

    await (service as any).cancelStaleInProgressAssessments(
      tx,
      'student-1',
      {
        nextCareerGoalId: 'goal-1',
        nextSpecializationId: 'backend-1',
      },
    );

    assert.deepEqual(updateManyArgs.where, {
      studentId: 'student-1',
      status: AssessmentStatus.IN_PROGRESS,
      NOT: {
        careerGoalId: 'goal-1',
        specializationId: 'backend-1',
      },
    });
    assert.deepEqual(updateManyArgs.data, {
      status: AssessmentStatus.CANCELLED,
    });
  });

  it('marks current analyses outside the next profile scope as obsolete', async () => {
    let updateManyArgs: any;
    const service = new ProfilesService({} as any, {} as any);
    const tx = {
      competencyAnalysisResult: {
        updateMany: async (args: any) => {
          updateManyArgs = args;
          return { count: 1 };
        },
      },
    };

    await (service as any).markStaleAnalysesObsolete(tx, 'student-1', {
      nextCareerGoalId: 'goal-1',
      nextSpecializationId: 'backend-1',
    });

    assert.deepEqual(updateManyArgs.where, {
      studentId: 'student-1',
      status: AnalysisResultStatus.CURRENT,
      NOT: {
        careerGoalId: 'goal-1',
        specializationId: 'backend-1',
      },
    });
    assert.deepEqual(updateManyArgs.data, {
      status: AnalysisResultStatus.OBSOLETE,
    });
  });
});

describe('ProfilesService resource ownership', () => {
  it('does not let a student update another student project by changing the project id', async () => {
    let updateCalled = false;
    const service = new ProfilesService(
      {
        student: {
          findUnique: async ({ where }: any) =>
            where.userId === 'user-1' ? { id: 'student-1' } : null,
        },
        studentProject: {
          findFirst: async ({ where }: any) => {
            assert.deepEqual(where, {
              id: 'project-owned-by-student-2',
              studentId: 'student-1',
            });
            return null;
          },
          update: async () => {
            updateCalled = true;
            return {};
          },
        },
      } as any,
      {} as any,
    );

    await assert.rejects(
      () =>
        service.updateProject('user-1', 'project-owned-by-student-2', {
          name: 'Tampered project',
        } as any),
      NotFoundException,
    );
    assert.equal(updateCalled, false);
  });
});

describe('ProfilesService profile context change invalidation', () => {
  it('invalidates old assessment, analysis, recommendation, and roadmap data when the student changes career goal', async () => {
    const store: ProfileContextStore = {
      profile: {
        studentId: 'student-1',
        careerGoalId: 'goal-old',
        specializationId: 'spec-old',
        completionPercent: 80,
        matchPercent: 70,
        riskScore: 10,
        lastAnalyzedAt: new Date('2026-06-20T00:00:00.000Z'),
      },
      roadmaps: [
        {
          id: 'roadmap-old',
          studentId: 'student-1',
          careerGoalId: 'goal-old',
          specializationId: 'spec-old',
          status: RoadmapStatus.ACTIVE,
        },
        {
          id: 'roadmap-new',
          studentId: 'student-1',
          careerGoalId: 'goal-new',
          specializationId: null,
          status: RoadmapStatus.ACTIVE,
        },
      ],
      assessments: [
        {
          id: 'assessment-old',
          studentId: 'student-1',
          careerGoalId: 'goal-old',
          specializationId: 'spec-old',
          status: AssessmentStatus.IN_PROGRESS,
        },
        {
          id: 'assessment-new',
          studentId: 'student-1',
          careerGoalId: 'goal-new',
          specializationId: null,
          status: AssessmentStatus.IN_PROGRESS,
        },
      ],
      analyses: [
        {
          id: 'analysis-old',
          studentId: 'student-1',
          careerGoalId: 'goal-old',
          specializationId: 'spec-old',
          status: AnalysisResultStatus.CURRENT,
        },
        {
          id: 'analysis-new',
          studentId: 'student-1',
          careerGoalId: 'goal-new',
          specializationId: null,
          status: AnalysisResultStatus.CURRENT,
        },
      ],
      recommendations: [
        {
          id: 'recommendation-old',
          studentId: 'student-1',
          analysisResultId: 'analysis-old',
          status: StudentRecommendationStatus.IN_PROGRESS,
        },
        {
          id: 'recommendation-new',
          studentId: 'student-1',
          analysisResultId: 'analysis-new',
          status: StudentRecommendationStatus.SAVED,
        },
      ],
    };
    const { prisma } = createProfileContextPrisma(store);
    const service = new ProfilesService(prisma as any, {} as any);

    await service.updateProfile('student-1', {
      careerGoalId: 'goal-new',
      specializationId: null,
    });

    assert.equal(store.profile.careerGoalId, 'goal-new');
    assert.equal(store.profile.specializationId, null);
    assert.equal(store.profile.completionPercent, 0);
    assert.equal(store.profile.matchPercent, 0);
    assert.equal(store.profile.riskScore, 0);
    assert.equal(store.profile.lastAnalyzedAt, null);
    assert.equal(store.roadmaps[0].status, RoadmapStatus.ARCHIVED);
    assert.equal(store.roadmaps[1].status, RoadmapStatus.ACTIVE);
    assert.equal(store.assessments[0].status, AssessmentStatus.CANCELLED);
    assert.equal(store.assessments[1].status, AssessmentStatus.IN_PROGRESS);
    assert.equal(store.analyses[0].status, AnalysisResultStatus.OBSOLETE);
    assert.equal(store.analyses[1].status, AnalysisResultStatus.CURRENT);
    assert.equal(
      store.recommendations[0].status,
      StudentRecommendationStatus.DISMISSED,
    );
    assert.equal(
      store.recommendations[1].status,
      StudentRecommendationStatus.SAVED,
    );
  });

  it('invalidates the old specialization scope when the student changes specialization within the same career goal', async () => {
    const store: ProfileContextStore = {
      profile: {
        studentId: 'student-1',
        careerGoalId: 'goal-old',
        specializationId: 'spec-a',
        completionPercent: 70,
        matchPercent: 60,
        riskScore: 15,
        lastAnalyzedAt: new Date('2026-06-20T00:00:00.000Z'),
      },
      roadmaps: [
        {
          id: 'roadmap-spec-a',
          studentId: 'student-1',
          careerGoalId: 'goal-old',
          specializationId: 'spec-a',
          status: RoadmapStatus.ACTIVE,
        },
        {
          id: 'roadmap-spec-b',
          studentId: 'student-1',
          careerGoalId: 'goal-old',
          specializationId: 'spec-b',
          status: RoadmapStatus.ACTIVE,
        },
      ],
      assessments: [
        {
          id: 'assessment-spec-a',
          studentId: 'student-1',
          careerGoalId: 'goal-old',
          specializationId: 'spec-a',
          status: AssessmentStatus.IN_PROGRESS,
        },
        {
          id: 'assessment-spec-b',
          studentId: 'student-1',
          careerGoalId: 'goal-old',
          specializationId: 'spec-b',
          status: AssessmentStatus.IN_PROGRESS,
        },
      ],
      analyses: [
        {
          id: 'analysis-spec-a',
          studentId: 'student-1',
          careerGoalId: 'goal-old',
          specializationId: 'spec-a',
          status: AnalysisResultStatus.CURRENT,
        },
        {
          id: 'analysis-spec-b',
          studentId: 'student-1',
          careerGoalId: 'goal-old',
          specializationId: 'spec-b',
          status: AnalysisResultStatus.CURRENT,
        },
      ],
      recommendations: [
        {
          id: 'recommendation-spec-a',
          studentId: 'student-1',
          analysisResultId: 'analysis-spec-a',
          status: StudentRecommendationStatus.NEW,
        },
        {
          id: 'recommendation-spec-b',
          studentId: 'student-1',
          analysisResultId: 'analysis-spec-b',
          status: StudentRecommendationStatus.SAVED,
        },
      ],
    };
    const { prisma } = createProfileContextPrisma(store);
    const service = new ProfilesService(prisma as any, {} as any);

    await service.updateProfile('student-1', {
      careerGoalId: 'goal-old',
      specializationId: 'spec-b',
    });

    assert.equal(store.profile.careerGoalId, 'goal-old');
    assert.equal(store.profile.specializationId, 'spec-b');
    assert.equal(store.roadmaps[0].status, RoadmapStatus.ARCHIVED);
    assert.equal(store.roadmaps[1].status, RoadmapStatus.ACTIVE);
    assert.equal(store.assessments[0].status, AssessmentStatus.CANCELLED);
    assert.equal(store.assessments[1].status, AssessmentStatus.IN_PROGRESS);
    assert.equal(store.analyses[0].status, AnalysisResultStatus.OBSOLETE);
    assert.equal(store.analyses[1].status, AnalysisResultStatus.CURRENT);
    assert.equal(
      store.recommendations[0].status,
      StudentRecommendationStatus.DISMISSED,
    );
    assert.equal(
      store.recommendations[1].status,
      StudentRecommendationStatus.SAVED,
    );
  });

  it('does not invalidate dependent data when goal and specialization do not change', async () => {
    const store: ProfileContextStore = {
      profile: {
        studentId: 'student-1',
        careerGoalId: 'goal-old',
        specializationId: 'spec-a',
        completionPercent: 70,
        matchPercent: 60,
        riskScore: 15,
        lastAnalyzedAt: new Date('2026-06-20T00:00:00.000Z'),
      },
      roadmaps: [
        {
          id: 'roadmap-spec-a',
          studentId: 'student-1',
          careerGoalId: 'goal-old',
          specializationId: 'spec-a',
          status: RoadmapStatus.ACTIVE,
        },
      ],
      assessments: [
        {
          id: 'assessment-spec-a',
          studentId: 'student-1',
          careerGoalId: 'goal-old',
          specializationId: 'spec-a',
          status: AssessmentStatus.IN_PROGRESS,
        },
      ],
      analyses: [
        {
          id: 'analysis-spec-a',
          studentId: 'student-1',
          careerGoalId: 'goal-old',
          specializationId: 'spec-a',
          status: AnalysisResultStatus.CURRENT,
        },
      ],
      recommendations: [
        {
          id: 'recommendation-spec-a',
          studentId: 'student-1',
          analysisResultId: 'analysis-spec-a',
          status: StudentRecommendationStatus.SAVED,
        },
      ],
    };
    const { prisma, invalidationCalls } = createProfileContextPrisma(store);
    const service = new ProfilesService(prisma as any, {} as any);

    await service.updateProfile('student-1', {
      careerGoalId: 'goal-old',
      specializationId: 'spec-a',
      summary: 'Updated summary only',
    });

    assert.deepEqual(invalidationCalls, {
      roadmaps: 0,
      assessments: 0,
      analyses: 0,
      recommendations: 0,
    });
    assert.equal(store.profile.summary, 'Updated summary only');
    assert.equal(store.profile.completionPercent, 70);
    assert.equal(store.profile.matchPercent, 60);
    assert.equal(store.profile.riskScore, 15);
    assert.equal(store.roadmaps[0].status, RoadmapStatus.ACTIVE);
    assert.equal(store.assessments[0].status, AssessmentStatus.IN_PROGRESS);
    assert.equal(store.analyses[0].status, AnalysisResultStatus.CURRENT);
    assert.equal(
      store.recommendations[0].status,
      StudentRecommendationStatus.SAVED,
    );
  });

  it('rolls back the profile update when dependent invalidation fails', async () => {
    const previousAnalyzedAt = new Date('2026-06-20T00:00:00.000Z');
    const store: ProfileContextStore = {
      profile: {
        studentId: 'student-1',
        careerGoalId: 'goal-old',
        specializationId: 'spec-a',
        completionPercent: 70,
        matchPercent: 60,
        riskScore: 15,
        lastAnalyzedAt: previousAnalyzedAt,
      },
      roadmaps: [
        {
          id: 'roadmap-spec-a',
          studentId: 'student-1',
          careerGoalId: 'goal-old',
          specializationId: 'spec-a',
          status: RoadmapStatus.ACTIVE,
        },
      ],
      assessments: [],
      analyses: [],
      recommendations: [],
    };
    const { prisma } = createProfileContextPrisma(store, {
      failDuringInvalidation: true,
    });
    const service = new ProfilesService(prisma as any, {} as any);

    await assert.rejects(
      () =>
        service.updateProfile('student-1', {
          careerGoalId: 'goal-old',
          specializationId: 'spec-b',
        }),
      /archive failed/,
    );

    assert.equal(store.profile.careerGoalId, 'goal-old');
    assert.equal(store.profile.specializationId, 'spec-a');
    assert.equal(store.profile.completionPercent, 70);
    assert.equal(store.profile.matchPercent, 60);
    assert.equal(store.profile.riskScore, 15);
    assert.equal(store.profile.lastAnalyzedAt, previousAnalyzedAt);
    assert.equal(store.roadmaps[0].status, RoadmapStatus.ACTIVE);
  });
});
