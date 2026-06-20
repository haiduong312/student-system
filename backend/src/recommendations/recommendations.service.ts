import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CatalogStatus,
  Prisma,
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
      where: {
        id,
        studentId,
        skill: { status: CatalogStatus.ACTIVE },
        OR: [
          { recommendationTemplateId: null },
          { recommendationTemplate: { status: TemplateStatus.ACTIVE } },
        ],
      },
      include: { skill: true, recommendationTemplate: true },
    });
    if (!recommendation) {
      throw new NotFoundException('Recommendation not found');
    }
    if (recommendation.status === dto.status) {
      return recommendation;
    }

    this.assertValidStatusTransition(recommendation.status, dto.status);

    return this.prisma.studentRecommendation.update({
      where: { id },
      data: { status: dto.status },
      include: { skill: true, recommendationTemplate: true },
    });
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
