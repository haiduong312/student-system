import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  EvidenceEntityType,
  EvidenceStatus,
  UserRole,
} from '@prisma/client';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { EvidencesService } from './evidences.service';

type EvidenceRecord = {
  id: string;
  studentId: string;
  relatedEntityType: EvidenceEntityType;
  relatedEntityId: string;
  fileUrl?: string | null;
  evidenceUrl?: string | null;
  note?: string | null;
  status: EvidenceStatus;
  reviewedById?: string | null;
  reviewedAt?: Date | null;
  reviewerNote?: string | null;
};

const user = (role: UserRole, id = `${role.toLowerCase()}-1`): AuthenticatedUser => ({
  id,
  email: `${id}@example.edu`,
  fullName: id,
  role,
});

const includeEvidence = (evidence: EvidenceRecord) => ({
  ...evidence,
  student: {
    id: evidence.studentId,
    user: {
      id: `user-${evidence.studentId}`,
      fullName: 'Student',
      email: 'student@example.edu',
      role: UserRole.STUDENT,
    },
  },
  reviewedBy: evidence.reviewedById
    ? {
        id: evidence.reviewedById,
        fullName: 'Reviewer',
        email: 'reviewer@example.edu',
        role: UserRole.LECTURER,
      }
    : null,
});

const selectEvidence = (evidence: EvidenceRecord, select: Record<string, boolean>) =>
  Object.fromEntries(
    Object.keys(select).map((key) => [key, evidence[key as keyof EvidenceRecord]]),
  );

function createService(
  evidences: EvidenceRecord[],
  options: {
    assertCanAccessStudent?: () => Promise<void>;
    assertCanReviewStudentEvidence?: () => Promise<void>;
  } = {},
) {
  const verificationCalls: any[] = [];
  const activityLogs: any[] = [];
  const findEvidence = (id: string) =>
    evidences.find((evidence) => evidence.id === id) ?? null;
  const tx = {
    evidence: {
      update: async (args: any) => {
        const evidence = evidences.find(
          (record) =>
            record.id === args.where.id &&
            (!args.where.status || record.status === args.where.status),
        );
        if (!evidence) {
          throw new Error('evidence update target not found');
        }

        Object.assign(evidence, args.data);
        return includeEvidence(evidence);
      },
      findUnique: async (args: any) => {
        const evidence = findEvidence(args.where.id);
        if (!evidence) {
          return null;
        }
        return args.select ? selectEvidence(evidence, args.select) : includeEvidence(evidence);
      },
    },
  };
  const prisma = {
    evidence: {
      findUnique: async (args: any) => {
        const evidence = findEvidence(args.where.id);
        if (!evidence) {
          return null;
        }
        return args.select ? selectEvidence(evidence, args.select) : includeEvidence(evidence);
      },
    },
    $transaction: async (callback: any) => callback(tx),
  };

  const service = new EvidencesService(
    prisma as any,
    {
      assertCanAccessStudent:
        options.assertCanAccessStudent ?? (async () => undefined),
      assertCanReviewStudentEvidence:
        options.assertCanReviewStudentEvidence ?? (async () => undefined),
    } as any,
    {
      record: async (entry: any) => {
        activityLogs.push(entry);
      },
    } as any,
    {
      updateResourceVerificationStatusFromEvidence: async (...args: any[]) => {
        verificationCalls.push(args);
      },
    } as any,
  );

  return { service, verificationCalls, activityLogs };
}

