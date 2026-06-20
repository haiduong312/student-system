import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CatalogStatus, Prisma } from '@prisma/client';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import {
  buildPaginatedResult,
  getPagination,
} from '../common/pagination/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { SkillQueryDto } from './dto/skill-query.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';

const SORTABLE_FIELDS = new Set([
  'name',
  'type',
  'defaultRequiredLevel',
  'defaultWeight',
  'status',
  'createdAt',
  'updatedAt',
]);

@Injectable()
export class SkillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  async create(dto: CreateSkillDto, actorUserId?: string) {
    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId);
    }

    try {
      const skill = await this.prisma.skill.create({
        data: dto,
        include: this.detailInclude(),
      });
      await this.activityLogs.record({
        actorUserId,
        action: 'SKILL_CREATED',
        entityType: 'Skill',
        entityId: skill.id,
        description: {
          name: skill.name,
          type: skill.type,
          status: skill.status,
        },
      });

      return skill;
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  async findAll(query: SkillQueryDto, options: { activeOnly?: boolean } = {}) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.SkillWhereInput = {
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(options.activeOnly
        ? { status: CatalogStatus.ACTIVE }
        : query.status
          ? { status: query.status }
          : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { category: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const sortBy = SORTABLE_FIELDS.has(query.sortBy ?? '') ? query.sortBy! : 'createdAt';

    const [data, total] = await Promise.all([
      this.prisma.skill.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: query.sortOrder },
        include: this.detailInclude(),
      }),
      this.prisma.skill.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string) {
    const skill = await this.prisma.skill.findUnique({
      where: { id },
      include: {
        category: true,
        _count: {
          select: {
            careerRequiredSkills: true,
            studentSkills: true,
            recommendationTemplates: true,
            assessmentQuestions: true,
          },
        },
      },
    });
    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    return skill;
  }

  async update(id: string, dto: UpdateSkillDto, actorUserId?: string) {
    await this.ensureExists(id);
    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId);
    }

    try {
      const skill = await this.prisma.skill.update({
        where: { id },
        data: dto,
        include: this.detailInclude(),
      });
      await this.activityLogs.record({
        actorUserId,
        action: 'SKILL_UPDATED',
        entityType: 'Skill',
        entityId: skill.id,
        description: {
          name: skill.name,
          status: skill.status,
          changedFields: Object.keys(dto),
        },
      });

      return skill;
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  async remove(id: string, actorUserId?: string) {
    await this.ensureExists(id);

    try {
      await this.prisma.skill.delete({ where: { id } });
      await this.activityLogs.record({
        actorUserId,
        action: 'SKILL_DELETED',
        entityType: 'Skill',
        entityId: id,
      });
      return { deleted: true };
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.skill.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Skill not found');
    }
  }

  private async ensureCategoryExists(categoryId: string) {
    const exists = await this.prisma.skillCategory.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Skill category not found');
    }
  }

  private detailInclude() {
    return {
      category: true,
      _count: {
        select: {
          careerRequiredSkills: true,
          studentSkills: true,
          recommendationTemplates: true,
          assessmentQuestions: true,
        },
      },
    };
  }

  private handleKnownError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('Skill already exists in this category');
      }
      if (error.code === 'P2003') {
        throw new ConflictException('Skill is being used');
      }
    }

    throw error;
  }
}
