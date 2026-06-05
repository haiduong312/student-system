import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

const CAREER_SORTABLE_FIELDS = new Set(['name', 'status', 'createdAt', 'updatedAt']);
const REQUIRED_SKILL_SORTABLE_FIELDS = new Set([
  'requiredLevel',
  'weight',
  'learningOrder',
  'createdAt',
  'updatedAt',
]);

@Injectable()
export class CareerGoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCareerGoalDto) {
    try {
      return await this.prisma.careerGoal.create({ data: dto });
    } catch (error) {
      this.handleKnownError(error, 'Career goal already exists');
    }
  }

  async findAll(query: CareerGoalQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.CareerGoalWhereInput = {
      ...(query.status ? { status: query.status } : {}),
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
        include: { _count: { select: { requiredSkills: true, studentProfiles: true } } },
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
        _count: { select: { studentProfiles: true, roadmaps: true } },
      },
    });
    if (!careerGoal) {
      throw new NotFoundException('Career goal not found');
    }

    return careerGoal;
  }

  async update(id: string, dto: UpdateCareerGoalDto) {
    await this.ensureCareerGoalExists(id);

    try {
      return await this.prisma.careerGoal.update({ where: { id }, data: dto });
    } catch (error) {
      this.handleKnownError(error, 'Career goal already exists');
    }
  }

  async remove(id: string) {
    await this.ensureCareerGoalExists(id);

    try {
      await this.prisma.careerGoal.delete({ where: { id } });
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
    await this.ensureSkillExists(dto.skillId);

    try {
      return await this.prisma.careerRequiredSkill.create({
        data: { ...dto, careerGoalId },
        include: { skill: { include: { category: true } }, careerGoal: true },
      });
    } catch (error) {
      this.handleKnownError(error, 'Skill is already configured for this career goal');
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
      ...(query.skillId ? { skillId: query.skillId } : {}),
      ...(typeof query.isRequired === 'boolean' ? { isRequired: query.isRequired } : {}),
      ...(query.search
        ? {
            OR: [
              { skill: { name: { contains: query.search, mode: 'insensitive' } } },
              { skill: { description: { contains: query.search, mode: 'insensitive' } } },
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
      await this.ensureSkillExists(dto.skillId);
    }

    try {
      return await this.prisma.careerRequiredSkill.update({
        where: { id: requiredSkillId },
        data: dto,
        include: { skill: { include: { category: true } }, careerGoal: true },
      });
    } catch (error) {
      this.handleKnownError(error, 'Skill is already configured for this career goal');
    }
  }

  async removeRequiredSkill(careerGoalId: string, requiredSkillId: string) {
    await this.ensureRequiredSkillExists(careerGoalId, requiredSkillId);

    await this.prisma.careerRequiredSkill.delete({ where: { id: requiredSkillId } });
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

  private async ensureSkillExists(id: string) {
    const exists = await this.prisma.skill.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Skill not found');
    }
  }

  private async ensureRequiredSkillExists(careerGoalId: string, id: string) {
    const exists = await this.prisma.careerRequiredSkill.findFirst({
      where: { id, careerGoalId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Career required skill not found');
    }
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
