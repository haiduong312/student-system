import { AnalysisResultStatus, RoadmapStatus } from '@prisma/client';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DashboardService } from './dashboard.service';

describe('DashboardService specialization scope', () => {
  it('loads student analysis and roadmap only from the current specialization scope', async () => {
    let analysisWhere: any;
    let roadmapWhere: any;
    const service = new DashboardService({
      student: {
        findUnique: async () => ({ id: 'student-1' }),
      },
      studentProfile: {
        findUnique: async () => ({
          studentId: 'student-1',
          careerGoalId: 'goal-1',
          specializationId: 'backend-1',
          completionPercent: 50,
          matchPercent: null,
          careerGoal: { id: 'goal-1', name: 'Software Engineer' },
        }),
      },
      competencyAnalysisResult: {
        findFirst: async ({ where }: any) => {
          analysisWhere = where;
          if (where.specializationId !== 'backend-1') {
            return {
              matchPercent: 10,
              details: [],
            };
          }

          return {
            matchPercent: 80,
            details: [],
          };
        },
      },
      developmentRoadmap: {
        findFirst: async ({ where }: any) => {
          roadmapWhere = where;
          return {
            id: 'roadmap-1',
            progressPercent: 25,
            status: RoadmapStatus.ACTIVE,
            _count: { items: 2 },
          };
        },
      },
    } as any);

    const result = await service.getStudentDashboard('user-1');

    assert.deepEqual(analysisWhere, {
      studentId: 'student-1',
      careerGoalId: 'goal-1',
      specializationId: 'backend-1',
      status: AnalysisResultStatus.CURRENT,
    });
    assert.deepEqual(roadmapWhere, {
      studentId: 'student-1',
      careerGoalId: 'goal-1',
      specializationId: 'backend-1',
      status: RoadmapStatus.ACTIVE,
    });
    assert.equal(result.matchPercent, 80);
    assert.equal(result.roadmapProgress.roadmapId, 'roadmap-1');
  });
});
