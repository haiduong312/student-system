import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AnalysisResultStatus,
  CatalogStatus,
  Prisma,
  ResourceProgressStatus,
  RoadmapItemStatus,
  RoadmapStatus,
  StudentResourceProgress,
  StudentRecommendationStatus,
} from '@prisma/client';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import {
  buildPaginatedResult,
  getPagination,
} from '../common/pagination/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLearningResourceDto } from './dto/create-learning-resource.dto';
import { LearningResourceQueryDto } from './dto/learning-resource-query.dto';
import { LinkResourceSkillDto } from './dto/link-resource-skill.dto';
import { UpdateLearningResourceDto } from './dto/update-learning-resource.dto';
import { UpdateResourceProgressDto } from './dto/update-resource-progress.dto';
import { UpdateResourceSkillDto } from './dto/update-resource-skill.dto';

const SORTABLE_FIELDS = new Set([
  'title',
  'provider',
  'resourceType',
  'difficultyLevel',
  'status',
  'createdAt',
  'updatedAt',
]);

const RESOURCE_PROGRESS_STATUS_TRANSITIONS: Record<
  ResourceProgressStatus,
  ResourceProgressStatus[]
> = {
  [ResourceProgressStatus.NOT_STARTED]: [
    ResourceProgressStatus.IN_PROGRESS,
    ResourceProgressStatus.SKIPPED,
  ],
  [ResourceProgressStatus.IN_PROGRESS]: [
    ResourceProgressStatus.COMPLETED,
    ResourceProgressStatus.SKIPPED,
  ],
  [ResourceProgressStatus.COMPLETED]: [ResourceProgressStatus.IN_PROGRESS],
  [ResourceProgressStatus.SKIPPED]: [ResourceProgressStatus.IN_PROGRESS],
};

const COMPLETABLE_RECOMMENDATION_STATUSES: StudentRecommendationStatus[] = [
  StudentRecommendationStatus.NEW,
  StudentRecommendationStatus.SAVED,
  StudentRecommendationStatus.IN_PROGRESS,
];

const ROADMAP_ITEM_STATUSES_COMPLETED_BY_RECOMMENDATION: RoadmapItemStatus[] = [
  RoadmapItemStatus.TODO,
  RoadmapItemStatus.IN_PROGRESS,
];

