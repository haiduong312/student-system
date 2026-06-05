import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssignmentStatus,
  CatalogStatus,
  Prisma,
  StudentRecommendationStatus,
  UserRole,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  buildPaginatedResult,
  getPagination,
} from '../common/pagination/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { AnalysisHistoryQueryDto } from './dto/analysis-query.dto';
import { CompetencyAnalysisEngine } from './domain/competency-analysis.engine';
import { RequiredSkillInput, StudentSkillInput } from './domain/competency-analysis.types';

@Injectable()
export class CompetencyAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: CompetencyAnalysisEngine,
  ) {}

  async analyzeForCurrentStudent(userId: string) {
    const studentId = await this.getStudentIdByUserId(userId);
    return this.analyze(studentId);
  }

  async analyzeForStudent(user: AuthenticatedUser, studentId: string) {
    await this.assertCanAccessStudent(user, studentId);
    return this.analyze(studentId);
  }

  analyzeStudentById(studentId: string) {
    return this.analyze(studentId);
  }

  async getHistoryForCurrentStudent(userId: string, query: AnalysisHistoryQueryDto) {
    const studentId = await this.getStudentIdByUserId(userId);
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.CompetencyAnalysisResultWhereInput = { studentId };

    const [data, total] = await Promise.all([
      this.prisma.competencyAnalysisResult.findMany({
        where,
        skip,
        take,
        orderBy: { analyzedAt: query.sortOrder },
        include: { careerGoal: true },
      }),
      this.prisma.competencyAnalysisResult.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async getResult(user: AuthenticatedUser, id: string) {
    const result = await this.prisma.competencyAnalysisResult.findUnique({
      where: { id },
      include: {
        careerGoal: true,
        details: {
          orderBy: [{ priorityScore: 'desc' }],
          include: { skill: { include: { category: true } } },
        },
        recommendations: {
          orderBy: { priorityScore: 'desc' },
          include: { skill: true, recommendationTemplate: true },
        },
      },
    });
    if (!result) {
      throw new NotFoundException('Analysis result not found');
    }

    await this.assertCanAccessStudent(user, result.studentId);
    return result;
  }

  private async analyze(studentId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { studentId },
      include: { careerGoal: true },
    });
    if (!profile?.careerGoalId) {
      throw new BadRequestException('Student has not selected a career goal');
    }

    const [requiredSkills, studentSkills, recommendationTemplates] = await Promise.all([
      this.prisma.careerRequiredSkill.findMany({
        where: { careerGoalId: profile.careerGoalId, isRequired: true },
        orderBy: { learningOrder: 'asc' },
        include: { skill: true },
      }),
      this.prisma.studentSkill.findMany({
        where: { studentId },
        select: { skillId: true, currentLevel: true },
      }),
      this.prisma.recommendationTemplate.findMany({
        where: {
          status: CatalogStatus.ACTIVE,
          skill: {
            careerRequiredSkills: {
              some: { careerGoalId: profile.careerGoalId },
            },
          },
        },
      }),
    ]);

    if (!requiredSkills.length) {
      throw new BadRequestException('Career goal has no required skills configured');
    }

    const requiredSkillInputs: RequiredSkillInput[] = requiredSkills.map((item) => ({
      skillId: item.skillId,
      skillName: item.skill.name,
      requiredLevel: item.requiredLevel,
      weight: Number(item.weight),
      learningOrder: item.learningOrder,
      isRequired: item.isRequired,
    }));
    const studentSkillInputs: StudentSkillInput[] = studentSkills.map((item) => ({
      skillId: item.skillId,
      currentLevel: item.currentLevel,
    }));

    const completionPercent = await this.calculateCompletionPercent(studentId, profile.careerGoalId);
    const output = this.engine.analyze(
      requiredSkillInputs,
      studentSkillInputs,
      completionPercent,
    );
    const templatesBySkill = new Map(
      recommendationTemplates.map((template) => [template.skillId, template]),
    );

    return this.prisma.$transaction(async (tx) => {
      const analysisResult = await tx.competencyAnalysisResult.create({
        data: {
          studentId,
          careerGoalId: profile.careerGoalId!,
          completionPercent: output.completionPercent,
          matchPercent: output.matchPercent,
          riskScore: output.riskScore,
          matchLevel: output.matchLevel,
          details: {
            create: output.details.map((detail) => ({
              skillId: detail.skillId,
              currentLevel: detail.currentLevel,
              requiredLevel: detail.requiredLevel,
              gap: detail.gap,
              weight: detail.weight,
              achievedScore: detail.achievedScore,
              priorityScore: detail.priorityScore,
              status: detail.status,
            })),
          },
        },
        include: {
          careerGoal: true,
          details: {
            include: { skill: true },
            orderBy: { priorityScore: 'desc' },
          },
        },
      });

      const recommendationsData = output.missingSkills.map((missingSkill) => {
        const template = templatesBySkill.get(missingSkill.skillId);
        return {
          studentId,
          analysisResultId: analysisResult.id,
          skillId: missingSkill.skillId,
          recommendationTemplateId: template?.id,
          title: template?.title ?? `Improve ${missingSkill.skillName}`,
          description:
            template?.description ??
            `Focus on ${missingSkill.skillName} to close a ${missingSkill.gap}-level gap.`,
          reason: `Current level ${missingSkill.currentLevel}/${missingSkill.requiredLevel}; priority score ${missingSkill.priorityScore}.`,
          priorityScore: missingSkill.priorityScore,
          status: StudentRecommendationStatus.NEW,
        };
      });

      if (recommendationsData.length) {
        await tx.studentRecommendation.createMany({ data: recommendationsData });
      }

      await tx.studentProfile.update({
        where: { studentId },
        data: {
          completionPercent: output.completionPercent,
          matchPercent: output.matchPercent,
          riskScore: output.riskScore,
          lastAnalyzedAt: new Date(),
        },
      });

      const recommendations = await tx.studentRecommendation.findMany({
        where: { analysisResultId: analysisResult.id },
        include: { skill: true, recommendationTemplate: true },
        orderBy: { priorityScore: 'desc' },
      });

      return {
        ...analysisResult,
        missingSkills: output.missingSkills,
        recommendations,
      };
    });
  }

  private async calculateCompletionPercent(studentId: string, careerGoalId?: string | null) {
    const [student, skills, projects, certificates, activities, experiences, verifiedEvidences] =
      await Promise.all([
        this.prisma.student.findUnique({ where: { id: studentId } }),
        this.prisma.studentSkill.count({ where: { studentId } }),
        this.prisma.studentProject.count({ where: { studentId } }),
        this.prisma.studentCertificate.count({ where: { studentId } }),
        this.prisma.studentActivity.count({ where: { studentId } }),
        this.prisma.studentExperience.count({ where: { studentId } }),
        this.prisma.evidence.count({ where: { studentId } }),
      ]);

    let percent = 0;
    if (student?.studentCode && student?.major) {
      percent += 10;
    }
    if (careerGoalId) {
      percent += 15;
    }
    if (skills > 0) {
      percent += 20;
    }
    if (projects > 0) {
      percent += 20;
    }
    if (certificates > 0) {
      percent += 10;
    }
    if (activities > 0 || experiences > 0) {
      percent += 10;
    }
    if (verifiedEvidences > 0) {
      percent += 15;
    }

    return percent;
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
