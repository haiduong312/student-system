import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  AnalysisResultStatus,
  CatalogStatus,
  ResourceProgressStatus,
  RoadmapItemStatus,
  RoadmapStatus,
  StudentRecommendationStatus,
} from '@prisma/client';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LearningResourcesService } from './learning-resources.service';

type ResourceRecord = {
  id: string;
  status: CatalogStatus;
};

type RecommendationRecord = {
  id: string;
  studentId: string;
  status: StudentRecommendationStatus;
  analysisStatus?: AnalysisResultStatus | null;
  resourceLinks: string[];
};

type ProgressRecord = {
  studentId: string;
  resourceId: string;
  recommendationId?: string | null;
  status: ResourceProgressStatus;
  startedAt?: Date | null;
  completedAt?: Date | null;
};

type RoadmapRecord = {
  id: string;
  studentId: string;
  status: RoadmapStatus;
  progressPercent: number;
};

type RoadmapItemRecord = {
  id: string;
  roadmapId: string;
  recommendationId: string | null;
  status: RoadmapItemStatus;
  weight: number;
};

type LearningResourceStore = {
  studentId: string;
  resources: ResourceRecord[];
  recommendations: RecommendationRecord[];
  progress: ProgressRecord[];
  roadmaps: RoadmapRecord[];
  roadmapItems: RoadmapItemRecord[];
};

const cloneStore = (store: LearningResourceStore): LearningResourceStore => ({
  studentId: store.studentId,
  resources: store.resources.map((resource) => ({ ...resource })),
  recommendations: store.recommendations.map((recommendation) => ({
    ...recommendation,
    resourceLinks: [...recommendation.resourceLinks],
  })),
  progress: store.progress.map((progress) => ({ ...progress })),
  roadmaps: store.roadmaps.map((roadmap) => ({ ...roadmap })),
  roadmapItems: store.roadmapItems.map((item) => ({ ...item })),
});

