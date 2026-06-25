import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  CatalogStatus,
  Prisma,
  RoadmapPhase,
  SkillType,
} from '@prisma/client';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CareerGoalsService } from './career-goals.service';
import { SpecializationsService } from './specializations.service';

const prismaKnownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError(code, {
    code,
    clientVersion: 'test',
  });

function createCareerGoalCreationPrisma(input: {
  commonSkills: Array<{
    id: string;
    name: string;
    defaultRequiredLevel: number;
    defaultWeight: number;
  }>;
  initialCareerGoals?: Array<{
    id: string;
    name: string;
    status?: CatalogStatus;
  }>;
}) {
  const store = {
    careerGoals: (input.initialCareerGoals ?? []).map((goal) => ({
      description: null,
      status: CatalogStatus.ACTIVE,
      ...goal,
    })),
    requiredSkills: [] as any[],
  };
  let nextGoalIndex = store.careerGoals.length + 1;

  const prisma = {
    $transaction: async (callback: (tx: any) => Promise<unknown>) => {
      const draft = {
        careerGoals: store.careerGoals.map((goal) => ({ ...goal })),
        requiredSkills: store.requiredSkills.map((skill) => ({ ...skill })),
      };
      const tx = {
        careerGoal: {
          create: async ({ data }: any) => {
            if (
              draft.careerGoals.some(
                (goal) => goal.name.toLowerCase() === data.name.toLowerCase(),
              )
            ) {
              throw prismaKnownError('P2002');
            }

            const goal = {
              id: `goal-${nextGoalIndex++}`,
              name: data.name,
              description: data.description ?? null,
              status: data.status ?? CatalogStatus.ACTIVE,
            };
            draft.careerGoals.push(goal);
            return goal;
          },
        },
        skill: {
          findMany: async ({ where }: any) => {
            assert.deepEqual(where, {
              type: SkillType.COMMON,
              status: CatalogStatus.ACTIVE,
            });

            return input.commonSkills;
          },
        },
        careerRequiredSkill: {
          findMany: async ({ where }: any) =>
            draft.requiredSkills.filter(
              (skill) =>
                skill.careerGoalId === where.careerGoalId &&
                skill.specializationId === null &&
                where.skillId.in.includes(skill.skillId),
            ),
          aggregate: async ({ where }: any) => ({
            _max: {
              learningOrder:
                draft.requiredSkills
                  .filter(
                    (skill) =>
                      skill.careerGoalId === where.careerGoalId &&
                      skill.specializationId === null,
                  )
                  .reduce<number | null>(
                    (max, skill) =>
                      max === null
                        ? skill.learningOrder
                        : Math.max(max, skill.learningOrder),
                    null,
                  ),
            },
          }),
          createMany: async ({ data }: any) => {
            draft.requiredSkills.push(
              ...data.map((skill: any, index: number) => ({
                id: `required-skill-${draft.requiredSkills.length + index + 1}`,
                specializationId: skill.specializationId ?? null,
                roadmapPhase: skill.roadmapPhase ?? RoadmapPhase.CAREER_TRACK,
                ...skill,
              })),
            );
            return { count: data.length };
          },
        },
      };

      const result = await callback(tx);
      store.careerGoals = draft.careerGoals;
      store.requiredSkills = draft.requiredSkills;
      return result;
    },
  };

  return { prisma, store };
}

