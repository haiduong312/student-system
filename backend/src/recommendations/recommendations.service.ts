import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  buildPaginatedResult,
  getPagination,
} from '../common/pagination/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { RecommendationQueryDto } from './dto/recommendation-query.dto';
import { UpdateRecommendationStatusDto } from './dto/update-recommendation-status.dto';

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMine(userId: string, query: RecommendationQueryDto) {
    const studentId = await this.getStudentIdByUserId(userId);
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.StudentRecommendationWhereInput = {
      studentId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.skillId ? { skillId: query.skillId } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { reason: { contains: query.search, mode: 'insensitive' } },
              { skill: { name: { contains: query.search, mode: 'insensitive' } } },
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
        include: { skill: true, recommendationTemplate: true, analysisResult: true },
      }),
      this.prisma.studentRecommendation.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async updateStatus(
    userId: string,
    id: string,
    dto: UpdateRecommendationStatusDto,
  ) {
    const studentId = await this.getStudentIdByUserId(userId);
    const recommendation = await this.prisma.studentRecommendation.findFirst({
      where: { id, studentId },
      select: { id: true },
    });
    if (!recommendation) {
      throw new NotFoundException('Recommendation not found');
    }

    return this.prisma.studentRecommendation.update({
      where: { id },
      data: { status: dto.status },
      include: { skill: true, recommendationTemplate: true },
    });
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
