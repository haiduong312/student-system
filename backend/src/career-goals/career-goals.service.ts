import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CatalogStatus, Prisma, SkillType } from '@prisma/client';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import {
  buildPaginatedResult,
  getPagination,
} from '../common/pagination/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { CareerGoalQueryDto } from './dto/career-goal-query.dto';
import { CareerRequiredSkillQueryDto } from './dto/career-required-skill-query.dto';
import { CreateCareerGoalDto } from './dto/create-career-goal.dto';
import { CreateCareerRequiredSkillDto } from './dto/create-career-required-skill.dto';
import { UpdateCareerGoalDto } from './dto/update-career-goal.dto';
import { UpdateCareerRequiredSkillDto } from './dto/update-career-required-skill.dto';

const CAREER_SORTABLE_FIELDS = new Set([
  'name',
  'status',
  'createdAt',
  'updatedAt',
]);
const REQUIRED_SKILL_SORTABLE_FIELDS = new Set([
  'requiredLevel',
  'weight',
  'learningOrder',
  'createdAt',
  'updatedAt',
]);

@Injectable()
export class CareerGoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  async create(dto: CreateCareerGoalDto, actorUserId?: string) {
    try {
      const careerGoal = await this.prisma.$transaction(async (tx) => {
        const careerGoal = await tx.careerGoal.create({ data: dto });
        await this.attachCommonSkills(tx, careerGoal.id);

        return careerGoal;
      });
      await this.activityLogs.record({
        actorUserId,
        action: 'CAREER_GOAL_CREATED',
        entityType: 'CareerGoal',
        entityId: careerGoal.id,
        description: {
          name: careerGoal.name,
          status: careerGoal.status,
        },
      });

      return careerGoal;
    } catch (error) {
      this.handleKnownError(error, 'Career goal already exists');
    }
  }

  async findAll(
    query: CareerGoalQueryDto,
    options: { activeOnly?: boolean } = {},
  ) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.CareerGoalWhereInput = {
      ...(options.activeOnly
        ? { status: CatalogStatus.ACTIVE }
        : query.status
          ? { status: query.status }
          : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const sortBy = CAREER_SORTABLE_FIELDS.has(query.sortBy ?? '')
      ? query.sortBy!
      : 'createdAt';

    const [data, total] = await Promise.all([
      this.prisma.careerGoal.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: query.sortOrder },
        include: {
          _count: {
            select: {
              requiredSkills: true,
              specializations: true,
              studentProfiles: true,
            },
          },
        },
      }),
      this.prisma.careerGoal.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string) {
    const careerGoal = await this.prisma.careerGoal.findUnique({
      where: { id },
      include: {
        requiredSkills: {
          orderBy: { learningOrder: 'asc' },
          include: { skill: { include: { category: true } } },
        },
        _count: {
          select: {
            specializations: true,
            studentProfiles: true,
            roadmaps: true,
          },
        },
      },
    });
    if (!careerGoal) {
      throw new NotFoundException('Career goal not found');
    }

    return careerGoal;
  }

  async update(id: string, dto: UpdateCareerGoalDto, actorUserId?: string) {
    await this.ensureCareerGoalExists(id);

    try {
      const careerGoal = await this.prisma.careerGoal.update({
        where: { id },
        data: dto,
      });
      await this.activityLogs.record({
        actorUserId,
        action: 'CAREER_GOAL_UPDATED',
        entityType: 'CareerGoal',
        entityId: careerGoal.id,
        description: {
          name: careerGoal.name,
          status: careerGoal.status,
          changedFields: Object.keys(dto),
        },
      });

      return careerGoal;
    } catch (error) {
      this.handleKnownError(error, 'Career goal already exists');
    }
  }

  async remove(id: string, actorUserId?: string) {
    await this.ensureCareerGoalExists(id);

    try {
      await this.prisma.careerGoal.delete({ where: { id } });
      await this.activityLogs.record({
        actorUserId,
        action: 'CAREER_GOAL_DELETED',
        entityType: 'CareerGoal',
        entityId: id,
      });
      return { deleted: true };
    } catch (error) {
      this.handleKnownError(error, 'Career goal is being used');
    }
  }

  async createRequiredSkill(
    careerGoalId: string,
    dto: CreateCareerRequiredSkillDto,
  ) {
    await this.ensureCareerGoalExists(careerGoalId);
    await this.ensureActiveSkillExists(dto.skillId);
    await this.ensureRequiredSkillNotConfigured(careerGoalId, dto.skillId);

    try {
      return await this.prisma.careerRequiredSkill.create({
        data: { ...dto, careerGoalId },
        include: { skill: { include: { category: true } }, careerGoal: true },
      });
    } catch (error) {
      this.handleKnownError(
        error,
        'Skill is already configured for this career goal',
      );
    }
  }

  async findRequiredSkills(
    careerGoalId: string,
    query: CareerRequiredSkillQueryDto,
  ) {
    await this.ensureCareerGoalExists(careerGoalId);

    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.CareerRequiredSkillWhereInput = {
      careerGoalId,
      specializationId: null,
      ...(query.skillId ? { skillId: query.skillId } : {}),
      ...(typeof query.isRequired === 'boolean'
        ? { isRequired: query.isRequired }
        : {}),
      ...(query.search
        ? {
            OR: [
              {
                skill: {
                  name: { contains: query.search, mode: 'insensitive' },
                },
              },
              {
                skill: {
                  description: { contains: query.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
    const sortBy = REQUIRED_SKILL_SORTABLE_FIELDS.has(query.sortBy ?? '')
      ? query.sortBy!
      : 'learningOrder';

    const [data, total] = await Promise.all([
      this.prisma.careerRequiredSkill.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: query.sortOrder },
        include: { skill: { include: { category: true } } },
      }),
      this.prisma.careerRequiredSkill.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async updateRequiredSkill(
    careerGoalId: string,
    requiredSkillId: string,
    dto: UpdateCareerRequiredSkillDto,
  ) {
    await this.ensureRequiredSkillExists(careerGoalId, requiredSkillId);
    if (dto.skillId) {
      await this.ensureActiveSkillExists(dto.skillId);
      await this.ensureRequiredSkillNotConfigured(
        careerGoalId,
        dto.skillId,
        requiredSkillId,
      );
    }

    try {
      return await this.prisma.careerRequiredSkill.update({
        where: { id: requiredSkillId },
        data: dto,
        include: { skill: { include: { category: true } }, careerGoal: true },
      });
    } catch (error) {
      this.handleKnownError(
        error,
        'Skill is already configured for this career goal',
      );
    }
  }

  async removeRequiredSkill(careerGoalId: string, requiredSkillId: string) {
    await this.ensureRequiredSkillExists(careerGoalId, requiredSkillId);

    await this.prisma.careerRequiredSkill.delete({
      where: { id: requiredSkillId },
    });
    return { deleted: true };
  }

  private async ensureCareerGoalExists(id: string) {
    const exists = await this.prisma.careerGoal.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Career goal not found');
    }
  }

  private async ensureActiveSkillExists(id: string) {
    const skill = await this.prisma.skill.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!skill) {
      throw new NotFoundException('Skill not found');
    }
    if (skill.status !== CatalogStatus.ACTIVE) {
      throw new BadRequestException('Skill is not active');
    }
  }

  private async ensureRequiredSkillExists(careerGoalId: string, id: string) {
    const exists = await this.prisma.careerRequiredSkill.findFirst({
      where: { id, careerGoalId, specializationId: null },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Career required skill not found');
    }
  }

  private async ensureRequiredSkillNotConfigured(
    careerGoalId: string,
    skillId: string,
    ignoreId?: string,
  ) {
    const exists = await this.prisma.careerRequiredSkill.findFirst({
      where: {
        careerGoalId,
        skillId,
        specializationId: null,
        ...(ignoreId ? { id: { not: ignoreId } } : {}),
      },
      select: { id: true },
    });
    if (exists) {
      throw new ConflictException(
        'Skill is already configured for this career goal',
      );
    }
  }

  private async attachCommonSkills(
    tx: Prisma.TransactionClient,
    careerGoalId: string,
  ) {
    const commonSkills = await tx.skill.findMany({
      where: { type: SkillType.COMMON, status: CatalogStatus.ACTIVE },
      select: {
        id: true,
        defaultRequiredLevel: true,
        defaultWeight: true,
      },
      orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
    });
    if (!commonSkills.length) {
      return;
    }

    const existingRequiredSkills = await tx.careerRequiredSkill.findMany({
      where: {
        careerGoalId,
        specializationId: null,
        skillId: { in: commonSkills.map((skill) => skill.id) },
      },
      select: { skillId: true },
    });
    const existingSkillIds = new Set(
      existingRequiredSkills.map((requiredSkill) => requiredSkill.skillId),
    );
    const maxLearningOrder = await tx.careerRequiredSkill.aggregate({
      where: { careerGoalId, specializationId: null },
      _max: { learningOrder: true },
    });
    const nextLearningOrder = (maxLearningOrder._max.learningOrder ?? 0) + 1;

    const requiredSkills = commonSkills
      .filter((skill) => !existingSkillIds.has(skill.id))
      .map((skill, index) => ({
        careerGoalId,
        skillId: skill.id,
        requiredLevel: skill.defaultRequiredLevel ?? 1,
        weight: Number(skill.defaultWeight ?? 1),
        learningOrder: nextLearningOrder + index,
        isRequired: true,
      }));

    if (!requiredSkills.length) {
      return;
    }

    await tx.careerRequiredSkill.createMany({ data: requiredSkills });
  }

  private handleKnownError(error: unknown, message: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException(message);
      }
      if (error.code === 'P2003') {
        throw new ConflictException(message);
      }
    }

    throw error;
  }
}
