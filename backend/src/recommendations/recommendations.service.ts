import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CatalogStatus,
  Prisma,
  ResourceProgressStatus,
  StudentRecommendationResource,
  StudentResourceProgress,
  StudentRecommendationStatus,
  TemplateStatus,
} from '@prisma/client';
import {
  buildPaginatedResult,
  getPagination,
} from '../common/pagination/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { RecommendationQueryDto } from './dto/recommendation-query.dto';
import { UpdateRecommendationStatusDto } from './dto/update-recommendation-status.dto';

const RECOMMENDATION_STATUS_TRANSITIONS: Record<
  StudentRecommendationStatus,
  StudentRecommendationStatus[]
> = {
  [StudentRecommendationStatus.NEW]: [
    StudentRecommendationStatus.SAVED,
    StudentRecommendationStatus.DISMISSED,
  ],
  [StudentRecommendationStatus.SAVED]: [
    StudentRecommendationStatus.IN_PROGRESS,
    StudentRecommendationStatus.DISMISSED,
  ],
  [StudentRecommendationStatus.IN_PROGRESS]: [
    StudentRecommendationStatus.SAVED,
    StudentRecommendationStatus.DONE,
  ],
  [StudentRecommendationStatus.DONE]: [],
  [StudentRecommendationStatus.DISMISSED]: [],
};

type StudentRecommendationWithResources = Prisma.StudentRecommendationGetPayload<{
  include: ReturnType<RecommendationsService['detailInclude']>;
}>;

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMine(userId: string, query: RecommendationQueryDto) {
    const studentId = await this.getStudentIdByUserId(userId);
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.StudentRecommendationWhereInput = {
      studentId,
      skill: { status: CatalogStatus.ACTIVE },
      OR: [
        { recommendationTemplateId: null },
        { recommendationTemplate: { status: TemplateStatus.ACTIVE } },
      ],
      ...(query.status ? { status: query.status } : {}),
      ...(query.skillId ? { skillId: query.skillId } : {}),
      ...(query.search
        ? {
            AND: [
              {
                OR: [
                  { title: { contains: query.search, mode: 'insensitive' } },
                  { description: { contains: query.search, mode: 'insensitive' } },
                  { reason: { contains: query.search, mode: 'insensitive' } },
                  { skill: { name: { contains: query.search, mode: 'insensitive' } } },
                ],
              },
            ],
          }
        : {}),
    };
    const sortBy = ['createdAt', 'updatedAt', 'priorityScore', 'status'].includes(
      query.sortBy ?? '',
    )
      ? query.sortBy!
      : 'priorityScore';

    const [data, total] = await Promise.all([
      this.prisma.studentRecommendation.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: query.sortOrder },
        include: this.detailInclude(),
      }),
      this.prisma.studentRecommendation.count({ where }),
    ]);
    const progressByResourceId = await this.getProgressByResourceId(
      studentId,
      data.flatMap((recommendation) =>
        recommendation.resourceLinks.map((resource) => resource.resourceId),
      ),
    );

    return buildPaginatedResult(
      data.map((recommendation) =>
        this.toRecommendationResponse(recommendation, progressByResourceId),
      ),
      total,
      page,
      limit,
    );
  }

  async updateStatus(
    userId: string,
    id: string,
    dto: UpdateRecommendationStatusDto,
  ) {
    const studentId = await this.getStudentIdByUserId(userId);
    const recommendation = await this.prisma.studentRecommendation.findFirst({
      where: {
        id,
        studentId,
        skill: { status: CatalogStatus.ACTIVE },
        OR: [
          { recommendationTemplateId: null },
          { recommendationTemplate: { status: TemplateStatus.ACTIVE } },
        ],
      },
      include: this.detailInclude(),
    });
    if (!recommendation) {
      throw new NotFoundException('Recommendation not found');
    }
    if (recommendation.status === dto.status) {
      const progressByResourceId = await this.getProgressByResourceId(
        studentId,
        recommendation.resourceLinks.map((resource) => resource.resourceId),
      );
      return this.toRecommendationResponse(recommendation, progressByResourceId);
    }

    this.assertValidStatusTransition(recommendation.status, dto.status);

    const updated = await this.prisma.studentRecommendation.update({
      where: { id },
      data: { status: dto.status },
      include: this.detailInclude(),
    });
    const progressByResourceId = await this.getProgressByResourceId(
      studentId,
      updated.resourceLinks.map((resource) => resource.resourceId),
    );

    return this.toRecommendationResponse(updated, progressByResourceId);
  }

  private detailInclude() {
    return {
      skill: true,
      recommendationTemplate: true,
      analysisResult: true,
      resourceLinks: {
        orderBy: [
          { orderIndex: 'asc' as const },
          { createdAt: 'asc' as const },
        ],
      },
    };
  }

  private toRecommendationResponse(
    recommendation: StudentRecommendationWithResources,
    progressByResourceId: Map<string, StudentResourceProgress>,
  ) {
    const { resourceLinks, ...baseRecommendation } = recommendation;
    const resources = resourceLinks.map((resource) =>
      this.toSnapshotResourceResponse(
        resource,
        progressByResourceId.get(resource.resourceId),
      ),
    );

    return {
      ...baseRecommendation,
      resources,
      isAllResourcesCompleted:
        resources.length > 0 &&
        resources.every(
          (resource) =>
            resource.progressStatus === ResourceProgressStatus.COMPLETED,
        ),
    };
  }

  private toSnapshotResourceResponse(
    resource: StudentRecommendationResource,
    progress?: StudentResourceProgress,
  ) {
    return {
      id: resource.id,
      resourceId: resource.resourceId,
      orderIndex: resource.orderIndex,
      resourceTitle: resource.resourceTitle,
      resourceDescription: resource.resourceDescription,
      resourceType: resource.resourceType,
      resourceUrl: resource.resourceUrl,
      provider: resource.provider,
      estimatedDuration: resource.estimatedDuration,
      difficultyLevel: resource.difficultyLevel,
      progressStatus: progress?.status ?? ResourceProgressStatus.NOT_STARTED,
      startedAt: progress?.startedAt ?? null,
      completedAt: progress?.completedAt ?? null,
      lastAccessedAt: progress?.lastAccessedAt ?? null,
      note: progress?.note ?? null,
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
    };
  }

  private async getProgressByResourceId(studentId: string, resourceIds: string[]) {
    const uniqueResourceIds = Array.from(new Set(resourceIds));
    if (!uniqueResourceIds.length) {
      return new Map<string, StudentResourceProgress>();
    }

    const progress = await this.prisma.studentResourceProgress.findMany({
      where: {
        studentId,
        resourceId: { in: uniqueResourceIds },
      },
    });

    return new Map(progress.map((item) => [item.resourceId, item]));
  }

  private assertValidStatusTransition(
    currentStatus: StudentRecommendationStatus,
    nextStatus: StudentRecommendationStatus,
  ) {
    const allowedNextStatuses = RECOMMENDATION_STATUS_TRANSITIONS[currentStatus];
    if (allowedNextStatuses.includes(nextStatus)) {
      return;
    }

    if (
      currentStatus === StudentRecommendationStatus.DONE ||
      currentStatus === StudentRecommendationStatus.DISMISSED
    ) {
      throw new BadRequestException(
        `Recommendation in ${currentStatus} status cannot be changed`,
      );
    }

    throw new BadRequestException(
      `Invalid recommendation status transition: ${currentStatus} -> ${nextStatus}`,
    );
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
}
