import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  buildPaginatedResult,
  getPagination,
} from '../common/pagination/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSkillCategoryDto } from './dto/create-skill-category.dto';
import { SkillCategoryQueryDto } from './dto/skill-category-query.dto';
import { UpdateSkillCategoryDto } from './dto/update-skill-category.dto';

const SORTABLE_FIELDS = new Set(['name', 'status', 'createdAt', 'updatedAt']);

@Injectable()
export class SkillCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSkillCategoryDto) {
    try {
      return await this.prisma.skillCategory.create({ data: dto });
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  async findAll(query: SkillCategoryQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.SkillCategoryWhereInput = {
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
    const sortBy = SORTABLE_FIELDS.has(query.sortBy ?? '') ? query.sortBy! : 'createdAt';

    const [data, total] = await Promise.all([
      this.prisma.skillCategory.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: query.sortOrder },
        include: { _count: { select: { skills: true } } },
      }),
      this.prisma.skillCategory.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string) {
    const category = await this.prisma.skillCategory.findUnique({
      where: { id },
      include: { _count: { select: { skills: true } } },
    });
    if (!category) {
      throw new NotFoundException('Skill category not found');
    }

    return category;
  }

  async update(id: string, dto: UpdateSkillCategoryDto) {
    await this.ensureExists(id);

    try {
      return await this.prisma.skillCategory.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  async remove(id: string) {
    await this.ensureExists(id);

    try {
      await this.prisma.skillCategory.delete({ where: { id } });
      return { deleted: true };
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.skillCategory.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Skill category not found');
    }
  }

  private handleKnownError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('Skill category already exists');
      }
      if (error.code === 'P2003') {
        throw new ConflictException('Skill category is being used');
      }
    }

    throw error;
  }
}
