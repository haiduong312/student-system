import {
  AnalysisResultStatus,
  AssessmentStatus,
  RoadmapStatus,
  StudentRecommendationStatus,
  TemplateStatus,
} from '@prisma/client';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CatalogContextInvalidationService } from './catalog-context-invalidation.service';

describe('CatalogContextInvalidationService', () => {
  it('invalidates current analysis, recommendations, roadmaps, assessments, and profile metrics for one specialization scope', async () => {
    const service = new CatalogContextInvalidationService();
    const calls: Record<string, any> = {};
    const tx = {
      competencyAnalysisResult: {
        findMany: async (args: any) => {
          calls.analysisFindMany = args;
          return [{ id: 'analysis-current' }];
        },
        updateMany: async (args: any) => {
          calls.analysisUpdateMany = args;
          return { count: 1 };
        },
      },
      studentRecommendation: {
        updateMany: async (args: any) => {
          calls.recommendationUpdates ??= [];
          calls.recommendationUpdates.push(args);
          return { count: 1 };
        },
      },
      developmentRoadmap: {
        updateMany: async (args: any) => {
          calls.roadmapUpdateMany = args;
          return { count: 1 };
        },
      },
      assessment: {
        updateMany: async (args: any) => {
          calls.assessmentUpdateMany = args;
          return { count: 1 };
        },
      },
      studentProfile: {
        updateMany: async (args: any) => {
          calls.profileUpdateMany = args;
          return { count: 1 };
        },
      },
    };

    const result = await service.invalidateCareerRequiredSkillChange(tx as any, {
      careerGoalId: 'goal-a',
      specializationId: 'spec-a',
    });

    assert.deepEqual(calls.analysisFindMany.where, {
      careerGoalId: 'goal-a',
      specializationId: 'spec-a',
      status: AnalysisResultStatus.CURRENT,
    });
    assert.deepEqual(calls.analysisUpdateMany.data, {
      status: AnalysisResultStatus.OBSOLETE,
    });
    assert.deepEqual(calls.recommendationUpdates[0].where, {
      analysisResultId: { in: ['analysis-current'] },
      status: {
        in: [
          StudentRecommendationStatus.NEW,
          StudentRecommendationStatus.SAVED,
          StudentRecommendationStatus.IN_PROGRESS,
          StudentRecommendationStatus.DONE,
        ],
      },
    });
    assert.deepEqual(calls.recommendationUpdates[0].data, {
      status: StudentRecommendationStatus.OBSOLETE,
    });
    assert.deepEqual(calls.recommendationUpdates[1].where, {
      analysisResultId: null,
      status: {
        in: [
          StudentRecommendationStatus.NEW,
          StudentRecommendationStatus.SAVED,
          StudentRecommendationStatus.IN_PROGRESS,
          StudentRecommendationStatus.DONE,
        ],
      },
      student: {
        profile: {
          careerGoalId: 'goal-a',
          specializationId: 'spec-a',
        },
      },
      recommendationTemplate: {
        careerGoalId: 'goal-a',
        OR: [{ specializationId: 'spec-a' }, { specializationId: null }],
        status: TemplateStatus.ACTIVE,
      },
    });
    assert.deepEqual(calls.roadmapUpdateMany.where, {
      careerGoalId: 'goal-a',
      specializationId: 'spec-a',
      status: RoadmapStatus.ACTIVE,
    });
    assert.deepEqual(calls.roadmapUpdateMany.data, {
      status: RoadmapStatus.ARCHIVED,
    });
    assert.deepEqual(calls.assessmentUpdateMany.where, {
      careerGoalId: 'goal-a',
      specializationId: 'spec-a',
      status: AssessmentStatus.IN_PROGRESS,
    });
    assert.deepEqual(calls.profileUpdateMany.data, {
      matchPercent: 0,
      riskScore: 0,
      lastAnalyzedAt: null,
    });
    assert.equal(result.analyses, 1);
    assert.equal(result.recommendations, 2);
    assert.equal(result.roadmaps, 1);
  });

  it('invalidates all specialization scopes when a career-level required skill changes', async () => {
    const service = new CatalogContextInvalidationService();
    let roadmapWhere: any;
    const tx = {
      competencyAnalysisResult: {
        findMany: async () => [],
      },
      studentRecommendation: {
        updateMany: async () => ({ count: 0 }),
      },
      developmentRoadmap: {
        updateMany: async ({ where }: any) => {
          roadmapWhere = where;
          return { count: 0 };
        },
      },
      assessment: {
        updateMany: async () => ({ count: 0 }),
      },
      studentProfile: {
        updateMany: async () => ({ count: 0 }),
      },
    };

    await service.invalidateCareerRequiredSkillChange(tx as any, {
      careerGoalId: 'goal-a',
      specializationId: null,
    });

    assert.deepEqual(roadmapWhere, {
      careerGoalId: 'goal-a',
      status: RoadmapStatus.ACTIVE,
    });
  });
});
