import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AnalysisSkillStatus,
  AssignmentStatus,
  Prisma,
  RoadmapItemStatus,
  RoadmapStatus,
  UserRole,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  buildPaginatedResult,
  getPagination,
} from '../common/pagination/pagination.util';
import { CompetencyAnalysisService } from '../competency-analysis/competency-analysis.service';
import { PrismaService } from '../prisma/prisma.service';
import { RoadmapBuilderService } from './domain/roadmap-builder.service';
import { MissingSkillForRoadmap } from './domain/roadmap-builder.types';
import { RoadmapQueryDto } from './dto/roadmap-query.dto';
import { UpdateRoadmapItemStatusDto } from './dto/update-roadmap-item-status.dto';

@Injectable()
export class RoadmapsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly competencyAnalysisService: CompetencyAnalysisService,
    private readonly roadmapBuilder: RoadmapBuilderService,
  ) {}

  async generateForCurrentStudent(userId: string) {
    const studentId = await this.getStudentIdByUserId(userId);
    return this.generate(studentId);
  }

  async generateForStudent(user: AuthenticatedUser, studentId: string) {
    await this.assertCanAccessStudent(user, studentId);
    return this.generate(studentId);
  }

  async findMine(userId: string, query: RoadmapQueryDto) {
    const studentId = await this.getStudentIdByUserId(userId);
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.DevelopmentRoadmapWhereInput = {
      studentId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { careerGoal: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const sortBy = ['createdAt', 'updatedAt', 'progressPercent', 'status'].includes(
      query.sortBy ?? '',
    )
      ? query.sortBy!
      : 'createdAt';

    const [data, total] = await Promise.all([
      this.prisma.developmentRoadmap.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: query.sortOrder },
        include: { careerGoal: true, _count: { select: { items: true } } },
      }),
      this.prisma.developmentRoadmap.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const roadmap = await this.prisma.developmentRoadmap.findUnique({
      where: { id },
      include: {
        careerGoal: true,
        items: {
          orderBy: { orderIndex: 'asc' },
          include: { skill: { include: { category: true } } },
        },
      },
    });
    if (!roadmap) {
      throw new NotFoundException('Roadmap not found');
    }

    await this.assertCanAccessStudent(user, roadmap.studentId);
    return roadmap;
  }

  async updateItemStatus(
    userId: string,
    itemId: string,
    dto: UpdateRoadmapItemStatusDto,
  ) {
    const studentId = await this.getStudentIdByUserId(userId);
    const item = await this.prisma.roadmapItem.findFirst({
      where: {
        id: itemId,
        roadmap: { studentId },
      },
      include: { roadmap: true },
    });
    if (!item) {
      throw new NotFoundException('Roadmap item not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedItem = await tx.roadmapItem.update({
        where: { id: itemId },
        data: { status: dto.status },
        include: { skill: true },
      });

      await tx.studentRoadmapProgress.create({
        data: {
          studentId,
          roadmapId: item.roadmapId,
          roadmapItemId: itemId,
          status: dto.status,
          note: dto.note,
        },
      });

      const progressPercent = await this.calculateProgressPercent(tx, item.roadmapId);
      const roadmap = await tx.developmentRoadmap.update({
        where: { id: item.roadmapId },
        data: {
          progressPercent,
          status: progressPercent >= 100 ? RoadmapStatus.COMPLETED : RoadmapStatus.ACTIVE,
        },
      });

      return {
        item: updatedItem,
        roadmap,
      };
    });
  }

  private async generate(studentId: string) {
    const latestAnalysis = await this.getLatestAnalysisOrAnalyze(studentId);
    const missingSkills = latestAnalysis.details
      .filter((detail) => detail.status !== AnalysisSkillStatus.ACHIEVED && detail.gap > 0)
      .map<MissingSkillForRoadmap>((detail) => ({
        skillId: detail.skillId,
        skillName: detail.skill.name,
        gap: detail.gap,
        priorityScore: Number(detail.priorityScore),
        learningOrder: detail.skill.careerRequiredSkills[0]?.learningOrder ?? 999,
      }));

    if (!missingSkills.length) {
      throw new BadRequestException('No missing skills found for roadmap generation');
    }

    const itemDrafts = this.roadmapBuilder.buildItems(missingSkills);

    return this.prisma.$transaction(async (tx) => {
      await tx.developmentRoadmap.updateMany({
        where: { studentId, status: RoadmapStatus.ACTIVE },
        data: { status: RoadmapStatus.CANCELLED },
      });

      return tx.developmentRoadmap.create({
        data: {
          studentId,
          careerGoalId: latestAnalysis.careerGoalId,
          title: `${latestAnalysis.careerGoal.name} Development Roadmap`,
          description: `Generated from analysis result ${latestAnalysis.id}.`,
          progressPercent: 0,
          status: RoadmapStatus.ACTIVE,
          items: {
            create: itemDrafts.map((item) => ({
              skillId: item.skillId,
              title: item.title,
              description: item.description,
              itemType: item.itemType,
              orderIndex: item.orderIndex,
              weight: item.weight,
              status: RoadmapItemStatus.TODO,
            })),
          },
        },
        include: {
          careerGoal: true,
          items: {
            orderBy: { orderIndex: 'asc' },
            include: { skill: true },
          },
        },
      });
    });
  }

  private async getLatestAnalysisOrAnalyze(studentId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { studentId },
      select: { careerGoalId: true },
    });
    if (!profile?.careerGoalId) {
      throw new BadRequestException('Student has not selected a career goal');
    }

    let analysis = await this.prisma.competencyAnalysisResult.findFirst({
      where: { studentId, careerGoalId: profile.careerGoalId },
      orderBy: { analyzedAt: 'desc' },
      include: this.analysisInclude(profile.careerGoalId),
    });

    if (!analysis) {
      await this.competencyAnalysisService.analyzeStudentById(studentId);
      analysis = await this.prisma.competencyAnalysisResult.findFirst({
        where: { studentId, careerGoalId: profile.careerGoalId },
        orderBy: { analyzedAt: 'desc' },
        include: this.analysisInclude(profile.careerGoalId),
      });
    }

    if (!analysis) {
      throw new BadRequestException('Unable to generate analysis for roadmap');
    }

    return analysis;
  }

  private analysisInclude(careerGoalId: string) {
    return {
      careerGoal: true,
      details: {
        include: {
          skill: {
            include: {
              careerRequiredSkills: {
                where: { careerGoalId },
                select: { learningOrder: true },
              },
            },
          },
        },
      },
    } satisfies Prisma.CompetencyAnalysisResultInclude;
  }

  private async calculateProgressPercent(tx: Prisma.TransactionClient, roadmapId: string) {
    const items = await tx.roadmapItem.findMany({
      where: { roadmapId },
      select: { status: true, weight: true },
    });
    const totalWeight = items.reduce((sum, item) => sum + Number(item.weight), 0);
    if (totalWeight <= 0) {
      return 0;
    }

    const completedWeight = items
      .filter((item) => item.status === RoadmapItemStatus.DONE)
      .reduce((sum, item) => sum + Number(item.weight), 0);

    return Math.round((completedWeight / totalWeight) * 10000) / 100;
  }

  private async assertCanAccessStudent(user: AuthenticatedUser, studentId: string) {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    if (user.role === UserRole.STUDENT) {
      const currentStudentId = await this.getStudentIdByUserId(user.id);
      if (currentStudentId === studentId) {
        return;
      }
    }

    if (user.role === UserRole.LECTURER) {
      const lecturer = await this.prisma.lecturer.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      const assignment = lecturer
        ? await this.prisma.advisorAssignment.findFirst({
            where: {
              lecturerId: lecturer.id,
              studentId,
              status: AssignmentStatus.ACTIVE,
            },
            select: { id: true },
          })
        : null;

      if (assignment) {
        return;
      }
    }

    throw new ForbiddenException('You do not have permission to access this student');
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