@Injectable()
export class LearningResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  async create(dto: CreateLearningResourceDto, actorUserId?: string) {
    try {
      const resource = await this.prisma.learningResource.create({
        data: dto,
        include: this.detailInclude(),
      });
      await this.activityLogs.record({
        actorUserId,
        action: 'LEARNING_RESOURCE_CREATED',
        entityType: 'LearningResource',
        entityId: resource.id,
        description: {
          title: resource.title,
          resourceType: resource.resourceType,
          status: resource.status,
        },
      });

      return resource;
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  async findAll(query: LearningResourceQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.LearningResourceWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.resourceType ? { resourceType: query.resourceType } : {}),
      ...(query.difficultyLevel
        ? { difficultyLevel: query.difficultyLevel }
        : {}),
      ...(query.skillId ? { skills: { some: { skillId: query.skillId } } } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { provider: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const sortBy = SORTABLE_FIELDS.has(query.sortBy ?? '')
      ? query.sortBy!
      : 'updatedAt';

    const [data, total] = await Promise.all([
      this.prisma.learningResource.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: query.sortOrder },
        include: this.detailInclude(),
      }),
      this.prisma.learningResource.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string) {
    const resource = await this.prisma.learningResource.findUnique({
      where: { id },
      include: this.detailInclude(),
    });
    if (!resource) {
      throw new NotFoundException('Learning resource not found');
    }

    return resource;
  }

  async update(
    id: string,
    dto: UpdateLearningResourceDto,
    actorUserId?: string,
  ) {
    await this.ensureResourceExists(id);

    try {
      const resource = await this.prisma.learningResource.update({
        where: { id },
        data: dto,
        include: this.detailInclude(),
      });
      await this.activityLogs.record({
        actorUserId,
        action: 'LEARNING_RESOURCE_UPDATED',
        entityType: 'LearningResource',
        entityId: resource.id,
        description: {
          title: resource.title,
          status: resource.status,
          changedFields: Object.keys(dto),
        },
      });

      return resource;
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  async remove(id: string, actorUserId?: string) {
    await this.ensureResourceExists(id);

    const resource = await this.prisma.learningResource.update({
      where: { id },
      data: { status: CatalogStatus.INACTIVE },
      include: this.detailInclude(),
    });
    await this.activityLogs.record({
      actorUserId,
      action: 'LEARNING_RESOURCE_DEACTIVATED',
      entityType: 'LearningResource',
      entityId: resource.id,
      description: { title: resource.title },
    });

    return { deactivated: true, resource };
  }

  async linkSkill(
    resourceId: string,
    dto: LinkResourceSkillDto,
    actorUserId?: string,
  ) {
    await this.ensureResourceExists(resourceId);
    await this.ensureSkillCanBeLinked(dto.skillId);
    await this.ensureSkillLinkDoesNotExist(resourceId, dto);

    try {
      const link = await this.prisma.learningResourceSkill.create({
        data: {
          resourceId,
          skillId: dto.skillId,
          targetLevel: dto.targetLevel,
          roadmapPhase: dto.roadmapPhase,
          relevanceScore: dto.relevanceScore,
          orderIndex: dto.orderIndex,
        },
        include: {
          resource: true,
          skill: { include: { category: true } },
        },
      });
      await this.activityLogs.record({
        actorUserId,
        action: 'LEARNING_RESOURCE_SKILL_LINKED',
        entityType: 'LearningResourceSkill',
        entityId: link.id,
        description: {
          resourceId,
          skillId: dto.skillId,
          targetLevel: dto.targetLevel ?? null,
        },
      });

      return link;
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  async unlinkSkill(
    resourceId: string,
    skillId: string,
    actorUserId?: string,
  ) {
    await this.ensureResourceExists(resourceId);

    const result = await this.prisma.learningResourceSkill.deleteMany({
      where: { resourceId, skillId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Learning resource skill link not found');
    }
    await this.activityLogs.record({
      actorUserId,
      action: 'LEARNING_RESOURCE_SKILL_UNLINKED',
      entityType: 'LearningResourceSkill',
      description: { resourceId, skillId, deletedLinks: result.count },
    });

    return { unlinked: true, deletedLinks: result.count };
  }

  async updateSkillLink(
    resourceId: string,
    skillId: string,
    dto: UpdateResourceSkillDto,
    actorUserId?: string,
  ) {
    await this.ensureResourceExists(resourceId);
    const link = await this.findSkillLinkForUpdate(resourceId, skillId, dto);

    if (dto.targetLevel !== undefined) {
      await this.ensureUpdatedSkillLinkDoesNotDuplicate(
        resourceId,
        skillId,
        dto.targetLevel,
        link.id,
      );
    }

    const updated = await this.prisma.learningResourceSkill.update({
      where: { id: link.id },
      data: {
        targetLevel: dto.targetLevel,
        roadmapPhase: dto.roadmapPhase,
        relevanceScore: dto.relevanceScore,
        orderIndex: dto.orderIndex,
      },
      include: {
        resource: true,
        skill: { include: { category: true } },
      },
    });
    await this.activityLogs.record({
      actorUserId,
      action: 'LEARNING_RESOURCE_SKILL_LINK_UPDATED',
      entityType: 'LearningResourceSkill',
      entityId: updated.id,
      description: {
        resourceId,
        skillId,
        changedFields: Object.keys(dto).filter(
          (field) => field !== 'currentTargetLevel',
        ),
      },
    });

    return updated;
  }

  async updateMyProgress(
    userId: string,
    resourceId: string,
    dto: UpdateResourceProgressDto,
  ) {
    const studentId = await this.getStudentIdByUserId(userId);
    await this.ensureActiveLearningResource(resourceId);
    if (dto.recommendationId) {
      await this.ensureRecommendationContextOwnsResource(
        studentId,
        dto.recommendationId,
        resourceId,
      );
    }

    const existing = await this.prisma.studentResourceProgress.findUnique({
      where: {
        studentId_resourceId: {
          studentId,
          resourceId,
        },
      },
    });
    const currentStatus =
      existing?.status ?? ResourceProgressStatus.NOT_STARTED;
    this.assertValidProgressTransition(currentStatus, dto.status, Boolean(existing));

    const now = new Date();
    const timestampData = this.getProgressTimestampData(existing, dto.status, now);
    const recommendationId = dto.recommendationId ?? existing?.recommendationId ?? null;

    return this.prisma.$transaction(async (tx) => {
      const progress = await tx.studentResourceProgress.upsert({
        where: {
          studentId_resourceId: {
            studentId,
            resourceId,
          },
        },
        create: {
          studentId,
          resourceId,
          recommendationId: dto.recommendationId,
          status: dto.status,
          note: dto.note,
          ...timestampData,
        },
        update: {
          recommendationId: dto.recommendationId,
          status: dto.status,
          note: dto.note,
          ...timestampData,
        },
        include: {
          resource: true,
          recommendation: true,
        },
      });

      if (recommendationId && dto.status === ResourceProgressStatus.COMPLETED) {
        await this.syncRecommendationCompletionFromResources(
          tx,
          studentId,
          recommendationId,
        );
      }

      return progress;
    });
  }

  private async syncRecommendationCompletionFromResources(
    tx: Prisma.TransactionClient,
    studentId: string,
    recommendationId: string,
  ) {
    const recommendation = await tx.studentRecommendation.findFirst({
      where: {
        id: recommendationId,
        studentId,
        OR: [
          { analysisResultId: null },
          { analysisResult: { status: AnalysisResultStatus.CURRENT } },
        ],
      },
      select: {
        id: true,
        status: true,
        resourceLinks: {
          select: { resourceId: true },
        },
      },
    });
    if (!recommendation?.resourceLinks.length) {
      return;
    }

    const resourceIds = Array.from(
      new Set(recommendation.resourceLinks.map((link) => link.resourceId)),
    );
    const completedResourceCount = await tx.studentResourceProgress.count({
      where: {
        studentId,
        resourceId: { in: resourceIds },
        status: ResourceProgressStatus.COMPLETED,
      },
    });
    if (completedResourceCount !== resourceIds.length) {
      return;
    }

    const updatedRecommendation = await tx.studentRecommendation.updateMany({
      where: {
        id: recommendationId,
        studentId,
        status: { in: COMPLETABLE_RECOMMENDATION_STATUSES },
      },
      data: { status: StudentRecommendationStatus.DONE },
    });

    if (
      updatedRecommendation.count > 0 ||
      recommendation.status === StudentRecommendationStatus.DONE
    ) {
      await this.completeActiveRoadmapItemsForRecommendation(
        tx,
        studentId,
        recommendationId,
      );
    }
  }

  private async completeActiveRoadmapItemsForRecommendation(
    tx: Prisma.TransactionClient,
    studentId: string,
    recommendationId: string,
  ) {
    const roadmapItems = await tx.roadmapItem.findMany({
      where: {
        recommendationId,
        status: { in: ROADMAP_ITEM_STATUSES_COMPLETED_BY_RECOMMENDATION },
        roadmap: {
          studentId,
          status: RoadmapStatus.ACTIVE,
        },
      },
      select: { id: true, roadmapId: true },
    });
    if (!roadmapItems.length) {
      return;
    }

    await tx.roadmapItem.updateMany({
      where: { id: { in: roadmapItems.map((item) => item.id) } },
      data: { status: RoadmapItemStatus.DONE },
    });
    await tx.studentRoadmapProgress.createMany({
      data: roadmapItems.map((item) => ({
        studentId,
        roadmapId: item.roadmapId,
        roadmapItemId: item.id,
        status: RoadmapItemStatus.DONE,
        note: 'Completed automatically after all recommendation resources were completed',
      })),
    });

    const roadmapIds = Array.from(new Set(roadmapItems.map((item) => item.roadmapId)));
    for (const roadmapId of roadmapIds) {
      await this.recalculateRoadmapProgress(tx, roadmapId);
    }
  }

  private async recalculateRoadmapProgress(
    tx: Prisma.TransactionClient,
    roadmapId: string,
  ) {
    const items = await tx.roadmapItem.findMany({
      where: { roadmapId },
      select: { status: true, weight: true },
    });
    const validItems = items.filter((item) => item.status !== RoadmapItemStatus.CANCELLED);
    const totalWeight = validItems.reduce((sum, item) => sum + Number(item.weight), 0);
    if (totalWeight <= 0) {
      await tx.developmentRoadmap.update({
        where: { id: roadmapId },
        data: {
          progressPercent: 0,
          status: RoadmapStatus.ACTIVE,
        },
      });
      return;
    }

    const completedWeight = validItems
      .filter((item) => item.status === RoadmapItemStatus.DONE)
      .reduce((sum, item) => sum + Number(item.weight), 0);
    const progressPercent = this.round((completedWeight / totalWeight) * 100);

    await tx.developmentRoadmap.update({
      where: { id: roadmapId },
      data: {
        progressPercent,
        status: progressPercent >= 100 ? RoadmapStatus.COMPLETED : RoadmapStatus.ACTIVE,
      },
    });
  }

  private async ensureResourceExists(id: string) {
    const resource = await this.prisma.learningResource.findUnique({
      where: { id },
      select: { id: true, title: true },
    });
    if (!resource) {
      throw new NotFoundException('Learning resource not found');
    }

    return resource;
  }

  private async ensureActiveLearningResource(id: string) {
    const resource = await this.prisma.learningResource.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!resource) {
      throw new NotFoundException('Learning resource not found');
    }
    if (resource.status !== CatalogStatus.ACTIVE) {
      throw new BadRequestException('Inactive learning resource cannot be updated');
    }

    return resource;
  }

  private async ensureRecommendationContextOwnsResource(
    studentId: string,
    recommendationId: string,
    resourceId: string,
  ) {
    const recommendation = await this.prisma.studentRecommendation.findFirst({
      where: {
        id: recommendationId,
        studentId,
        OR: [
          { analysisResultId: null },
          { analysisResult: { status: AnalysisResultStatus.CURRENT } },
        ],
      },
      select: {
        id: true,
        resourceLinks: {
          where: { resourceId },
          select: { id: true },
          take: 1,
        },
      },
    });
    if (!recommendation) {
      throw new ForbiddenException('Recommendation does not belong to current student');
    }
    if (!recommendation.resourceLinks.length) {
      throw new BadRequestException(
        'Learning resource is not linked to this recommendation',
      );
    }
  }

  private assertValidProgressTransition(
    currentStatus: ResourceProgressStatus,
    nextStatus: ResourceProgressStatus,
    hasExistingProgress: boolean,
  ) {
    if (!hasExistingProgress && nextStatus === ResourceProgressStatus.NOT_STARTED) {
      return;
    }
    if (hasExistingProgress && currentStatus === nextStatus) {
      return;
    }

    const allowedNextStatuses =
      RESOURCE_PROGRESS_STATUS_TRANSITIONS[currentStatus] ?? [];
    if (allowedNextStatuses.includes(nextStatus)) {
      return;
    }

    if (nextStatus === ResourceProgressStatus.NOT_STARTED) {
      throw new BadRequestException(
        'Resetting resource progress to NOT_STARTED is not allowed',
      );
    }

    throw new BadRequestException(
      `Invalid resource progress status transition: ${currentStatus} -> ${nextStatus}`,
    );
  }

  private getProgressTimestampData(
    existing: StudentResourceProgress | null,
    status: ResourceProgressStatus,
    now: Date,
  ) {
    switch (status) {
      case ResourceProgressStatus.IN_PROGRESS:
        return {
          startedAt: existing?.startedAt ?? now,
          lastAccessedAt: now,
        };
      case ResourceProgressStatus.COMPLETED:
        return {
          startedAt: existing?.startedAt ?? now,
          completedAt: now,
          lastAccessedAt: now,
        };
      case ResourceProgressStatus.SKIPPED:
        return {
          lastAccessedAt: now,
        };
      case ResourceProgressStatus.NOT_STARTED:
      default:
        return {};
    }
  }

  private async ensureSkillCanBeLinked(skillId: string) {
    const skill = await this.prisma.skill.findUnique({
      where: { id: skillId },
      select: { id: true, status: true },
    });
    if (!skill) {
      throw new NotFoundException('Skill not found');
    }
    if (skill.status !== CatalogStatus.ACTIVE) {
      throw new BadRequestException('Inactive skill cannot be linked');
    }

    return skill;
  }

  private async ensureSkillLinkDoesNotExist(
    resourceId: string,
    dto: LinkResourceSkillDto,
  ) {
    const existing = await this.prisma.learningResourceSkill.findFirst({
      where: {
        resourceId,
        skillId: dto.skillId,
        targetLevel: dto.targetLevel ?? null,
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Learning resource skill link already exists');
    }
  }

  private async findSkillLinkForUpdate(
    resourceId: string,
    skillId: string,
    dto: UpdateResourceSkillDto,
  ) {
    if (dto.currentTargetLevel !== undefined) {
      const link = await this.prisma.learningResourceSkill.findFirst({
        where: {
          resourceId,
          skillId,
          targetLevel: dto.currentTargetLevel ?? null,
        },
        select: { id: true },
      });
      if (!link) {
        throw new NotFoundException('Learning resource skill link not found');
      }

      return link;
    }

    const links = await this.prisma.learningResourceSkill.findMany({
      where: { resourceId, skillId },
      select: { id: true },
      take: 2,
    });
    if (!links.length) {
      throw new NotFoundException('Learning resource skill link not found');
    }
    if (links.length > 1) {
      throw new BadRequestException(
        'Multiple links exist for this skill; provide currentTargetLevel',
      );
    }

    return links[0];
  }

  private async ensureUpdatedSkillLinkDoesNotDuplicate(
    resourceId: string,
    skillId: string,
    targetLevel: UpdateResourceSkillDto['targetLevel'],
    currentLinkId: string,
  ) {
    const duplicate = await this.prisma.learningResourceSkill.findFirst({
      where: {
        resourceId,
        skillId,
        targetLevel: targetLevel ?? null,
        NOT: { id: currentLinkId },
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException('Learning resource skill link already exists');
    }
  }

  private detailInclude() {
    return {
      skills: {
        orderBy: [{ orderIndex: 'asc' as const }, { createdAt: 'asc' as const }],
        include: { skill: { include: { category: true } } },
      },
      _count: {
        select: {
          templateLinks: true,
          recommendationLinks: true,
          progress: true,
        },
      },
    };
  }

  private handleKnownError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('Learning resource already exists');
      }
      if (error.code === 'P2003') {
        throw new ConflictException('Learning resource is linked to missing data');
      }
    }

    throw error;
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

  private round(value: number) {
    return Math.round(value * 100) / 100;
  }
}
