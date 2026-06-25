import { NotFoundException } from '@nestjs/common';
import {
  AnalysisResultStatus,
  RecommendationType,
  RoadmapItemStatus,
  RoadmapItemType,
  RoadmapPhase,
  RoadmapStatus,
  StudentRecommendationStatus,
} from '@prisma/client';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { RoadmapsService } from './roadmaps.service';

describe('RoadmapsService analysis lifecycle scope', () => {
  it('generates roadmaps only from CURRENT analysis results', async () => {
    let whereArg: any;
    const service = new RoadmapsService(
      {
        competencyAnalysisResult: {
          findFirst: async ({ where }: any) => {
            whereArg = where;
            return {
              id: 'analysis-current',
              careerGoal: {},
              specialization: null,
            };
          },
        },
      } as any,
      {} as any,
      {} as any,
    );

    await (service as any).getLatestAnalysisResult(
      'student-1',
      'goal-1',
      'backend-1',
    );

    assert.deepEqual(whereArg, {
      studentId: 'student-1',
      careerGoalId: 'goal-1',
      specializationId: 'backend-1',
      status: AnalysisResultStatus.CURRENT,
    });
  });

  it('does not use an OBSOLETE analysis result when resolving the latest analysis for roadmap generation', async () => {
    const analyses = [
      {
        id: 'analysis-obsolete-newer',
        studentId: 'student-1',
        careerGoalId: 'goal-1',
        specializationId: 'backend-1',
        status: AnalysisResultStatus.OBSOLETE,
        analyzedAt: new Date('2026-06-25T09:00:00.000Z'),
        careerGoal: {},
        specialization: null,
      },
      {
        id: 'analysis-current-older',
        studentId: 'student-1',
        careerGoalId: 'goal-1',
        specializationId: 'backend-1',
        status: AnalysisResultStatus.CURRENT,
        analyzedAt: new Date('2026-06-25T08:00:00.000Z'),
        careerGoal: {},
        specialization: null,
      },
    ];
    const service = new RoadmapsService(
      {
        competencyAnalysisResult: {
          findFirst: async ({ where }: any) =>
            analyses.find(
              (analysis) =>
                analysis.studentId === where.studentId &&
                analysis.careerGoalId === where.careerGoalId &&
                analysis.specializationId === where.specializationId &&
                analysis.status === where.status,
            ) ?? null,
        },
      } as any,
      {} as any,
      {} as any,
    );

    const result = await (service as any).getLatestAnalysisResult(
      'student-1',
      'goal-1',
      'backend-1',
    );

    assert.equal(result.id, 'analysis-current-older');
  });

  it('loads only NEW, SAVED, and IN_PROGRESS recommendations for roadmap generation', async () => {
    let whereArg: any;
    const recommendations = [
      {
        id: 'recommendation-new',
        studentId: 'student-1',
        analysisResultId: 'analysis-current',
        skillId: 'skill-1',
        status: StudentRecommendationStatus.NEW,
      },
      {
        id: 'recommendation-saved',
        studentId: 'student-1',
        analysisResultId: 'analysis-current',
        skillId: 'skill-1',
        status: StudentRecommendationStatus.SAVED,
      },
      {
        id: 'recommendation-in-progress',
        studentId: 'student-1',
        analysisResultId: 'analysis-current',
        skillId: 'skill-1',
        status: StudentRecommendationStatus.IN_PROGRESS,
      },
      {
        id: 'recommendation-done',
        studentId: 'student-1',
        analysisResultId: 'analysis-current',
        skillId: 'skill-1',
        status: StudentRecommendationStatus.DONE,
      },
      {
        id: 'recommendation-dismissed',
        studentId: 'student-1',
        analysisResultId: 'analysis-current',
        skillId: 'skill-1',
        status: StudentRecommendationStatus.DISMISSED,
      },
      {
        id: 'recommendation-obsolete-analysis',
        studentId: 'student-1',
        analysisResultId: 'analysis-obsolete',
        skillId: 'skill-1',
        status: StudentRecommendationStatus.NEW,
      },
    ];
    const service = new RoadmapsService(
      {
        studentRecommendation: {
          findMany: async ({ where }: any) => {
            whereArg = where;
            return recommendations.filter(
              (recommendation) =>
                recommendation.studentId === where.studentId &&
                recommendation.analysisResultId === where.analysisResultId &&
                where.skillId.in.includes(recommendation.skillId) &&
                where.status.in.includes(recommendation.status),
            );
          },
        },
      } as any,
      {} as any,
      {} as any,
    );

    const result = await (service as any).getRecommendationsForAnalysis(
      'student-1',
      'analysis-current',
      ['skill-1'],
    );

    assert.deepEqual(whereArg.status.in, [
      StudentRecommendationStatus.NEW,
      StudentRecommendationStatus.SAVED,
      StudentRecommendationStatus.IN_PROGRESS,
    ]);
    assert.equal(whereArg.status.in.includes(StudentRecommendationStatus.DONE), false);
    assert.equal(
      whereArg.status.in.includes(StudentRecommendationStatus.DISMISSED),
      false,
    );
    assert.deepEqual(
      result.map((recommendation: any) => recommendation.id),
      [
        'recommendation-new',
        'recommendation-saved',
        'recommendation-in-progress',
      ],
    );
  });

  it('archives an existing ACTIVE roadmap before creating a new ACTIVE roadmap for the student', async () => {
    const roadmaps = [
      {
        id: 'roadmap-old',
        studentId: 'student-1',
        careerGoalId: 'goal-1',
        specializationId: 'backend-1',
        version: 1,
        status: RoadmapStatus.ACTIVE,
      },
    ];
    const service = new RoadmapsService(
      {
        $transaction: async (callback: any) =>
          callback({
            developmentRoadmap: {
              findFirst: async () =>
                roadmaps
                  .slice()
                  .sort((a, b) => b.version - a.version)
                  .at(0) ?? null,
              updateMany: async ({ where, data }: any) => {
                let count = 0;
                for (const roadmap of roadmaps) {
                  if (
                    roadmap.studentId === where.studentId &&
                    roadmap.status === where.status
                  ) {
                    roadmap.status = data.status;
                    count += 1;
                  }
                }
                return { count };
              },
              count: async ({ where }: any) =>
                roadmaps.filter(
                  (roadmap) =>
                    roadmap.studentId === where.studentId &&
                    roadmap.status === where.status,
                ).length,
              create: async ({ data }: any) => {
                const roadmap = {
                  id: 'roadmap-new',
                  studentId: data.studentId,
                  careerGoalId: data.careerGoalId,
                  specializationId: data.specializationId,
                  version: data.version,
                  status: data.status,
                };
                roadmaps.push(roadmap);
                return roadmap;
              },
            },
          }),
      } as any,
      {} as any,
      { record: async () => undefined } as any,
    );
    (service as any).getStudentProfile = async () => ({
      studentId: 'student-1',
      careerGoalId: 'goal-1',
      specializationId: 'backend-1',
    });
    (service as any).getLatestAnalysisResult = async () => ({
      id: 'analysis-current',
      careerGoalId: 'goal-1',
      specializationId: 'backend-1',
      careerGoal: { name: 'Software Engineer' },
      specialization: { name: 'Backend Engineer' },
    });
    (service as any).getMissingAnalysisDetails = async () => [
      { skillId: 'skill-1' },
    ];
    (service as any).getRecommendationsForAnalysis = async () => [
      { id: 'recommendation-1' },
    ];
    (service as any).getRequiredSkillContextMap = async () => new Map();
    (service as any).buildRoadmapItems = () => [
      {
        skillId: 'skill-1',
        recommendationId: 'recommendation-1',
        title: 'Improve NestJS',
        description: null,
        itemType: RoadmapItemType.PRACTICE,
        roadmapPhase: RoadmapPhase.CAREER_TRACK,
        orderIndex: 1,
        weight: 1,
        deadline: null,
        status: RoadmapItemStatus.TODO,
        learningOrder: 1,
        priorityScore: 1,
        recommendationPriority: 0,
        skillName: 'NestJS',
      },
    ];
    (service as any).toRoadmapResponse = async (roadmap: any) => ({
      roadmapId: roadmap.id,
      version: roadmap.version,
      status: roadmap.status,
      phases: [{ phase: RoadmapPhase.CAREER_TRACK, items: [{ id: 'item-1' }] }],
    });

    const result = await (service as any).generateRoadmapForStudent(
      'student-1',
      true,
      'actor-1',
    );

    assert.equal(result.roadmapId, 'roadmap-new');
    assert.equal(roadmaps[0].status, RoadmapStatus.ARCHIVED);
    assert.equal(roadmaps[1].status, RoadmapStatus.ACTIVE);
    assert.equal(
      roadmaps.filter((roadmap) => roadmap.status === RoadmapStatus.ACTIVE)
        .length,
      1,
    );
  });
});

