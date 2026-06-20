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
  VerificationStatus,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  buildPaginatedResult,
  getPagination,
} from '../common/pagination/pagination.util';
import { buildUploadedFileUrl } from '../common/upload/file-upload.options';
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

@Injectable()
export class EvidencesService {
  constructor(private readonly prisma: PrismaService) {}

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

      await this.updateRelatedEntityStatus(
        tx,
        dto.relatedEntityType,
        dto.relatedEntityId,
        VerificationStatus.PENDING,
      );

      return evidence;
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

    await this.assertCanAccessEvidence(user, evidence.studentId);
    return evidence;
  }

  async verify(user: AuthenticatedUser, id: string, dto: VerifyEvidenceDto = {}) {
    const evidence = await this.getEvidenceForReview(user, id);
    if (
      dto.currentLevel !== undefined &&
      evidence.relatedEntityType !== EvidenceEntityType.SKILL
    ) {
      throw new BadRequestException(
        'Current level can only be set when verifying skill evidence',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.evidence.update({
        where: { id },
        data: {
          status: EvidenceStatus.VERIFIED,
          reviewedById: user.id,
          reviewedAt: new Date(),
          reviewerNote: null,
        },
        include: EVIDENCE_INCLUDE,
      });

      await this.updateRelatedEntityStatus(
        tx,
        evidence.relatedEntityType,
        evidence.relatedEntityId,
        VerificationStatus.VERIFIED,
        user.id,
        dto.currentLevel,
      );

      return updated;
    });
  }

  async reject(user: AuthenticatedUser, id: string, dto: RejectEvidenceDto) {
    const evidence = await this.getEvidenceForReview(user, id);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.evidence.update({
        where: { id },
        data: {
          status: EvidenceStatus.REJECTED,
          reviewedById: user.id,
          reviewedAt: new Date(),
          reviewerNote: dto.reviewerNote,
        },
        include: EVIDENCE_INCLUDE,
      });

      await this.updateRelatedEntityStatus(
        tx,
        evidence.relatedEntityType,
        evidence.relatedEntityId,
        VerificationStatus.REJECTED,
      );

      return updated;
    });
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

    return buildPaginatedResult(data, total, page, limit);
  }

  private async getEvidenceForReview(user: AuthenticatedUser, id: string) {
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
    if (evidence.status !== EvidenceStatus.PENDING) {
      throw new BadRequestException('Evidence has already been reviewed');
    }

    await this.assertCanReviewEvidence(user, evidence.studentId);
    return evidence;
  }

  private async assertCanAccessEvidence(user: AuthenticatedUser, studentId: string) {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    if (user.role === UserRole.STUDENT) {
      const ownStudentId = await this.getStudentIdByUserId(user.id);
      if (ownStudentId === studentId) {
        return;
      }
    }

    if (user.role === UserRole.LECTURER) {
      await this.assertLecturerAssignedToStudent(user.id, studentId);
      return;
    }

    throw new ForbiddenException('You do not have permission to access this evidence');
  }

  private async assertCanReviewEvidence(user: AuthenticatedUser, studentId: string) {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    if (user.role === UserRole.LECTURER) {
      await this.assertLecturerAssignedToStudent(user.id, studentId);
      return;
    }

    throw new ForbiddenException('You do not have permission to review this evidence');
  }

  private async assertLecturerAssignedToStudent(userId: string, studentId: string) {
    const lecturer = await this.getLecturerByUserId(userId);
    const assignment = await this.prisma.advisorAssignment.findFirst({
      where: {
        lecturerId: lecturer.id,
        studentId,
        status: AssignmentStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (!assignment) {
      throw new ForbiddenException('Lecturer is not assigned to this student');
    }
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

  private updateRelatedEntityStatus(
    tx: Prisma.TransactionClient,
    entityType: EvidenceEntityType,
    entityId: string,
    status: VerificationStatus,
    reviewedById?: string,
    currentLevel?: number,
  ) {
    switch (entityType) {
      case EvidenceEntityType.SKILL:
        return tx.studentSkill.update({
          where: { id: entityId },
          data: {
            evidenceStatus: status,
            verifiedById: status === VerificationStatus.VERIFIED ? reviewedById : null,
            verifiedAt: status === VerificationStatus.VERIFIED ? new Date() : null,
            ...(status === VerificationStatus.VERIFIED && currentLevel !== undefined
              ? { currentLevel }
              : {}),
          },
        });
      case EvidenceEntityType.PROJECT:
        return tx.studentProject.update({
          where: { id: entityId },
          data: { verificationStatus: status },
        });
      case EvidenceEntityType.CERTIFICATE:
        return tx.studentCertificate.update({
          where: { id: entityId },
          data: { verificationStatus: status },
        });
      case EvidenceEntityType.ACTIVITY:
        return tx.studentActivity.update({
          where: { id: entityId },
          data: { verificationStatus: status },
        });
      case EvidenceEntityType.EXPERIENCE:
        return tx.studentExperience.update({
          where: { id: entityId },
          data: { verificationStatus: status },
        });
      case EvidenceEntityType.ROADMAP_ITEM:
        return Promise.resolve();
    }
  }
}
