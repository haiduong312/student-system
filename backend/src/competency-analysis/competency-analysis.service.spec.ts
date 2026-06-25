import { ForbiddenException } from '@nestjs/common';
import {
  AnalysisResultStatus,
  AnalysisSkillStatus,
  MatchLevel,
  RoadmapPhase,
} from '@prisma/client';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CompetencyAnalysisService } from './competency-analysis.service';

type AnalysisRecord = {
  id: string;
  studentId: string;
  careerGoalId: string;
  specializationId: string | null;
  status: AnalysisResultStatus;
};

const profile = {
  studentId: 'student-1',
  careerGoalId: 'goal-1',
  careerGoalName: 'Software Engineer',
  specializationId: 'backend-1',
  specializationName: 'Backend Engineer',
};

const achievedSkill = {
  skillId: 'skill-1',
  skillName: 'NestJS',
  categoryId: null,
  categoryName: null,
  requiredLevel: 1,
  weight: 1,
  learningOrder: 1,
  isRequired: true,
  roadmapPhase: RoadmapPhase.CAREER_TRACK,
  specificityRank: 1,
  currentLevel: 1,
  gap: 0,
  skillScore: 1,
  priorityScore: 0,
  status: AnalysisSkillStatus.ACHIEVED,
};

function createServiceWithAnalysisStore(
  store: AnalysisRecord[],
  options: { failCreate?: boolean } = {},
) {
  let nextId = store.length + 1;
  const prisma = {
    $transaction: async (callback: any) => {
      const snapshot = store.map((item) => ({ ...item }));
      const tx = {
        competencyAnalysisResult: {
          updateMany: async ({ where, data }: any) => {
            let count = 0;
            for (const item of snapshot) {
              if (
                item.studentId === where.studentId &&
                item.careerGoalId === where.careerGoalId &&
                item.specializationId === where.specializationId &&
                item.status === where.status
              ) {
                item.status = data.status;
                count += 1;
              }
            }
            return { count };
          },
          create: async ({ data }: any) => {
            if (options.failCreate) {
              throw new Error('create failed');
            }
            const record = {
              id: `analysis-${nextId++}`,
              studentId: data.studentId,
              careerGoalId: data.careerGoalId,
              specializationId: data.specializationId,
              status: data.status,
            };
            snapshot.push(record);
            return record;
          },
        },
        studentProfile: {
          update: async () => ({}),
        },
      };

      const result = await callback(tx);
      store.splice(0, store.length, ...snapshot);
      return result;
    },
  };

  return new CompetencyAnalysisService(
    prisma as any,
    {} as any,
    { record: async () => undefined } as any,
    {} as any,
  );
}

const saveInput = {
  profile,
  analyzedSkills: [achievedSkill],
  completionPercent: 100,
  matchPercent: 100,
  matchLevel: MatchLevel.STRONG_MATCH,
  riskScore: 0,
  totalWeight: 1,
  totalSkillScore: 1,
  deleteOldNewRecommendations: true,
};

describe('CompetencyAnalysisService result lifecycle', () => {
  it('creates the first analysis as CURRENT', async () => {
    const store: AnalysisRecord[] = [];
    const service = createServiceWithAnalysisStore(store);

    await (service as any).saveAnalysisWithRecommendations(saveInput);

    assert.equal(store.length, 1);
    assert.equal(store[0].status, AnalysisResultStatus.CURRENT);
  });

  it('marks previous CURRENT analysis obsolete for the same student goal specialization scope', async () => {
    const store: AnalysisRecord[] = [
      {
        id: 'analysis-old',
        studentId: 'student-1',
        careerGoalId: 'goal-1',
        specializationId: 'backend-1',
        status: AnalysisResultStatus.CURRENT,
      },
    ];
    const service = createServiceWithAnalysisStore(store);

    await (service as any).saveAnalysisWithRecommendations(saveInput);

    assert.equal(store.length, 2);
    assert.equal(store[0].status, AnalysisResultStatus.OBSOLETE);
    assert.equal(
      store.filter((item) => item.status === AnalysisResultStatus.CURRENT).length,
      1,
    );
    assert.equal(store[1].status, AnalysisResultStatus.CURRENT);
  });

  it('leaves only one CURRENT analysis for the same student goal specialization scope', async () => {
    const store: AnalysisRecord[] = [
      {
        id: 'analysis-old-1',
        studentId: 'student-1',
        careerGoalId: 'goal-1',
        specializationId: 'backend-1',
        status: AnalysisResultStatus.CURRENT,
      },
      {
        id: 'analysis-old-2',
        studentId: 'student-1',
        careerGoalId: 'goal-1',
        specializationId: 'backend-1',
        status: AnalysisResultStatus.CURRENT,
      },
      {
        id: 'analysis-other-specialization',
        studentId: 'student-1',
        careerGoalId: 'goal-1',
        specializationId: 'frontend-1',
        status: AnalysisResultStatus.CURRENT,
      },
    ];
    const service = createServiceWithAnalysisStore(store);

    await (service as any).saveAnalysisWithRecommendations(saveInput);

    const sameScopeCurrent = store.filter(
      (item) =>
        item.studentId === 'student-1' &&
        item.careerGoalId === 'goal-1' &&
        item.specializationId === 'backend-1' &&
        item.status === AnalysisResultStatus.CURRENT,
    );
    assert.equal(sameScopeCurrent.length, 1);
    assert.equal(sameScopeCurrent[0].id, 'analysis-4');
    assert.equal(store[0].status, AnalysisResultStatus.OBSOLETE);
    assert.equal(store[1].status, AnalysisResultStatus.OBSOLETE);
    assert.equal(store[2].status, AnalysisResultStatus.CURRENT);
  });

  it('rolls back obsolete marking if creating the new analysis fails', async () => {
    const store: AnalysisRecord[] = [
      {
        id: 'analysis-old',
        studentId: 'student-1',
        careerGoalId: 'goal-1',
        specializationId: 'backend-1',
        status: AnalysisResultStatus.CURRENT,
      },
    ];
    const service = createServiceWithAnalysisStore(store, { failCreate: true });

    await assert.rejects(
      () => (service as any).saveAnalysisWithRecommendations(saveInput),
      /create failed/,
    );

    assert.deepEqual(store, [
      {
        id: 'analysis-old',
        studentId: 'student-1',
        careerGoalId: 'goal-1',
        specializationId: 'backend-1',
        status: AnalysisResultStatus.CURRENT,
      },
    ]);
  });
});

describe('CompetencyAnalysisService ownership', () => {
  it('does not return another student analysis result', async () => {
    let checkedStudentId: string | undefined;
    const service = new CompetencyAnalysisService(
      {
        competencyAnalysisResult: {
          findUnique: async ({ where }: any) =>
            where.id === 'analysis-student-2'
              ? {
                  id: 'analysis-student-2',
                  studentId: 'student-2',
                  careerGoal: {},
                  specialization: null,
                  details: [],
                  recommendations: [],
                }
              : null,
        },
      } as any,
      {
        assertCanAccessStudent: async (_user: any, studentId: string) => {
          checkedStudentId = studentId;
          throw new ForbiddenException('You do not have permission to access this student');
        },
      } as any,
      { record: async () => undefined } as any,
      {} as any,
    );

    await assert.rejects(
      () =>
        service.getResult(
          {
            id: 'user-1',
            email: 'user-1@example.edu',
            fullName: 'Student 1',
            role: 'STUDENT' as any,
          },
          'analysis-student-2',
        ),
      ForbiddenException,
    );
    assert.equal(checkedStudentId, 'student-2');
  });
});
