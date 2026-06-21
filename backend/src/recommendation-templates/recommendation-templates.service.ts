import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CatalogStatus, Prisma, TemplateStatus } from '@prisma/client';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import {
  buildPaginatedResult,
  getPagination,
} from '../common/pagination/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecommendationTemplateDto } from './dto/create-recommendation-template.dto';
import { LinkRecommendationTemplateResourceDto } from './dto/link-recommendation-template-resource.dto';
import { RecommendationTemplateQueryDto } from './dto/recommendation-template-query.dto';
import { UpdateRecommendationTemplateDto } from './dto/update-recommendation-template.dto';

const SORTABLE_FIELDS = new Set([
  'priority',
  'status',
  'recommendationType',
  'createdAt',
  'updatedAt',
  'title',
]);

@Injectable()
export class RecommendationTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  async create(dto: CreateRecommendationTemplateDto, actorUserId?: string) {
    await this.ensureReferencesValid(dto);

    try {
      const template = await this.prisma.recommendationTemplate.create({
        data: dto,
        include: this.detailInclude(),
      });
      await this.activityLogs.record({
        actorUserId,
        action: 'RECOMMENDATION_TEMPLATE_CREATED',
        entityType: 'RecommendationTemplate',
        entityId: template.id,
        description: {
          title: template.title,
          status: template.status,
          recommendationType: template.recommendationType,
        },
      });

      return template;
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  async findAll(query: RecommendationTemplateQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.RecommendationTemplateWhereInput = {
      ...(query.skillId ? { skillId: query.skillId } : {}),
      ...(query.skillCategoryId ? { skillCategoryId: query.skillCategoryId } : {}),
      ...(query.careerGoalId ? { careerGoalId: query.careerGoalId } : {}),
      ...(query.specializationId ? { specializationId: query.specializationId } : {}),
      ...(query.level ? { level: query.level } : {}),
      ...(query.recommendationType
        ? { recommendationType: query.recommendationType }
        : {}),
      ...(query.roadmapPhase ? { roadmapPhase: query.roadmapPhase } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { skill: { name: { contains: query.search, mode: 'insensitive' } } },
              {
                careerGoal: {
                  name: { contains: query.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
    const sortBy = SORTABLE_FIELDS.has(query.sortBy ?? '')
      ? query.sortBy!
      : 'updatedAt';

    const [data, total] = await Promise.all([
      this.prisma.recommendationTemplate.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: query.sortOrder },
        include: this.detailInclude(),
      }),
      this.prisma.recommendationTemplate.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string) {
    const template = await this.prisma.recommendationTemplate.findUnique({
      where: { id },
      include: this.detailInclude(),
    });
    if (!template) {
      throw new NotFoundException('Recommendation template not found');
    }

    return template;
  }

  async update(
    id: string,
    dto: UpdateRecommendationTemplateDto,
    actorUserId?: string,
  ) {
    const existing = await this.ensureExists(id);
    await this.ensureReferencesValid({
      skillId: existing.skillId,
      skillCategoryId: existing.skillCategoryId,
      careerGoalId: existing.careerGoalId,
      specializationId: existing.specializationId,
      ...dto,
    });

    try {
      const template = await this.prisma.recommendationTemplate.update({
        where: { id },
        data: dto,
        include: this.detailInclude(),
      });
      await this.activityLogs.record({
        actorUserId,
        action: 'RECOMMENDATION_TEMPLATE_UPDATED',
        entityType: 'RecommendationTemplate',
        entityId: template.id,
        description: {
          title: template.title,
          status: template.status,
          changedFields: Object.keys(dto),
        },
      });

      return template;
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  async remove(id: string, actorUserId?: string) {
    await this.ensureExists(id);

    const template = await this.prisma.recommendationTemplate.update({
      where: { id },
      data: { status: TemplateStatus.INACTIVE },
      include: this.detailInclude(),
    });
    await this.activityLogs.record({
      actorUserId,
      action: 'RECOMMENDATION_TEMPLATE_DEACTIVATED',
      entityType: 'RecommendationTemplate',
      entityId: template.id,
      description: { title: template.title },
    });

    return { deactivated: true, template };
  }

  async findResources(id: string) {
    await this.ensureExists(id);

    return this.prisma.recommendationTemplateResource.findMany({
      where: { templateId: id },
      orderBy: this.resourceLinkOrderBy(),
      include: { resource: true },
    });
  }

  async linkResource(
    id: string,
    dto: LinkRecommendationTemplateResourceDto,
    actorUserId?: string,
  ) {
    await this.ensureExists(id);
    await this.ensureActiveResourceExists(dto.resourceId);
    await this.ensureTemplateResourceLinkDoesNotExist(id, dto.resourceId);

    try {
      const link = await this.prisma.recommendationTemplateResource.create({
        data: {
          templateId: id,
          resourceId: dto.resourceId,
          orderIndex: dto.orderIndex,
          priority: dto.priority,
        },
        include: {
          template: true,
          resource: true,
        },
      });
      await this.activityLogs.record({
        actorUserId,
        action: 'RECOMMENDATION_TEMPLATE_RESOURCE_LINKED',
        entityType: 'RecommendationTemplateResource',
        entityId: link.id,
        description: {
          templateId: id,
          resourceId: dto.resourceId,
          orderIndex: link.orderIndex,
          priority: link.priority,
        },
      });

      return link;
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  async unlinkResource(
    id: string,
    resourceId: string,
    actorUserId?: string,
  ) {
    await this.ensureExists(id);

    const result = await this.prisma.recommendationTemplateResource.deleteMany({
      where: { templateId: id, resourceId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Recommendation template resource link not found');
    }
    await this.activityLogs.record({
      actorUserId,
      action: 'RECOMMENDATION_TEMPLATE_RESOURCE_UNLINKED',
      entityType: 'RecommendationTemplateResource',
      description: {
        templateId: id,
        resourceId,
        deletedLinks: result.count,
      },
    });

    return { unlinked: true, deletedLinks: result.count };
  }

  private async ensureReferencesValid(
    dto: Partial<CreateRecommendationTemplateDto>,
  ) {
    await Promise.all([
      this.ensureOptionalExists('skill', dto.skillId, 'Skill not found'),
      this.ensureOptionalExists(
        'skillCategory',
        dto.skillCategoryId,
        'Skill category not found',
      ),
      this.ensureOptionalExists(
        'careerGoal',
        dto.careerGoalId,
        'Career goal not found',
      ),
    ]);

    if (dto.specializationId) {
      const specialization = await this.prisma.specialization.findUnique({
        where: { id: dto.specializationId },
        select: { id: true, careerGoalId: true },
      });
      if (!specialization) {
        throw new NotFoundException('Specialization not found');
      }
      if (dto.careerGoalId && specialization.careerGoalId !== dto.careerGoalId) {
        throw new BadRequestException(
          'Specialization does not belong to the selected career goal',
        );
      }
    }
  }

  private async ensureOptionalExists(
    model: 'skill' | 'skillCategory' | 'careerGoal',
    id: string | null | undefined,
    message: string,
  ) {
    if (!id) {
      return;
    }

    const exists =
      model === 'skill'
        ? await this.prisma.skill.findUnique({
            where: { id },
            select: { id: true },
          })
        : model === 'skillCategory'
          ? await this.prisma.skillCategory.findUnique({
              where: { id },
              select: { id: true },
            })
          : await this.prisma.careerGoal.findUnique({
              where: { id },
              select: { id: true },
            });
    if (!exists) {
      throw new NotFoundException(message);
    }
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.recommendationTemplate.findUnique({
      where: { id },
      select: {
        id: true,
        skillId: true,
        skillCategoryId: true,
        careerGoalId: true,
        specializationId: true,
      },
    });
    if (!exists) {
      throw new NotFoundException('Recommendation template not found');
    }

    return exists;
  }

  private async ensureActiveResourceExists(resourceId: string) {
    const resource = await this.prisma.learningResource.findUnique({
      where: { id: resourceId },
      select: { id: true, status: true },
    });
    if (!resource) {
      throw new NotFoundException('Learning resource not found');
    }
    if (resource.status !== CatalogStatus.ACTIVE) {
      throw new BadRequestException('Inactive learning resource cannot be linked');
    }

    return resource;
  }

  private async ensureTemplateResourceLinkDoesNotExist(
    templateId: string,
    resourceId: string,
  ) {
    const existing = await this.prisma.recommendationTemplateResource.findUnique({
      where: {
        templateId_resourceId: {
          templateId,
          resourceId,
        },
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        'Learning resource is already linked to recommendation template',
      );
    }
  }

  private detailInclude() {
    return {
      skill: true,
      skillCategory: true,
      careerGoal: true,
      specialization: true,
      resourceLinks: {
        orderBy: this.resourceLinkOrderBy(),
        include: {
          resource: {
            include: {
              skills: {
                orderBy: [
                  { orderIndex: 'asc' as const },
                  { createdAt: 'asc' as const },
                ],
                include: { skill: true },
              },
            },
          },
        },
      },
    };
  }

  private resourceLinkOrderBy() {
    return [
      { orderIndex: 'asc' as const },
      { priority: 'desc' as const },
      { createdAt: 'asc' as const },
    ];
  }

  private handleKnownError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('Recommendation template already exists');
      }
      if (error.code === 'P2003') {
        throw new ConflictException('Recommendation template is linked to missing data');
      }
    }

    throw error;
  }
}