function createLearningResourcePrisma(
  store: LearningResourceStore,
  options: { failDuringRoadmapSync?: boolean } = {},
) {
  const isCurrentRecommendation = (recommendation: RecommendationRecord) =>
    recommendation.analysisStatus == null ||
    recommendation.analysisStatus === AnalysisResultStatus.CURRENT;

  const findRecommendation = (draft: LearningResourceStore, args: any) => {
    const where = args?.where ?? {};
    const recommendation = draft.recommendations.find(
      (record) =>
        (!where.id || record.id === where.id) &&
        (!where.studentId || record.studentId === where.studentId) &&
        isCurrentRecommendation(record),
    );

    if (!recommendation) {
      return null;
    }

    const linkedResourceId = args?.select?.resourceLinks?.where?.resourceId;
    const linkedResources = linkedResourceId
      ? recommendation.resourceLinks.filter((resourceId) => resourceId === linkedResourceId)
      : recommendation.resourceLinks;

    return {
      id: recommendation.id,
      status: recommendation.status,
      resourceLinks: linkedResources.map((resourceId, index) => ({
        id: `${recommendation.id}-resource-${index}`,
        resourceId,
      })),
    };
  };

  const createTx = (draft: LearningResourceStore) => ({
    studentResourceProgress: {
      upsert: async (args: any) => {
        const key = args.where.studentId_resourceId;
        let progress = draft.progress.find(
          (record) => record.studentId === key.studentId && record.resourceId === key.resourceId,
        );

        if (!progress) {
          progress = {
            studentId: key.studentId,
            resourceId: key.resourceId,
            recommendationId: args.create.recommendationId,
            status: args.create.status,
            startedAt: args.create.startedAt,
            completedAt: args.create.completedAt,
          };
          draft.progress.push(progress);
        } else {
          progress.status = args.update.status;
          if (args.update.recommendationId !== undefined) {
            progress.recommendationId = args.update.recommendationId;
          }
          if (args.update.startedAt !== undefined) {
            progress.startedAt = args.update.startedAt;
          }
          if (args.update.completedAt !== undefined) {
            progress.completedAt = args.update.completedAt;
          }
        }

        return {
          ...progress,
          resource: draft.resources.find((resource) => resource.id === progress?.resourceId),
          recommendation: progress.recommendationId
            ? draft.recommendations.find((recommendation) => recommendation.id === progress?.recommendationId)
            : null,
        };
      },
      count: async (args: any) =>
        draft.progress.filter(
          (progress) =>
            progress.studentId === args.where.studentId &&
            args.where.resourceId.in.includes(progress.resourceId) &&
            progress.status === args.where.status,
        ).length,
    },
    studentRecommendation: {
      findFirst: async (args: any) => findRecommendation(draft, args),
      updateMany: async (args: any) => {
        let count = 0;
        for (const recommendation of draft.recommendations) {
          if (
            recommendation.id === args.where.id &&
            recommendation.studentId === args.where.studentId &&
            args.where.status.in.includes(recommendation.status)
          ) {
            recommendation.status = args.data.status;
            count += 1;
          }
        }
        return { count };
      },
    },
    roadmapItem: {
      findMany: async (args: any) => {
        if (options.failDuringRoadmapSync && args.where.recommendationId) {
          throw new Error('roadmap sync failed');
        }

        if (args.where.recommendationId) {
          return draft.roadmapItems
            .filter((item) => {
              const roadmap = draft.roadmaps.find((record) => record.id === item.roadmapId);
              return (
                item.recommendationId === args.where.recommendationId &&
                args.where.status.in.includes(item.status) &&
                roadmap?.studentId === args.where.roadmap.studentId &&
                roadmap.status === args.where.roadmap.status
              );
            })
            .map((item) => ({ id: item.id, roadmapId: item.roadmapId }));
        }

        if (args.where.roadmapId) {
          return draft.roadmapItems
            .filter((item) => item.roadmapId === args.where.roadmapId)
            .map((item) => ({ status: item.status, weight: item.weight }));
        }

        return [];
      },
      updateMany: async (args: any) => {
        let count = 0;
        for (const item of draft.roadmapItems) {
          if (args.where.id.in.includes(item.id)) {
            item.status = args.data.status;
            count += 1;
          }
        }
        return { count };
      },
    },
    studentRoadmapProgress: {
      createMany: async () => ({ count: 1 }),
    },
    developmentRoadmap: {
      update: async (args: any) => {
        const roadmap = draft.roadmaps.find((record) => record.id === args.where.id);
        if (roadmap) {
          roadmap.progressPercent = args.data.progressPercent;
          roadmap.status = args.data.status;
        }
        return roadmap;
      },
    },
  });

  return {
    student: {
      findUnique: async (args: any) => {
        if (args.where.userId !== 'user-1') {
          return null;
        }
        return { id: store.studentId };
      },
    },
    learningResource: {
      findUnique: async (args: any) =>
        store.resources.find((resource) => resource.id === args.where.id) ?? null,
    },
    studentRecommendation: {
      findFirst: async (args: any) => findRecommendation(store, args),
    },
    studentResourceProgress: {
      findUnique: async (args: any) => {
        const key = args.where.studentId_resourceId;
        return (
          store.progress.find(
            (progress) => progress.studentId === key.studentId && progress.resourceId === key.resourceId,
          ) ?? null
        );
      },
    },
    $transaction: async (callback: any) => {
      const draft = cloneStore(store);
      const result = await callback(createTx(draft));

      store.progress = draft.progress;
      store.recommendations = draft.recommendations;
      store.roadmaps = draft.roadmaps;
      store.roadmapItems = draft.roadmapItems;

      return result;
    },
  };
}

