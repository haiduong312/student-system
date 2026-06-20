import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, Prisma, UserRole } from '@prisma/client';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  buildPaginatedResult,
  getPagination,
} from '../common/pagination/pagination.util';
import { StudentAccessPolicyService } from '../common/student-access/student-access-policy.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdvisorReviewQueryDto } from './dto/advisor-review-query.dto';
import { CreateAdvisorReviewDto } from './dto/create-advisor-review.dto';

const SORTABLE_FIELDS = new Set(['createdAt', 'updatedAt', 'rating']);

@Injectable()
export class AdvisorReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentAccessPolicy: StudentAccessPolicyService,
    private readonly notificationsService: NotificationsService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  async createForStudent(
    user: AuthenticatedUser,
    studentId: string,
    dto: CreateAdvisorReviewDto,
  ) {
    await this.studentAccessPolicy.assertCanAccessStudent(user, studentId);
    const lecturer = await this.getLecturerByUserId(user.id);
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, userId: true },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const review = await this.prisma.advisorReview.create({
      data: {
        studentId,
        lecturerId: lecturer.id,
        reviewContent: dto.reviewContent,
        suggestion: dto.suggestion,
        rating: dto.rating,
      },
      include: this.detailInclude(),
    });

    await this.notificationsService.createOnce({
      userId: student.userId,
      title: 'New advisor review',
      content: 'Your advisor has added a new review to your profile.',
      notificationType: NotificationType.ADVISOR_REVIEW,
      relatedEntityType: 'ADVISOR_REVIEW',
      relatedEntityId: review.id,
      dedupWindowHours: 0,
    });
    await this.activityLogs.record({
      actorUserId: user.id,
      action: 'ADVISOR_REVIEW_CREATED',
      entityType: 'AdvisorReview',
      entityId: review.id,
      description: {
        studentId,
        lecturerId: lecturer.id,
        rating: review.rating,
      },
    });

    return review;
  }

  async findMine(userId: string, query: AdvisorReviewQueryDto) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!student) {
      throw new ForbiddenException('Current user is not a student');
    }

    return this.findByStudentId(student.id, query);
  }

  async findAll(query: AdvisorReviewQueryDto) {
    return this.findMany(query);
  }

  async findForStudent(
    user: AuthenticatedUser,
    studentId: string,
    query: AdvisorReviewQueryDto,
  ) {
    await this.studentAccessPolicy.assertCanAccessStudent(user, studentId);
    return this.findByStudentId(studentId, query);
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const review = await this.prisma.advisorReview.findUnique({
      where: { id },
      include: this.detailInclude(),
    });
    if (!review) {
      throw new NotFoundException('Advisor review not found');
    }

    if (user.role !== UserRole.ADMIN) {
      await this.studentAccessPolicy.assertCanAccessStudent(user, review.studentId);
    }

    return review;
  }

  private findByStudentId(studentId: string, query: AdvisorReviewQueryDto) {
    return this.findMany({ ...query, studentId });
  }

  private async findMany(query: AdvisorReviewQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.AdvisorReviewWhereInput = {
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.lecturerId ? { lecturerId: query.lecturerId } : {}),
      ...(query.search
        ? {
            OR: [
              { reviewContent: { contains: query.search, mode: 'insensitive' } },
              { suggestion: { contains: query.search, mode: 'insensitive' } },
              { student: { studentCode: { contains: query.search, mode: 'insensitive' } } },
              { student: { user: { fullName: { contains: query.search, mode: 'insensitive' } } } },
              { lecturer: { lecturerCode: { contains: query.search, mode: 'insensitive' } } },
              { lecturer: { user: { fullName: { contains: query.search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };
    const sortBy = SORTABLE_FIELDS.has(query.sortBy ?? '')
      ? query.sortBy!
      : 'createdAt';

    const [data, total] = await Promise.all([
      this.prisma.advisorReview.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: query.sortOrder },
        include: this.detailInclude(),
      }),
      this.prisma.advisorReview.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  private async getLecturerByUserId(userId: string) {
    const lecturer = await this.prisma.lecturer.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!lecturer) {
      throw new ForbiddenException('Current user is not a lecturer');
    }

    return lecturer;
  }

  private detailInclude() {
    return {
      student: {
        include: {
          user: { select: { id: true, fullName: true, email: true, role: true } },
        },
      },
      lecturer: {
        include: {
          user: { select: { id: true, fullName: true, email: true, role: true } },
        },
      },
    };
  }
}
