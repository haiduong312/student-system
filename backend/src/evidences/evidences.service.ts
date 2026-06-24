import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssignmentStatus,
  EvidenceEntityType,
  EvidenceStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { EvidenceVerificationService } from '../common/evidence-verification/evidence-verification.service';
import {
  buildPaginatedResult,
  getPagination,
} from '../common/pagination/pagination.util';
import { StudentAccessPolicyService } from '../common/student-access/student-access-policy.service';
import {
  buildPrivateUploadedFileUrlFromStoredUrl,
  buildUploadedFileUrl,
} from '../common/upload/file-upload.options';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEvidenceDto } from './dto/create-evidence.dto';
import { EvidenceQueryDto } from './dto/evidence-query.dto';
import { RejectEvidenceDto } from './dto/reject-evidence.dto';
import { VerifyEvidenceDto } from './dto/verify-evidence.dto';

const EVIDENCE_INCLUDE = {
  student: {
    include: {
      user: {
        select: { id: true, fullName: true, email: true, role: true },
      },
    },
  },
  reviewedBy: {
    select: { id: true, fullName: true, email: true, role: true },
  },
};

type ReviewTargetStatus =
  | typeof EvidenceStatus.VERIFIED
  | typeof EvidenceStatus.REJECTED;

@Injectable()
export class EvidencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentAccessPolicy: StudentAccessPolicyService,
    private readonly activityLogs: ActivityLogsService,
    private readonly evidenceVerification: EvidenceVerificationService,
  ) {}

  async upload(userId: string, dto: CreateEvidenceDto, file?: any) {
    if (!file && !dto.evidenceUrl) {
      throw new BadRequestException('Either file or evidenceUrl is required');
    }

    const studentId = await this.getStudentIdByUserId(userId);
    await this.ensureEntityBelongsToStudent(
      dto.relatedEntityType,
      dto.relatedEntityId,
      studentId,
    );

    return this.prisma.$transaction(async (tx) => {
      const evidence = await tx.evidence.create({
        data: {
          studentId,
          relatedEntityType: dto.relatedEntityType,
          relatedEntityId: dto.relatedEntityId,
          fileUrl: file ? buildUploadedFileUrl(file.filename) : undefined,
          evidenceUrl: dto.evidenceUrl,
          note: dto.note,
          status: EvidenceStatus.PENDING,
        },
        include: EVIDENCE_INCLUDE,
      });

      await this.evidenceVerification.updateResourceVerificationStatusFromEvidence(
        dto.relatedEntityType,
        dto.relatedEntityId,
        { client: tx },
      );

      return this.withPrivateFileUrl(evidence);
    });
  }

  async findMine(userId: string, query: EvidenceQueryDto) {
    const studentId = await this.getStudentIdByUserId(userId);
    return this.findMany({ ...query, studentId }, false);
  }

  async findPending(user: AuthenticatedUser, query: EvidenceQueryDto) {
    const where: Prisma.EvidenceWhereInput = { status: EvidenceStatus.PENDING };

    if (user.role === UserRole.LECTURER) {
      const lecturer = await this.getLecturerByUserId(user.id);
      where.student = {
        advisorAssignments: {
          some: {
            lecturerId: lecturer.id,
            status: AssignmentStatus.ACTIVE,
          },
        },
      };
    }

    return this.findMany({ ...query, status: EvidenceStatus.PENDING }, true, where);
  }

  async findAll(query: EvidenceQueryDto) {
    return this.findMany(query, true);
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const evidence = await this.prisma.evidence.findUnique({
      where: { id },
      include: EVIDENCE_INCLUDE,
    });
    if (!evidence) {
      throw new NotFoundException('Evidence not found');
    }

    await this.studentAccessPolicy.assertCanAccessStudent(
      user,
      evidence.studentId,
      'You do not have permission to access this evidence',
    );
    return this.withPrivateFileUrl(evidence);
  }

  async verify(user: AuthenticatedUser, id: string, dto: VerifyEvidenceDto = {}) {
    const evidence = await this.getEvidenceForReview(
      user,
      id,
      EvidenceStatus.VERIFIED,
    );
    if (
      dto.currentLevel !== undefined &&
      evidence.relatedEntityType !== EvidenceEntityType.SKILL
    ) {
      throw new BadRequestException(
        'Current level can only be set when verifying skill evidence',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await this.updatePendingEvidenceForReview(
        tx,
        id,
        EvidenceStatus.VERIFIED,
        {
          status: EvidenceStatus.VERIFIED,
          reviewedById: user.id,
          reviewedAt: new Date(),
          reviewerNote: null,
        },
      );

      await this.evidenceVerification.updateResourceVerificationStatusFromEvidence(
        evidence.relatedEntityType,
        evidence.relatedEntityId,
        {
          client: tx,
          reviewedById: user.id,
          currentLevel: dto.currentLevel,
        },
      );

      return updated;
    });
    await this.activityLogs.record({
      actorUserId: user.id,
      action: 'EVIDENCE_VERIFIED',
      entityType: 'Evidence',
      entityId: updated.id,
      description: {
        studentId: evidence.studentId,
        relatedEntityType: evidence.relatedEntityType,
        relatedEntityId: evidence.relatedEntityId,
      },
    });

    return this.withPrivateFileUrl(updated);
  }

  async reject(user: AuthenticatedUser, id: string, dto: RejectEvidenceDto) {
    const evidence = await this.getEvidenceForReview(
      user,
      id,
      EvidenceStatus.REJECTED,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await this.updatePendingEvidenceForReview(
        tx,
        id,
        EvidenceStatus.REJECTED,
        {
          status: EvidenceStatus.REJECTED,
          reviewedById: user.id,
          reviewedAt: new Date(),
          reviewerNote: dto.reviewerNote,
        },
      );

      await this.evidenceVerification.updateResourceVerificationStatusFromEvidence(
        evidence.relatedEntityType,
        evidence.relatedEntityId,
        { client: tx },
      );

      return updated;
    });
    await this.activityLogs.record({
      actorUserId: user.id,
      action: 'EVIDENCE_REJECTED',
      entityType: 'Evidence',
      entityId: updated.id,
      description: {
        studentId: evidence.studentId,
        relatedEntityType: evidence.relatedEntityType,
        relatedEntityId: evidence.relatedEntityId,
        reviewerNote: dto.reviewerNote,
      },
    });

    return this.withPrivateFileUrl(updated);
  }

  private async findMany(
    query: EvidenceQueryDto,
    includeStudentSearch: boolean,
    baseWhere: Prisma.EvidenceWhereInput = {},
  ) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.EvidenceWhereInput = {
      ...baseWhere,
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.relatedEntityType ? { relatedEntityType: query.relatedEntityType } : {}),
      ...(query.search
        ? {
            OR: [
              { note: { contains: query.search, mode: 'insensitive' } },
              { reviewerNote: { contains: query.search, mode: 'insensitive' } },
              ...(includeStudentSearch
                ? [
                    {
                      student: {
                        studentCode: {
                          contains: query.search,
                          mode: 'insensitive' as const,
                        },
                      },
                    },
                    {
                      student: {
                        user: {
                          fullName: {
                            contains: query.search,
                            mode: 'insensitive' as const,
                          },
                        },
                      },
                    },
                    {
                      student: {
                        user: {
                          email: {
                            contains: query.search,
                            mode: 'insensitive' as const,
                          },
                        },
                      },
                    },
                  ]
                : []),
            ],
          }
        : {}),
    };
    const sortBy = ['createdAt', 'updatedAt', 'reviewedAt', 'status'].includes(
      query.sortBy ?? '',
    )
      ? query.sortBy!
      : 'createdAt';

    const [data, total] = await Promise.all([
      this.prisma.evidence.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: query.sortOrder },
        include: EVIDENCE_INCLUDE,
      }),
      this.prisma.evidence.count({ where }),
    ]);

    return buildPaginatedResult(
      data.map((evidence) => this.withPrivateFileUrl(evidence)),
      total,
      page,
      limit,
    );
  }

  private withPrivateFileUrl<T extends { fileUrl?: string | null }>(evidence: T): T {
    return {
      ...evidence,
      fileUrl: buildPrivateUploadedFileUrlFromStoredUrl(evidence.fileUrl),
    };
  }

  private async getEvidenceForReview(
    user: AuthenticatedUser,
    id: string,
    targetStatus: ReviewTargetStatus,
  ) {
    const evidence = await this.prisma.evidence.findUnique({
      where: { id },
      select: {
        id: true,
        studentId: true,
        status: true,
        relatedEntityType: true,
        relatedEntityId: true,
      },
    });
    if (!evidence) {
      throw new NotFoundException('Evidence not found');
    }
    this.assertValidReviewTransition(evidence.status, targetStatus);

    await this.studentAccessPolicy.assertCanReviewStudentEvidence(
      user,
      evidence.studentId,
    );
    return evidence;
  }

  private async updatePendingEvidenceForReview(
    tx: Prisma.TransactionClient,
    id: string,
    targetStatus: ReviewTargetStatus,
    data: Prisma.EvidenceUncheckedUpdateInput,
  ) {
    try {
      return await tx.evidence.update({
        where: { id, status: EvidenceStatus.PENDING },
        data,
        include: EVIDENCE_INCLUDE,
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2025'
      ) {
        throw error;
      }

      const current = await tx.evidence.findUnique({
        where: { id },
        select: { status: true },
      });
      if (!current) {
        throw new NotFoundException('Evidence not found');
      }

      this.assertValidReviewTransition(current.status, targetStatus);
      throw new BadRequestException('Evidence is not pending review');
    }
  }

  private assertValidReviewTransition(
    currentStatus: EvidenceStatus,
    targetStatus: ReviewTargetStatus,
  ) {
    if (currentStatus === EvidenceStatus.PENDING) {
      return;
    }

    if (
      currentStatus === EvidenceStatus.VERIFIED &&
      targetStatus === EvidenceStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Verified evidence cannot be rejected directly. Reopen or resubmit is required.',
      );
    }

    if (
      currentStatus === EvidenceStatus.REJECTED &&
      targetStatus === EvidenceStatus.VERIFIED
    ) {
      throw new BadRequestException(
        'Rejected evidence cannot be verified directly. Reopen or resubmit is required.',
      );
    }

    if (currentStatus === EvidenceStatus.VERIFIED) {
      throw new BadRequestException('Evidence has already been verified');
    }

    if (currentStatus === EvidenceStatus.REJECTED) {
      throw new BadRequestException('Evidence has already been rejected');
    }

    throw new BadRequestException('Evidence is not pending review');
  }

  private async getStudentIdByUserId(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!student) {
      throw new ForbiddenException('Current user is not a student');
    }

    return student.id;
  }

  private async getLecturerByUserId(userId: string) {
    const lecturer = await this.prisma.lecturer.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!lecturer) {
      throw new ForbiddenException('Current user is not a lecturer');
    }

    return lecturer;
  }

  private async ensureEntityBelongsToStudent(
    entityType: EvidenceEntityType,
    entityId: string,
    studentId: string,
  ) {
    const entity = await this.findOwnedEntity(entityType, entityId, studentId);
    if (!entity) {
      throw new NotFoundException('Related profile entity not found');
    }
  }

  private findOwnedEntity(
    entityType: EvidenceEntityType,
    entityId: string,
    studentId: string,
  ) {
    const where = { id: entityId, studentId };
    switch (entityType) {
      case EvidenceEntityType.SKILL:
        return this.prisma.studentSkill.findFirst({ where, select: { id: true } });
      case EvidenceEntityType.PROJECT:
        return this.prisma.studentProject.findFirst({ where, select: { id: true } });
      case EvidenceEntityType.CERTIFICATE:
        return this.prisma.studentCertificate.findFirst({ where, select: { id: true } });
      case EvidenceEntityType.ACTIVITY:
        return this.prisma.studentActivity.findFirst({ where, select: { id: true } });
      case EvidenceEntityType.EXPERIENCE:
        return this.prisma.studentExperience.findFirst({ where, select: { id: true } });
      case EvidenceEntityType.ROADMAP_ITEM:
        return this.prisma.roadmapItem.findFirst({
          where: {
            id: entityId,
            roadmap: { studentId },
          },
          select: { id: true },
        });
    }
  }

}