const createStore = (overrides: Partial<LearningResourceStore> = {}): LearningResourceStore => ({
  studentId: 'student-1',
  resources: [
    { id: 'resource-1', status: CatalogStatus.ACTIVE },
    { id: 'resource-2', status: CatalogStatus.ACTIVE },
  ],
  recommendations: [
    {
      id: 'recommendation-1',
      studentId: 'student-1',
      status: StudentRecommendationStatus.IN_PROGRESS,
      analysisStatus: AnalysisResultStatus.CURRENT,
      resourceLinks: ['resource-1', 'resource-2'],
    },
  ],
  progress: [
    {
      studentId: 'student-1',
      resourceId: 'resource-1',
      recommendationId: 'recommendation-1',
      status: ResourceProgressStatus.IN_PROGRESS,
    },
    {
      studentId: 'student-1',
      resourceId: 'resource-2',
      recommendationId: 'recommendation-1',
      status: ResourceProgressStatus.IN_PROGRESS,
    },
  ],
  roadmaps: [
    {
      id: 'roadmap-1',
      studentId: 'student-1',
      status: RoadmapStatus.ACTIVE,
      progressPercent: 0,
    },
  ],
  roadmapItems: [
    {
      id: 'roadmap-item-1',
      roadmapId: 'roadmap-1',
      recommendationId: 'recommendation-1',
      status: RoadmapItemStatus.TODO,
      weight: 1,
    },
  ],
  ...overrides,
});

