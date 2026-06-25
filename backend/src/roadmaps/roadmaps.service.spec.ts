import { AnalysisResultStatus } from '@prisma/client';
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
});