describe('CareerGoalsService creation common skills', () => {
  it('creates a career goal and attaches active common skills as career-level required skills', async () => {
    const { prisma, store } = createCareerGoalCreationPrisma({
      commonSkills: [
        {
          id: 'common-skill-1',
          name: 'Communication',
          defaultRequiredLevel: 1,
          defaultWeight: 1.5,
        },
        {
          id: 'common-skill-2',
          name: 'Teamwork',
          defaultRequiredLevel: 2,
          defaultWeight: 2,
        },
      ],
    });
    const service = new CareerGoalsService(
      prisma as any,
      { record: async () => undefined } as any,
      {} as any,
    );

    const result = await service.create({
      name: 'Backend Developer',
      description: 'Build APIs',
    });

    assert.equal(result.id, 'goal-1');
    assert.equal(store.careerGoals.length, 1);
    assert.deepEqual(
      store.requiredSkills.map((skill) => ({
        careerGoalId: skill.careerGoalId,
        specializationId: skill.specializationId,
        skillId: skill.skillId,
        requiredLevel: skill.requiredLevel,
        weight: skill.weight,
        learningOrder: skill.learningOrder,
        isRequired: skill.isRequired,
      })),
      [
        {
          careerGoalId: 'goal-1',
          specializationId: null,
          skillId: 'common-skill-1',
          requiredLevel: 1,
          weight: 1.5,
          learningOrder: 1,
          isRequired: true,
        },
        {
          careerGoalId: 'goal-1',
          specializationId: null,
          skillId: 'common-skill-2',
          requiredLevel: 2,
          weight: 2,
          learningOrder: 2,
          isRequired: true,
        },
      ],
    );
  });

  it('throws BadRequestException and rolls back the career goal when no active common skills exist', async () => {
    const { prisma, store } = createCareerGoalCreationPrisma({
      commonSkills: [],
    });
    const service = new CareerGoalsService(
      prisma as any,
      { record: async () => undefined } as any,
      {} as any,
    );

    await assert.rejects(
      () => service.create({ name: 'Empty Career Goal' }),
      BadRequestException,
    );

    assert.equal(store.careerGoals.length, 0);
    assert.equal(store.requiredSkills.length, 0);
  });

  it('does not create duplicate career goals', async () => {
    const { prisma, store } = createCareerGoalCreationPrisma({
      commonSkills: [
        {
          id: 'common-skill-1',
          name: 'Communication',
          defaultRequiredLevel: 1,
          defaultWeight: 1,
        },
      ],
      initialCareerGoals: [{ id: 'goal-existing', name: 'Backend Developer' }],
    });
    const service = new CareerGoalsService(
      prisma as any,
      { record: async () => undefined } as any,
      {} as any,
    );

    await assert.rejects(
      () => service.create({ name: 'Backend Developer' }),
      ConflictException,
    );

    assert.equal(store.careerGoals.length, 1);
    assert.equal(store.requiredSkills.length, 0);
  });
});

describe('CareerGoalsService required skill scope', () => {
  it('creates career-level required skills with the requested careerGoalId and null specializationId', async () => {
    let createdData: any;
    let invalidationInput: any;
    const tx = {
      careerRequiredSkill: {
        create: async ({ data }: any) => {
          createdData = {
            specializationId: data.specializationId ?? null,
            ...data,
          };
          return { id: 'required-skill-1', ...createdData };
        },
      },
    };
    const service = new CareerGoalsService(
      {
        careerGoal: {
          findUnique: async () => ({
            id: 'goal-1',
            status: CatalogStatus.ACTIVE,
          }),
        },
        skill: {
          findUnique: async () => ({
            id: 'skill-1',
            status: CatalogStatus.ACTIVE,
          }),
        },
        careerRequiredSkill: {
          findFirst: async () => null,
        },
        $transaction: async (callback: (tx: any) => Promise<unknown>) =>
          callback(tx),
      } as any,
      {} as any,
      {
        invalidateCareerRequiredSkillChange: async (
          _txArg: any,
          inputArg: any,
        ) => {
          invalidationInput = inputArg;
        },
      } as any,
    );

    await service.createRequiredSkill('goal-1', {
      skillId: 'skill-1',
      requiredLevel: 2,
      weight: 3,
      learningOrder: 4,
      isRequired: true,
      roadmapPhase: RoadmapPhase.CAREER_TRACK,
    });

    assert.equal(createdData.careerGoalId, 'goal-1');
    assert.equal(createdData.specializationId, null);
    assert.equal(createdData.skillId, 'skill-1');
    assert.deepEqual(invalidationInput, {
      careerGoalId: 'goal-1',
      specializationId: null,
    });
  });
});

