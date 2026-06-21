import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CatalogStatus, Prisma } from '@prisma/client';
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
}