describe('LearningResourcesService progress sync', () => {
  function createService(
    store: LearningResourceStore,
    options?: { failDuringRoadmapSync?: boolean },
  ) {
    return new LearningResourcesService(
      createLearningResourcePrisma(store, options) as any,
      { record: async () => undefined } as any,
    );
  }

  it('does not mark recommendation DONE while at least one linked resource is incomplete', async () => {
    const store = createStore();
    const service = createService(store);

    await service.updateMyProgress('user-1', 'resource-1', {
      status: ResourceProgressStatus.COMPLETED,
      recommendationId: 'recommendation-1',
    });

    assert.equal(
      store.progress.find((progress) => progress.resourceId === 'resource-1')?.status,
      ResourceProgressStatus.COMPLETED,
    );
    assert.equal(store.recommendations[0].status, StudentRecommendationStatus.IN_PROGRESS);
    assert.equal(store.roadmapItems[0].status, RoadmapItemStatus.TODO);
  });

  it('marks recommendation DONE and completes active roadmap items when every linked resource is completed', async () => {
    const store = createStore({
      progress: [
        {
          studentId: 'student-1',
          resourceId: 'resource-1',
          recommendationId: 'recommendation-1',
          status: ResourceProgressStatus.IN_PROGRESS,
        },
        {
          studentId: 'student-1',
          resourceId: 'resource-2',
          recommendationId: 'recommendation-1',
          status: ResourceProgressStatus.COMPLETED,
        },
      ],
    });
    const service = createService(store);

    await service.updateMyProgress('user-1', 'resource-1', {
      status: ResourceProgressStatus.COMPLETED,
      recommendationId: 'recommendation-1',
    });

    assert.equal(store.recommendations[0].status, StudentRecommendationStatus.DONE);
    assert.equal(store.roadmapItems[0].status, RoadmapItemStatus.DONE);
    assert.equal(store.roadmaps[0].status, RoadmapStatus.COMPLETED);
    assert.equal(store.roadmaps[0].progressPercent, 100);
  });

  it('rejects progress updates through recommendations owned by another student', async () => {
    const store = createStore({
      recommendations: [
        {
          id: 'recommendation-1',
          studentId: 'student-2',
          status: StudentRecommendationStatus.IN_PROGRESS,
          analysisStatus: AnalysisResultStatus.CURRENT,
          resourceLinks: ['resource-1'],
        },
      ],
    });
    const service = createService(store);

    await assert.rejects(
      () =>
        service.updateMyProgress('user-1', 'resource-1', {
          status: ResourceProgressStatus.COMPLETED,
          recommendationId: 'recommendation-1',
        }),
      ForbiddenException,
    );
    assert.equal(
      store.progress.find((progress) => progress.resourceId === 'resource-1')?.status,
      ResourceProgressStatus.IN_PROGRESS,
    );
  });

  it('rolls back progress and recommendation updates when roadmap sync fails inside the transaction', async () => {
    const store = createStore({
      recommendations: [
        {
          id: 'recommendation-1',
          studentId: 'student-1',
          status: StudentRecommendationStatus.IN_PROGRESS,
          analysisStatus: AnalysisResultStatus.CURRENT,
          resourceLinks: ['resource-1'],
        },
      ],
      progress: [
        {
          studentId: 'student-1',
          resourceId: 'resource-1',
          recommendationId: 'recommendation-1',
          status: ResourceProgressStatus.IN_PROGRESS,
        },
      ],
    });
    const service = createService(store, { failDuringRoadmapSync: true });

    await assert.rejects(
      () =>
        service.updateMyProgress('user-1', 'resource-1', {
          status: ResourceProgressStatus.COMPLETED,
          recommendationId: 'recommendation-1',
        }),
      /roadmap sync failed/,
    );

    assert.equal(store.progress[0].status, ResourceProgressStatus.IN_PROGRESS);
    assert.equal(store.recommendations[0].status, StudentRecommendationStatus.IN_PROGRESS);
    assert.equal(store.roadmapItems[0].status, RoadmapItemStatus.TODO);
  });

  it('allows updating an already COMPLETED resource to COMPLETED again as an idempotent operation', async () => {
    const store = createStore({
      recommendations: [
        {
          id: 'recommendation-1',
          studentId: 'student-1',
          status: StudentRecommendationStatus.DONE,
          analysisStatus: AnalysisResultStatus.CURRENT,
          resourceLinks: ['resource-1'],
        },
      ],
      progress: [
        {
          studentId: 'student-1',
          resourceId: 'resource-1',
          recommendationId: 'recommendation-1',
          status: ResourceProgressStatus.COMPLETED,
        },
      ],
      roadmaps: [
        {
          id: 'roadmap-1',
          studentId: 'student-1',
          status: RoadmapStatus.COMPLETED,
          progressPercent: 100,
        },
      ],
      roadmapItems: [
        {
          id: 'roadmap-item-1',
          roadmapId: 'roadmap-1',
          recommendationId: 'recommendation-1',
          status: RoadmapItemStatus.DONE,
          weight: 1,
        },
      ],
    });
    const service = createService(store);

    await service.updateMyProgress('user-1', 'resource-1', {
      status: ResourceProgressStatus.COMPLETED,
      recommendationId: 'recommendation-1',
    });

    assert.equal(store.progress[0].status, ResourceProgressStatus.COMPLETED);
    assert.equal(store.recommendations[0].status, StudentRecommendationStatus.DONE);
    assert.equal(store.roadmapItems[0].status, RoadmapItemStatus.DONE);
  });

  it('rejects moving COMPLETED progress back to IN_PROGRESS so recommendation and roadmap remain consistent', async () => {
    const store = createStore({
      recommendations: [
        {
          id: 'recommendation-1',
          studentId: 'student-1',
          status: StudentRecommendationStatus.DONE,
          analysisStatus: AnalysisResultStatus.CURRENT,
          resourceLinks: ['resource-1'],
        },
      ],
      progress: [
        {
          studentId: 'student-1',
          resourceId: 'resource-1',
          recommendationId: 'recommendation-1',
          status: ResourceProgressStatus.COMPLETED,
        },
      ],
      roadmaps: [
        {
          id: 'roadmap-1',
          studentId: 'student-1',
          status: RoadmapStatus.COMPLETED,
          progressPercent: 100,
        },
      ],
      roadmapItems: [
        {
          id: 'roadmap-item-1',
          roadmapId: 'roadmap-1',
          recommendationId: 'recommendation-1',
          status: RoadmapItemStatus.DONE,
          weight: 1,
        },
      ],
    });
    const service = createService(store);

    await assert.rejects(
      () =>
        service.updateMyProgress('user-1', 'resource-1', {
          status: ResourceProgressStatus.IN_PROGRESS,
          recommendationId: 'recommendation-1',
        }),
      (error: unknown) =>
        error instanceof BadRequestException &&
        error.message ===
          'Completed resource progress cannot be moved back to an incomplete status',
    );

    assert.equal(store.progress[0].status, ResourceProgressStatus.COMPLETED);
    assert.equal(store.recommendations[0].status, StudentRecommendationStatus.DONE);
    assert.equal(store.roadmapItems[0].status, RoadmapItemStatus.DONE);
  });
});