describe('EvidencesService review permissions and metadata', () => {
  it('does not allow a student to verify evidence', async () => {
    const evidences = [
      {
        id: 'evidence-1',
        studentId: 'student-1',
        relatedEntityType: EvidenceEntityType.SKILL,
        relatedEntityId: 'student-skill-1',
        status: EvidenceStatus.PENDING,
      },
    ];
    const { service } = createService(evidences, {
      assertCanReviewStudentEvidence: async () => {
        throw new ForbiddenException('You do not have permission to review this evidence');
      },
    });

    await assert.rejects(
      () => service.verify(user(UserRole.STUDENT), 'evidence-1'),
      ForbiddenException,
    );
    assert.equal(evidences[0].status, EvidenceStatus.PENDING);
  });

  it('allows admin verification and stores reviewer metadata plus private file URL', async () => {
    const admin = user(UserRole.ADMIN, 'admin-1');
    const evidences = [
      {
        id: 'evidence-1',
        studentId: 'student-1',
        relatedEntityType: EvidenceEntityType.SKILL,
        relatedEntityId: 'student-skill-1',
        fileUrl: '/uploads/profiles/proof.pdf',
        status: EvidenceStatus.PENDING,
      },
    ];
    const { service, verificationCalls, activityLogs } = createService(evidences);

    const result = await service.verify(admin, 'evidence-1', { currentLevel: 3 });

    assert.equal(evidences[0].status, EvidenceStatus.VERIFIED);
    assert.equal(evidences[0].reviewedById, 'admin-1');
    assert.ok(evidences[0].reviewedAt instanceof Date);
    assert.equal(evidences[0].reviewerNote, null);
    assert.equal(result.fileUrl, '/api/uploads/profiles/proof.pdf');
    assert.equal(result.fileUrl.startsWith('/api/uploads/profiles/'), true);
    assert.equal(result.fileUrl.includes(process.cwd()), false);
    assert.equal(verificationCalls.length, 1);
    assert.equal(verificationCalls[0][0], EvidenceEntityType.SKILL);
    assert.equal(verificationCalls[0][1], 'student-skill-1');
    assert.equal(verificationCalls[0][2].reviewedById, 'admin-1');
    assert.equal(verificationCalls[0][2].currentLevel, 3);
    assert.equal(activityLogs[0].action, 'EVIDENCE_VERIFIED');
  });

  it('allows an authorized reviewer to reject pending evidence with reviewer note', async () => {
    const lecturer = user(UserRole.LECTURER, 'lecturer-1');
    const evidences = [
      {
        id: 'evidence-1',
        studentId: 'student-1',
        relatedEntityType: EvidenceEntityType.PROJECT,
        relatedEntityId: 'project-1',
        status: EvidenceStatus.PENDING,
      },
    ];
    const { service, verificationCalls, activityLogs } = createService(evidences);

    await service.reject(lecturer, 'evidence-1', {
      reviewerNote: 'The proof does not match this project.',
    });

    assert.equal(evidences[0].status, EvidenceStatus.REJECTED);
    assert.equal(evidences[0].reviewedById, 'lecturer-1');
    assert.ok(evidences[0].reviewedAt instanceof Date);
    assert.equal(
      evidences[0].reviewerNote,
      'The proof does not match this project.',
    );
    assert.equal(verificationCalls.length, 1);
    assert.equal(verificationCalls[0][0], EvidenceEntityType.PROJECT);
    assert.equal(activityLogs[0].action, 'EVIDENCE_REJECTED');
  });

  it('does not allow already verified evidence to be rejected directly', async () => {
    const evidences = [
      {
        id: 'evidence-1',
        studentId: 'student-1',
        relatedEntityType: EvidenceEntityType.SKILL,
        relatedEntityId: 'student-skill-1',
        status: EvidenceStatus.VERIFIED,
        reviewedById: 'reviewer-1',
        reviewedAt: new Date('2026-06-25T08:00:00.000Z'),
      },
    ];
    const { service } = createService(evidences);

    await assert.rejects(
      () =>
        service.reject(user(UserRole.ADMIN), 'evidence-1', {
          reviewerNote: 'Reject after verify',
        }),
      BadRequestException,
    );
    assert.equal(evidences[0].status, EvidenceStatus.VERIFIED);
    assert.equal(evidences[0].reviewedById, 'reviewer-1');
  });

  it('does not allow a user to view evidence from a student they cannot access', async () => {
    const evidences = [
      {
        id: 'evidence-1',
        studentId: 'student-2',
        relatedEntityType: EvidenceEntityType.CERTIFICATE,
        relatedEntityId: 'certificate-1',
        status: EvidenceStatus.PENDING,
      },
    ];
    const { service } = createService(evidences, {
      assertCanAccessStudent: async () => {
        throw new ForbiddenException('You do not have permission to access this evidence');
      },
    });

    await assert.rejects(
      () => service.findOne(user(UserRole.STUDENT, 'student-user-1'), 'evidence-1'),
      ForbiddenException,
    );
  });

  it('does not let a student upload evidence for another student profile entity by changing relatedEntityId', async () => {
    let transactionCalled = false;
    const service = new EvidencesService(
      {
        student: {
          findUnique: async ({ where }: any) =>
            where.userId === 'user-1' ? { id: 'student-1' } : null,
        },
        studentSkill: {
          findFirst: async ({ where }: any) => {
            assert.deepEqual(where, {
              id: 'skill-owned-by-student-2',
              studentId: 'student-1',
            });
            return null;
          },
        },
        $transaction: async () => {
          transactionCalled = true;
        },
      } as any,
      {} as any,
      { record: async () => undefined } as any,
      {} as any,
    );

    await assert.rejects(
      () =>
        service.upload('user-1', {
          relatedEntityType: EvidenceEntityType.SKILL,
          relatedEntityId: 'skill-owned-by-student-2',
          evidenceUrl: 'https://example.edu/proof',
        }),
      /Related profile entity not found/,
    );
    assert.equal(transactionCalled, false);
  });
});