describe('SpecializationsService required skill scope', () => {
  it('creates specialization-level required skills with matching careerGoalId and specializationId', async () => {
    let createdData: any;
    let invalidationInput: any;
    const tx = {
      careerRequiredSkill: {
        create: async ({ data }: any) => {
          createdData = data;
          return { id: 'required-skill-1', ...data };
        },
      },
    };
    const service = new SpecializationsService(
      {
        specialization: {
          findUnique: async () => ({
            id: 'specialization-1',
            careerGoalId: 'goal-1',
            status: CatalogStatus.ACTIVE,
          }),
        },
        skill: {
          findUnique: async () => ({
            id: 'skill-1',
            status: CatalogStatus.ACTIVE,
          }),
        },
        careerRequiredSkill: {
          findFirst: async () => null,
        },
        $transaction: async (callback: (tx: any) => Promise<unknown>) =>
          callback(tx),
      } as any,
      {
        invalidateCareerRequiredSkillChange: async (
          _txArg: any,
          inputArg: any,
        ) => {
          invalidationInput = inputArg;
        },
      } as any,
    );

    await service.createRequiredSkill('specialization-1', {
      skillId: 'skill-1',
      requiredLevel: 3,
      weight: 5,
      learningOrder: 2,
      isRequired: true,
      roadmapPhase: RoadmapPhase.SPECIALIZATION,
    });

    assert.equal(createdData.careerGoalId, 'goal-1');
    assert.equal(createdData.specializationId, 'specialization-1');
    assert.equal(createdData.skillId, 'skill-1');
    assert.deepEqual(invalidationInput, {
      careerGoalId: 'goal-1',
      specializationId: 'specialization-1',
    });
  });

  it('does not create duplicate specializations for the same career goal', async () => {
    const specializations = [
      {
        id: 'specialization-existing',
        careerGoalId: 'goal-1',
        name: 'Backend Engineering',
      },
    ];
    const service = new SpecializationsService(
      {
        careerGoal: {
          findUnique: async () => ({ id: 'goal-1' }),
        },
        specialization: {
          findFirst: async ({ where }: any) =>
            specializations.find(
              (specialization) =>
                specialization.careerGoalId === where.careerGoalId &&
                specialization.name.toLowerCase() ===
                  where.name.equals.toLowerCase(),
            ) ?? null,
          create: async ({ data }: any) => {
            specializations.push({
              id: 'specialization-new',
              careerGoalId: data.careerGoalId,
              name: data.name,
            });
            return { id: 'specialization-new', ...data };
          },
        },
      } as any,
      {} as any,
    );

    await assert.rejects(
      () =>
        service.create({
          careerGoalId: 'goal-1',
          name: 'backend engineering',
        }),
      ConflictException,
    );

    assert.equal(specializations.length, 1);
  });
});

