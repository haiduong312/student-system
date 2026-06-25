import { AnalysisResultStatus, AssessmentStatus } from '@prisma/client';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ProfilesService } from './profiles.service';

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
