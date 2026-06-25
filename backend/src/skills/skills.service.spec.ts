import { CatalogStatus } from '@prisma/client';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SkillsService } from './skills.service';

describe('SkillsService catalog invalidation', () => {
  it('does not invalidate dependent contexts when only metadata changes', async () => {
    let invalidated = false;
    const service = new SkillsService(
      {
        skill: {
          findUnique: async () => ({
            id: 'skill-1',
            status: CatalogStatus.ACTIVE,
          }),
        },
        $transaction: async (callback: (tx: any) => Promise<unknown>) =>
          callback({
            skill: {
              update: async () => ({
                id: 'skill-1',
                name: 'JavaScript',
                status: CatalogStatus.ACTIVE,
              }),
            },
          }),
      } as any,
      { record: async () => undefined } as any,
      {
        invalidateSkillCatalogChange: async () => {
          invalidated = true;
        },
      } as any,
    );

    await service.update('skill-1', { name: 'JavaScript' });

    assert.equal(invalidated, false);
  });

  it('invalidates dependent contexts when a skill is deactivated', async () => {
    let invalidationArgs: any;
    const tx = {
      skill: {
        update: async () => ({
          id: 'skill-1',
          name: 'JavaScript',
          status: CatalogStatus.INACTIVE,
        }),
      },
    };
    const service = new SkillsService(
      {
        skill: {
          findUnique: async () => ({
            id: 'skill-1',
            status: CatalogStatus.ACTIVE,
          }),
        },
        $transaction: async (callback: (tx: any) => Promise<unknown>) =>
          callback(tx),
      } as any,
      { record: async () => undefined } as any,
      {
        invalidateSkillCatalogChange: async (txArg: any, skillId: string) => {
          invalidationArgs = { tx: txArg, skillId };
        },
      } as any,
    );

    await service.update('skill-1', { status: CatalogStatus.INACTIVE });

    assert.deepEqual(invalidationArgs, { tx, skillId: 'skill-1' });
  });
});