describe('RoadmapsService progress sync', () => {
  it('does not let a student update another student roadmap item by changing the item id', async () => {
    let findWhere: any;
    let transactionCalled = false;
    const service = new RoadmapsService(
      {
        student: {
          findUnique: async ({ where }: any) =>
            where.userId === 'user-1' ? { id: 'student-1' } : null,
        },
        roadmapItem: {
          findFirst: async ({ where }: any) => {
            findWhere = where;
            return null;
          },
        },
        $transaction: async () => {
          transactionCalled = true;
        },
      } as any,
      {} as any,
      { record: async () => undefined } as any,
    );

    await assert.rejects(
      () =>
        service.updateRoadmapItemStatus('user-1', 'item-owned-by-student-2', {
          status: RoadmapItemStatus.DONE,
        }),
      NotFoundException,
    );

    assert.deepEqual(findWhere, {
      id: 'item-owned-by-student-2',
      roadmap: { studentId: 'student-1' },
    });
    assert.equal(transactionCalled, false);
  });

  it('marks the linked recommendation DONE when a roadmap item is completed', async () => {
    const roadmap = {
      id: 'roadmap-1',
      studentId: 'student-1',
      status: RoadmapStatus.ACTIVE,
      progressPercent: 0,
    };
    const item = {
      id: 'roadmap-item-1',
      roadmapId: 'roadmap-1',
      recommendationId: 'recommendation-1',
      status: RoadmapItemStatus.IN_PROGRESS,
      weight: 1,
      roadmap,
    };
    const recommendation = {
      id: 'recommendation-1',
      studentId: 'student-1',
      status: StudentRecommendationStatus.IN_PROGRESS,
    };
    const service = new RoadmapsService(
      {
        student: {
          findUnique: async ({ where }: any) =>
            where.userId === 'user-1' ? { id: 'student-1' } : null,
        },
        roadmapItem: {
          findFirst: async ({ where }: any) =>
            where.id === item.id && where.roadmap.studentId === 'student-1'
              ? item
              : null,
        },
        $transaction: async (callback: any) =>
          callback({
            roadmapItem: {
              update: async ({ data }: any) => {
                item.status = data.status;
                return item;
              },
              findMany: async ({ where }: any) =>
                where.roadmapId === roadmap.id
                  ? [{ status: item.status, weight: item.weight }]
                  : [],
            },
            studentRoadmapProgress: {
              create: async () => undefined,
            },
            studentRecommendation: {
              updateMany: async ({ where, data }: any) => {
                if (
                  where.id === recommendation.id &&
                  where.studentId === recommendation.studentId &&
                  where.status.in.includes(recommendation.status)
                ) {
                  recommendation.status = data.status;
                  return { count: 1 };
                }
                return { count: 0 };
              },
            },
            developmentRoadmap: {
              update: async ({ data }: any) => {
                roadmap.progressPercent = data.progressPercent;
                roadmap.status = data.status;
                return roadmap;
              },
              findUnique: async ({ where }: any) =>
                where.id === roadmap.id ? { ...roadmap, items: [] } : null,
            },
          }),
      } as any,
      {} as any,
      { record: async () => undefined } as any,
    );
    (service as any).toRoadmapResponse = async (roadmapDetail: any) => ({
      roadmapId: roadmapDetail.id,
      status: roadmapDetail.status,
      progressPercent: roadmapDetail.progressPercent,
      phases: [],
    });

    await service.updateRoadmapItemStatus('user-1', 'roadmap-item-1', {
      status: RoadmapItemStatus.DONE,
    });

    assert.equal(item.status, RoadmapItemStatus.DONE);
    assert.equal(recommendation.status, StudentRecommendationStatus.DONE);
    assert.equal(roadmap.status, RoadmapStatus.COMPLETED);
    assert.equal(roadmap.progressPercent, 100);
  });
});
