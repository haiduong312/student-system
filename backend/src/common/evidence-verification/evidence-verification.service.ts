import { Injectable } from '@nestjs/common';
import {
  EvidenceEntityType,
  EvidenceStatus,
  Prisma,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type VerificationClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class EvidenceVerificationService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateResourceVerificationStatus(
    resourceType: EvidenceEntityType,
    resourceId: string,
    client: VerificationClient = this.prisma,
  ) {
    const counts = await client.evidence.groupBy({
      by: ['status'],
      where: {
        relatedEntityType: resourceType,
        relatedEntityId: resourceId,
      },
      _count: { _all: true },
    });
    const byStatus = new Map(
      counts.map((item) => [item.status, item._count._all]),
    );
    const verified = byStatus.get(EvidenceStatus.VERIFIED) ?? 0;
    const pending = byStatus.get(EvidenceStatus.PENDING) ?? 0;
    const rejected = byStatus.get(EvidenceStatus.REJECTED) ?? 0;

    if (verified > 0) {
      return VerificationStatus.VERIFIED;
    }
    if (pending > 0) {
      return VerificationStatus.PENDING;
    }
    if (rejected > 0) {
      return VerificationStatus.REJECTED;
    }

    return VerificationStatus.NO_EVIDENCE;
  }

  async updateResourceVerificationStatusFromEvidence(
    resourceType: EvidenceEntityType,
    resourceId: string,
    options: {
      client?: VerificationClient;
      reviewedById?: string;
      currentLevel?: number;
    } = {},
  ) {
    const client = options.client ?? this.prisma;
    const status = await this.calculateResourceVerificationStatus(
      resourceType,
      resourceId,
      client,
    );

    await this.updateResourceVerificationStatus(
      resourceType,
      resourceId,
      status,
      client,
      options,
    );

    return status;
  }

  async updateResourceVerificationStatus(
    resourceType: EvidenceEntityType,
    resourceId: string,
    status: VerificationStatus,
    client: VerificationClient = this.prisma,
    options: {
      reviewedById?: string;
      currentLevel?: number;
    } = {},
  ) {
    switch (resourceType) {
      case EvidenceEntityType.SKILL:
        return this.updateSkillVerificationStatus(
          client,
          resourceId,
          status,
          options,
        );
      case EvidenceEntityType.PROJECT:
        return client.studentProject.update({
          where: { id: resourceId },
          data: { verificationStatus: status },
        });
      case EvidenceEntityType.CERTIFICATE:
        return client.studentCertificate.update({
          where: { id: resourceId },
          data: { verificationStatus: status },
        });
      case EvidenceEntityType.ACTIVITY:
        return client.studentActivity.update({
          where: { id: resourceId },
          data: { verificationStatus: status },
        });
      case EvidenceEntityType.EXPERIENCE:
        return client.studentExperience.update({
          where: { id: resourceId },
          data: { verificationStatus: status },
        });
      case EvidenceEntityType.ROADMAP_ITEM:
        return null;
    }
  }

  private async updateSkillVerificationStatus(
    client: VerificationClient,
    skillId: string,
    status: VerificationStatus,
    options: {
      reviewedById?: string;
      currentLevel?: number;
    },
  ) {
    const latestVerifiedEvidence =
      status === VerificationStatus.VERIFIED
        ? await client.evidence.findFirst({
            where: {
              relatedEntityType: EvidenceEntityType.SKILL,
              relatedEntityId: skillId,
              status: EvidenceStatus.VERIFIED,
            },
            orderBy: [{ reviewedAt: 'desc' }, { updatedAt: 'desc' }],
            select: { reviewedById: true, reviewedAt: true },
          })
        : null;

    return client.studentSkill.update({
      where: { id: skillId },
      data: {
        evidenceStatus: status,
        verifiedById:
          status === VerificationStatus.VERIFIED
            ? latestVerifiedEvidence?.reviewedById ?? options.reviewedById ?? null
            : null,
        verifiedAt:
          status === VerificationStatus.VERIFIED
            ? latestVerifiedEvidence?.reviewedAt ?? new Date()
            : null,
        ...(status === VerificationStatus.VERIFIED &&
        options.currentLevel !== undefined
          ? { currentLevel: options.currentLevel }
          : {}),
      },
    });
  }
}
