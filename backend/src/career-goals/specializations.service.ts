import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CatalogStatus, Prisma, RoadmapPhase } from '@prisma/client';
import {
  buildPaginatedResult,
  getPagination,
} from '../common/pagination/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { CareerRequiredSkillQueryDto } from './dto/career-required-skill-query.dto';
import { CreateCareerRequiredSkillDto } from './dto/create-career-required-skill.dto';
import { CreateSpecializationDto } from './dto/create-specialization.dto';
import { SpecializationQueryDto } from './dto/specialization-query.dto';
import { UpdateCareerRequiredSkillDto } from './dto/update-career-required-skill.dto';
import { UpdateSpecializationDto } from './dto/update-specialization.dto';

const SPECIALIZATION_SORTABLE_FIELDS = new Set([
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
export class SpecializationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSpecializationDto) {
    const data = this.normalizeCreateData(dto);

    await this.ensureCareerGoalExists(data.careerGoalId);
    await this.ensureNameAvailable(data.careerGoalId, data.name);

    try {
      return await this.prisma.specialization.create({
        data,
        include: this.specializationInclude(),
      });
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  async findAll(query: SpecializationQueryDto, options: { activeOnly?: boolean } = {}) {
    const { page, limit, skip, take } = getPagination(query);
    const careerGoalId = query.careerGoalId;
    if (careerGoalId) {
      if (options.activeOnly) {
        await this.ensureActiveCareerGoalExists(careerGoalId);
      } else {
        await this.ensureCareerGoalExists(careerGoalId);
      }
    }

    const where = this.buildWhere(query, {
      activeOnly: options.activeOnly,
      careerGoalId,
    });
    const sortBy = SPECIALIZATION_SORTABLE_FIELDS.has(query.sortBy ?? '')
      ? query.sortBy!
      : 'createdAt';

    const [data, total] = await Promise.all([
      this.prisma.specialization.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: query.sortOrder },
        include: this.specializationInclude(),
      }),
      this.prisma.specialization.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async findByCareerGoal(
    careerGoalId: string,
    query: SpecializationQueryDto,
    options: { activeOnly?: boolean } = {},
  ) {
    if (options.activeOnly) {
      await this.ensureActiveCareerGoalExists(careerGoalId);
    } else {
      await this.ensureCareerGoalExists(careerGoalId);
    }

    const { page, limit, skip, take } = getPagination(query);
    const where = this.buildWhere(query, {
      activeOnly: options.activeOnly,
      careerGoalId,
    });
    const sortBy = SPECIALIZATION_SORTABLE_FIELDS.has(query.sortBy ?? '')
      ? query.sortBy!
      : 'createdAt';

    const [data, total] = await Promise.all([
      this.prisma.specialization.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: query.sortOrder },
        include: this.specializationInclude(),
      }),
      this.prisma.specialization.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string) {
    const specialization = await this.prisma.specialization.findUnique({
      where: { id },
      include: this.specializationInclude(),
    });
    if (!specialization) {
      throw new NotFoundException('Specialization not found');
    }

    return specialization;
  }

  async update(id: string, dto: UpdateSpecializationDto) {
    const specialization = await this.ensureExists(id);
    const data = this.normalizeUpdateData(dto);

    if (data.name) {
      await this.ensureNameAvailable(specialization.careerGoalId, data.name, id);
    }

    try {
      return await this.prisma.specialization.update({
        where: { id },
        data,
        include: this.specializationInclude(),
      });
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  async deactivate(id: string) {
    await this.ensureExists(id);

    const specialization = await this.prisma.specialization.update({
      where: { id },
      data: { status: CatalogStatus.INACTIVE },
      include: this.specializationInclude(),
    });

    return { deactivated: true, specialization };
  }

  async findRequiredSkills(
    specializationId: string,
    query: CareerRequiredSkillQueryDto,
  ) {
    await this.ensureActiveSpecializationExists(specializationId);

    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.CareerRequiredSkillWhereInput = {
      specializationId,
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
        include: this.requiredSkillInclude(),
      }),
      this.prisma.careerRequiredSkill.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async createRequiredSkill(
    specializationId: string,
    dto: CreateCareerRequiredSkillDto,
  ) {
    const specialization = await this.ensureActiveSpecializationExists(specializationId);
    const data = this.normalizeRequiredSkillCreateData(dto);

    await this.ensureActiveSkillExists(data.skillId);
    await this.ensureRequiredSkillNotConfigured(specializationId, data.skillId);

    try {
      return await this.prisma.careerRequiredSkill.create({
        data: {
          ...data,
          careerGoalId: specialization.careerGoalId,
          specializationId,
        },
        include: this.requiredSkillInclude(),
      });
    } catch (error) {
      this.handleRequiredSkillError(error);
    }
  }

  async updateRequiredSkill(
    specializationId: string,
    requiredSkillId: string,
    dto: UpdateCareerRequiredSkillDto,
  ) {
    await this.ensureActiveSpecializationExists(specializationId);
    await this.ensureRequiredSkillExists(specializationId, requiredSkillId);
    const data = this.normalizeRequiredSkillUpdateData(dto);

    if (data.skillId) {
      await this.ensureActiveSkillExists(data.skillId);
      await this.ensureRequiredSkillNotConfigured(
        specializationId,
        data.skillId,
        requiredSkillId,
      );
    }

    try {
      return await this.prisma.careerRequiredSkill.update({
        where: { id: requiredSkillId },
        data,
        include: this.requiredSkillInclude(),
      });
    } catch (error) {
      this.handleRequiredSkillError(error);
    }
  }

  async removeRequiredSkill(specializationId: string, requiredSkillId: string) {
    await this.ensureActiveSpecializationExists(specializationId);
    await this.ensureRequiredSkillExists(specializationId, requiredSkillId);

    await this.prisma.careerRequiredSkill.delete({ where: { id: requiredSkillId } });
    return { deleted: true };
  }

  private buildWhere(
    query: SpecializationQueryDto,
    options: { activeOnly?: boolean; careerGoalId?: string },
  ): Prisma.SpecializationWhereInput {
    return {
      ...(options.careerGoalId ? { careerGoalId: options.careerGoalId } : {}),
      ...(options.activeOnly
        ? {
            status: CatalogStatus.ACTIVE,
            careerGoal: { status: CatalogStatus.ACTIVE },
          }
        : query.status
          ? { status: query.status }
          : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { careerGoal: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
  }

  private normalizeCreateData(dto: CreateSpecializationDto) {
    const careerGoalId = this.normalizeRequiredText(dto.careerGoalId, 'Career goal is required');
    const name = this.normalizeRequiredText(dto.name, 'Specialization name is required');

    return {
      careerGoalId,
      name,
      description: this.normalizeOptionalText(dto.description),
      status: this.normalizeOptionalStatus(dto.status),
    };
  }

  private normalizeUpdateData(dto: UpdateSpecializationDto) {
    const data: {
      name?: string;
      description?: string | null;
      status?: CatalogStatus;
    } = {};

    if (dto.name !== undefined) {
      data.name = this.normalizeRequiredText(dto.name, 'Specialization name is required');
    }
    if (dto.description !== undefined) {
      data.description = this.normalizeOptionalText(dto.description);
    }
    if (dto.status !== undefined) {
      data.status = this.normalizeOptionalStatus(dto.status);
    }

    return data;
  }

  private normalizeRequiredText(value: string | null | undefined, message: string) {
    if (typeof value !== 'string') {
      throw new BadRequestException(message);
    }

    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(message);
    }

    return normalized;
  }

  private normalizeOptionalText(value?: string | null) {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }

    const normalized = value.trim();
    return normalized || null;
  }

  private normalizeOptionalStatus(value?: CatalogStatus | null) {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      throw new BadRequestException('Specialization status is required');
    }

    return value;
  }

  private normalizeRequiredSkillCreateData(dto: CreateCareerRequiredSkillDto) {
    return {
      skillId: this.normalizeRequiredText(dto.skillId, 'Skill is required'),
      requiredLevel: dto.requiredLevel,
      weight: dto.weight,
      learningOrder: dto.learningOrder,
      isRequired: dto.isRequired,
      roadmapPhase: dto.roadmapPhase,
    };
  }

  private normalizeRequiredSkillUpdateData(dto: UpdateCareerRequiredSkillDto) {
    const data: {
      skillId?: string;
      requiredLevel?: number;
      weight?: number;
      learningOrder?: number;
      isRequired?: boolean;
      roadmapPhase?: RoadmapPhase;
    } = {};

    if (dto.skillId !== undefined) {
      data.skillId = this.normalizeRequiredText(dto.skillId, 'Skill is required');
    }
    if (dto.requiredLevel !== undefined) {
      if (dto.requiredLevel === null) {
        throw new BadRequestException('Required level is required');
      }
      data.requiredLevel = dto.requiredLevel;
    }
    if (dto.weight !== undefined) {
      if (dto.weight === null) {
        throw new BadRequestException('Weight is required');
      }
      data.weight = dto.weight;
    }
    if (dto.learningOrder !== undefined) {
      if (dto.learningOrder === null) {
        throw new BadRequestException('Learning order is required');
      }
      data.learningOrder = dto.learningOrder;
    }
    if (dto.isRequired !== undefined) {
      if (dto.isRequired === null) {
        throw new BadRequestException('Required flag is required');
      }
      data.isRequired = dto.isRequired;
    }
    if (dto.roadmapPhase !== undefined) {
      if (dto.roadmapPhase === null) {
        throw new BadRequestException('Roadmap phase is required');
      }
      data.roadmapPhase = dto.roadmapPhase;
    }

    return data;
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

  private async ensureActiveCareerGoalExists(id: string) {
    const careerGoal = await this.prisma.careerGoal.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!careerGoal) {
      throw new NotFoundException('Career goal not found');
    }
    if (careerGoal.status !== CatalogStatus.ACTIVE) {
      throw new BadRequestException('Career goal is not active');
    }
  }

  private async ensureExists(id: string) {
    const specialization = await this.prisma.specialization.findUnique({
      where: { id },
      select: { id: true, careerGoalId: true },
    });
    if (!specialization) {
      throw new NotFoundException('Specialization not found');
    }

    return specialization;
  }

  private async ensureActiveSpecializationExists(id: string) {
    const specialization = await this.prisma.specialization.findUnique({
      where: { id },
      select: { id: true, careerGoalId: true, status: true },
    });
    if (!specialization) {
      throw new NotFoundException('Specialization not found');
    }
    if (specialization.status !== CatalogStatus.ACTIVE) {
      throw new BadRequestException('Specialization is not active');
    }

    return specialization;
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

  private async ensureRequiredSkillExists(specializationId: string, id: string) {
    const exists = await this.prisma.careerRequiredSkill.findFirst({
      where: {
        id,
        specializationId,
        specialization: { status: CatalogStatus.ACTIVE },
      },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Specialization required skill not found');
    }
  }

  private async ensureRequiredSkillNotConfigured(
    specializationId: string,
    skillId: string,
    ignoreId?: string,
  ) {
    const exists = await this.prisma.careerRequiredSkill.findFirst({
      where: {
        specializationId,
        skillId,
        ...(ignoreId ? { id: { not: ignoreId } } : {}),
      },
      select: { id: true },
    });
    if (exists) {
      throw new ConflictException('Skill is already configured for this specialization');
    }
  }

  private async ensureNameAvailable(
    careerGoalId: string,
    name: string,
    ignoreId?: string,
  ) {
    const exists = await this.prisma.specialization.findFirst({
      where: {
        careerGoalId,
        name: { equals: name, mode: 'insensitive' },
        ...(ignoreId ? { id: { not: ignoreId } } : {}),
      },
      select: { id: true },
    });
    if (exists) {
      throw new ConflictException('Specialization already exists in this career goal');
    }
  }

  private specializationInclude() {
    return {
      careerGoal: true,
      _count: {
        select: {
          requiredSkills: true,
          studentProfiles: true,
          roadmaps: true,
        },
      },
    } as const;
  }

  private requiredSkillInclude() {
    return {
      skill: { include: { category: true } },
      careerGoal: true,
      specialization: true,
    } as const;
  }

  private handleKnownError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('Specialization already exists in this career goal');
      }
      if (error.code === 'P2003') {
        throw new ConflictException('Career goal not found');
      }
    }

    throw error;
  }

  private handleRequiredSkillError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('Skill is already configured for this specialization');
      }
      if (error.code === 'P2003') {
        throw new ConflictException('Invalid specialization required skill reference');
      }
    }

    throw error;
  }
}
