import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CareerGoalsService } from './career-goals.service';

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
});
