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

  it('invalidates only the affected goal and specialization scope when required skills change', async () => {
    const service = new CatalogContextInvalidationService();
    const analyses = [
      {
        id: 'analysis-a',
        careerGoalId: 'goal-a',
        specializationId: 'spec-a',
        status: AnalysisResultStatus.CURRENT,
      },
      {
        id: 'analysis-b',
        careerGoalId: 'goal-b',
        specializationId: 'spec-b',
        status: AnalysisResultStatus.CURRENT,
      },
    ];
    const recommendations: any[] = [
      {
        id: 'recommendation-a',
        analysisResultId: 'analysis-a',
        status: StudentRecommendationStatus.IN_PROGRESS,
      },
      {
        id: 'recommendation-b',
        analysisResultId: 'analysis-b',
        status: StudentRecommendationStatus.IN_PROGRESS,
      },
      {
        id: 'template-recommendation-a',
        analysisResultId: null,
        status: StudentRecommendationStatus.SAVED,
        studentProfile: {
          careerGoalId: 'goal-a',
          specializationId: 'spec-a',
        },
        template: {
          careerGoalId: 'goal-a',
          specializationId: 'spec-a',
          status: TemplateStatus.ACTIVE,
        },
      },
      {
        id: 'template-recommendation-b',
        analysisResultId: null,
        status: StudentRecommendationStatus.SAVED,
        studentProfile: {
          careerGoalId: 'goal-b',
          specializationId: 'spec-b',
        },
        template: {
          careerGoalId: 'goal-b',
          specializationId: 'spec-b',
          status: TemplateStatus.ACTIVE,
        },
      },
    ];
    const roadmaps = [
      {
        id: 'roadmap-a',
        careerGoalId: 'goal-a',
        specializationId: 'spec-a',
        status: RoadmapStatus.ACTIVE,
      },
      {
        id: 'roadmap-b',
        careerGoalId: 'goal-b',
        specializationId: 'spec-b',
        status: RoadmapStatus.ACTIVE,
      },
    ];
    const assessments = [
      {
        id: 'assessment-a',
        careerGoalId: 'goal-a',
        specializationId: 'spec-a',
        status: AssessmentStatus.IN_PROGRESS,
      },
      {
        id: 'assessment-b',
        careerGoalId: 'goal-b',
        specializationId: 'spec-b',
        status: AssessmentStatus.IN_PROGRESS,
      },
    ];
    const profiles: any[] = [
      {
        id: 'profile-a',
        careerGoalId: 'goal-a',
        specializationId: 'spec-a',
        matchPercent: 88,
        riskScore: 12,
        lastAnalyzedAt: new Date('2026-06-25T08:00:00.000Z'),
      },
      {
        id: 'profile-b',
        careerGoalId: 'goal-b',
        specializationId: 'spec-b',
        matchPercent: 77,
        riskScore: 20,
        lastAnalyzedAt: new Date('2026-06-25T08:30:00.000Z'),
      },
    ];
    const matchesScope = (record: any, where: any) =>
      record.careerGoalId === where.careerGoalId &&
      (!('specializationId' in where) ||
        record.specializationId === where.specializationId);
    const tx = {
      competencyAnalysisResult: {
        findMany: async ({ where }: any) =>
          analyses
            .filter(
              (analysis) =>
                matchesScope(analysis, where) &&
                analysis.status === where.status,
            )
            .map((analysis) => ({ id: analysis.id })),
        updateMany: async ({ where, data }: any) => {
          let count = 0;
          for (const analysis of analyses) {
            if (
              where.id.in.includes(analysis.id) &&
              analysis.status === where.status
            ) {
              analysis.status = data.status;
              count += 1;
            }
          }
          return { count };
        },
      },
      studentRecommendation: {
        updateMany: async ({ where, data }: any) => {
          let count = 0;
          for (const recommendation of recommendations) {
            const matchesAnalysis =
              where.analysisResultId?.in?.includes(recommendation.analysisResultId);
            const matchesTemplate =
              where.analysisResultId === null &&
              recommendation.analysisResultId === null &&
              recommendation.studentProfile?.careerGoalId ===
                where.student.profile.careerGoalId &&
              recommendation.studentProfile?.specializationId ===
                where.student.profile.specializationId &&
              recommendation.template?.careerGoalId ===
                where.recommendationTemplate.careerGoalId &&
              recommendation.template?.status ===
                where.recommendationTemplate.status &&
              where.recommendationTemplate.OR.some((scope: any) =>
                scope.specializationId === null
                  ? recommendation.template?.specializationId === null
                  : recommendation.template?.specializationId ===
                    scope.specializationId,
              );

            if (
              (matchesAnalysis || matchesTemplate) &&
              where.status.in.includes(recommendation.status)
            ) {
              recommendation.status = data.status;
              count += 1;
            }
          }
          return { count };
        },
      },
      developmentRoadmap: {
        updateMany: async ({ where, data }: any) => {
          let count = 0;
          for (const roadmap of roadmaps) {
            if (
              matchesScope(roadmap, where) &&
              roadmap.status === where.status
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
          let count = 0;
          for (const assessment of assessments) {
            if (
              matchesScope(assessment, where) &&
              assessment.status === where.status
            ) {
              assessment.status = data.status;
              count += 1;
            }
          }
          return { count };
        },
      },
      studentProfile: {
        updateMany: async ({ where, data }: any) => {
          let count = 0;
          for (const profile of profiles) {
            if (matchesScope(profile, where)) {
              Object.assign(profile, data);
              count += 1;
            }
          }
          return { count };
        },
      },
    };

    const result = await service.invalidateCareerRequiredSkillChange(tx as any, {
      careerGoalId: 'goal-a',
      specializationId: 'spec-a',
    });

    assert.equal(result.analyses, 1);
    assert.equal(result.recommendations, 2);
    assert.equal(result.roadmaps, 1);
    assert.equal(result.assessments, 1);
    assert.equal(result.profiles, 1);
    assert.equal(analyses[0].status, AnalysisResultStatus.OBSOLETE);
    assert.equal(analyses[1].status, AnalysisResultStatus.CURRENT);
    assert.equal(recommendations[0].status, StudentRecommendationStatus.OBSOLETE);
    assert.equal(recommendations[1].status, StudentRecommendationStatus.IN_PROGRESS);
    assert.equal(recommendations[2].status, StudentRecommendationStatus.OBSOLETE);
    assert.equal(recommendations[3].status, StudentRecommendationStatus.SAVED);
    assert.equal(roadmaps[0].status, RoadmapStatus.ARCHIVED);
    assert.equal(roadmaps[1].status, RoadmapStatus.ACTIVE);
    assert.equal(assessments[0].status, AssessmentStatus.CANCELLED);
    assert.equal(assessments[1].status, AssessmentStatus.IN_PROGRESS);
    assert.equal(profiles[0].matchPercent, 0);
    assert.equal(profiles[0].lastAnalyzedAt, null);
    assert.equal(profiles[1].matchPercent, 77);
  });
});
