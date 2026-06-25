import {
  EvidenceEntityType,
  EvidenceStatus,
  VerificationStatus,
} from '@prisma/client';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EvidenceVerificationService } from './evidence-verification.service';

const countRow = (status: EvidenceStatus, count: number) => ({
  status,
  _count: { _all: count },
});

describe('EvidenceVerificationService status priority', () => {
  const createService = (counts: Array<ReturnType<typeof countRow>>) =>
    new EvidenceVerificationService({
      evidence: {
        groupBy: async () => counts,
      },
    } as any);

  it('returns VERIFIED when all evidence for the resource is verified', async () => {
    const service = createService([countRow(EvidenceStatus.VERIFIED, 2)]);

    const status = await service.calculateResourceVerificationStatus(
      EvidenceEntityType.PROJECT,
      'project-1',
    );

    assert.equal(status, VerificationStatus.VERIFIED);
  });

  it('gives PENDING priority when a new pending evidence exists after verified evidence', async () => {
    const service = createService([
      countRow(EvidenceStatus.VERIFIED, 1),
      countRow(EvidenceStatus.PENDING, 1),
    ]);

    const status = await service.calculateResourceVerificationStatus(
      EvidenceEntityType.CERTIFICATE,
      'certificate-1',
    );

    assert.equal(status, VerificationStatus.PENDING);
  });

  it('keeps VERIFIED priority over rejected evidence when verified evidence still exists', async () => {
    const service = createService([
      countRow(EvidenceStatus.VERIFIED, 1),
      countRow(EvidenceStatus.REJECTED, 1),
    ]);

    const status = await service.calculateResourceVerificationStatus(
      EvidenceEntityType.ACTIVITY,
      'activity-1',
    );

    assert.equal(status, VerificationStatus.VERIFIED);
  });

  it('returns REJECTED when the resource only has rejected evidence', async () => {
    const service = createService([countRow(EvidenceStatus.REJECTED, 2)]);

    const status = await service.calculateResourceVerificationStatus(
      EvidenceEntityType.EXPERIENCE,
      'experience-1',
    );

    assert.equal(status, VerificationStatus.REJECTED);
  });

  it('updates skill verification metadata from the latest verified evidence reviewer', async () => {
    const reviewedAt = new Date('2026-06-25T08:00:00.000Z');
    let updateArgs: any;
    const service = new EvidenceVerificationService({
      evidence: {
        groupBy: async () => [countRow(EvidenceStatus.VERIFIED, 1)],
        findFirst: async (args: any) => {
          assert.deepEqual(args.where, {
            relatedEntityType: EvidenceEntityType.SKILL,
            relatedEntityId: 'student-skill-1',
            status: EvidenceStatus.VERIFIED,
          });
          assert.deepEqual(args.select, { reviewedById: true, reviewedAt: true });
          return { reviewedById: 'reviewer-1', reviewedAt };
        },
      },
      studentSkill: {
        update: async (args: any) => {
          updateArgs = args;
          return args.data;
        },
      },
    } as any);

    const status = await service.updateResourceVerificationStatusFromEvidence(
      EvidenceEntityType.SKILL,
      'student-skill-1',
      { currentLevel: 3 },
    );

    assert.equal(status, VerificationStatus.VERIFIED);
    assert.deepEqual(updateArgs.where, { id: 'student-skill-1' });
    assert.equal(updateArgs.data.evidenceStatus, VerificationStatus.VERIFIED);
    assert.equal(updateArgs.data.verifiedById, 'reviewer-1');
    assert.equal(updateArgs.data.verifiedAt, reviewedAt);
    assert.equal(updateArgs.data.currentLevel, 3);
  });
});