describe('CareerGoalsService required skill invalidation', () => {
  it('updates a required skill and invalidates the affected career context in the same transaction', async () => {
    let transactionUsed = false;
    let updateArgs: any;
    let invalidationArgs: any;
    const tx = {
      careerRequiredSkill: {
        update: async (args: any) => {
          updateArgs = args;
          return { id: 'required-skill-1' };
        },
      },
    };
    const service = new CareerGoalsService(
      {
        careerRequiredSkill: {
          findFirst: async () => ({
            id: 'required-skill-1',
            careerGoalId: 'goal-a',
            specializationId: null,
          }),
        },
        $transaction: async (callback: (tx: any) => Promise<unknown>) => {
          transactionUsed = true;
          return callback(tx);
        },
      } as any,
      {} as any,
      {
        invalidateCareerRequiredSkillChange: async (
          txArg: any,
          input: any,
        ) => {
          invalidationArgs = { tx: txArg, input };
        },
      } as any,
    );

    await service.updateRequiredSkill('goal-a', 'required-skill-1', {
      requiredLevel: 2,
    });

    assert.equal(transactionUsed, true);
    assert.deepEqual(updateArgs.data, { requiredLevel: 2 });
    assert.deepEqual(invalidationArgs, {
      tx,
      input: {
        careerGoalId: 'goal-a',
        specializationId: null,
      },
    });
  });

  it('rolls back the required skill update when invalidation fails', async () => {
    let persistedRequiredLevel = 1;
    const tx = {
      careerRequiredSkill: {
        update: async (args: any) => {
          persistedRequiredLevel = args.data.requiredLevel;
          return { id: 'required-skill-1' };
        },
      },
    };
    const service = new CareerGoalsService(
      {
        careerRequiredSkill: {
          findFirst: async () => ({
            id: 'required-skill-1',
            careerGoalId: 'goal-a',
            specializationId: null,
          }),
        },
        $transaction: async (callback: (tx: any) => Promise<unknown>) => {
          const previousRequiredLevel = persistedRequiredLevel;
          try {
            return await callback(tx);
          } catch (error) {
            persistedRequiredLevel = previousRequiredLevel;
            throw error;
          }
        },
      } as any,
      {} as any,
      {
        invalidateCareerRequiredSkillChange: async () => {
          throw new Error('invalidate failed');
        },
      } as any,
    );

    await assert.rejects(
      () =>
        service.updateRequiredSkill('goal-a', 'required-skill-1', {
          requiredLevel: 2,
        }),
      /invalidate failed/,
    );

    assert.equal(persistedRequiredLevel, 1);
  });

  it('deletes a required skill and invalidates the affected career context in the same transaction', async () => {
    let transactionUsed = false;
    let deleteArgs: any;
    let invalidationArgs: any;
    const tx = {
      careerRequiredSkill: {
        delete: async (args: any) => {
          deleteArgs = args;
          return { id: 'required-skill-1' };
        },
      },
    };
    const service = new CareerGoalsService(
      {
        careerRequiredSkill: {
          findFirst: async () => ({
            id: 'required-skill-1',
            careerGoalId: 'goal-a',
            specializationId: null,
          }),
        },
        $transaction: async (callback: (tx: any) => Promise<unknown>) => {
          transactionUsed = true;
          return callback(tx);
        },
      } as any,
      {} as any,
      {
        invalidateCareerRequiredSkillChange: async (
          txArg: any,
          input: any,
        ) => {
          invalidationArgs = { tx: txArg, input };
        },
      } as any,
    );

    const result = await service.removeRequiredSkill(
      'goal-a',
      'required-skill-1',
    );

    assert.deepEqual(result, { deleted: true });
    assert.equal(transactionUsed, true);
    assert.deepEqual(deleteArgs, { where: { id: 'required-skill-1' } });
    assert.deepEqual(invalidationArgs, {
      tx,
      input: {
        careerGoalId: 'goal-a',
        specializationId: null,
      },
    });
  });

  it('rolls back a required skill delete when invalidation fails', async () => {
    let requiredSkillExists = true;
    const tx = {
      careerRequiredSkill: {
        delete: async () => {
          requiredSkillExists = false;
          return { id: 'required-skill-1' };
        },
      },
    };
    const service = new CareerGoalsService(
      {
        careerRequiredSkill: {
          findFirst: async () =>
            requiredSkillExists
              ? {
                  id: 'required-skill-1',
                  careerGoalId: 'goal-a',
                  specializationId: null,
                }
              : null,
        },
        $transaction: async (callback: (tx: any) => Promise<unknown>) => {
          const previousRequiredSkillExists = requiredSkillExists;
          try {
            return await callback(tx);
          } catch (error) {
            requiredSkillExists = previousRequiredSkillExists;
            throw error;
          }
        },
      } as any,
      {} as any,
      {
        invalidateCareerRequiredSkillChange: async () => {
          throw new Error('invalidate failed');
        },
      } as any,
    );

    await assert.rejects(
      () => service.removeRequiredSkill('goal-a', 'required-skill-1'),
      /invalidate failed/,
    );

    assert.equal(requiredSkillExists, true);
  });
});
