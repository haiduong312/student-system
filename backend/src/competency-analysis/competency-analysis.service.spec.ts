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
