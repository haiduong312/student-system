import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  AnalysisSkillStatus,
  AssignmentStatus,
  EvidenceStatus,
  RoadmapStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStudentDashboard(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!student) {
      throw new ForbiddenException('Current user is not a student');
    }

    const profile = await this.prisma.studentProfile.findUnique({
      where: { studentId: student.id },
      include: { careerGoal: true },
    });
    const currentScopeWhere = profile?.careerGoalId
      ? {
          studentId: student.id,
          careerGoalId: profile.careerGoalId,
          specializationId: profile.specializationId,
        }
      : null;
    const [latestAnalysis, activeRoadmap] = currentScopeWhere
      ? await Promise.all([
          this.prisma.competencyAnalysisResult.findFirst({
            where: currentScopeWhere,
            orderBy: { analyzedAt: 'desc' },
            include: {
              details: {
                where: { status: { in: [AnalysisSkillStatus.MISSING, AnalysisSkillStatus.NEED_IMPROVEMENT] } },
                orderBy: { priorityScore: 'desc' },
                take: 10,
                include: { skill: { include: { category: true } } },
              },
            },
          }),
          this.prisma.developmentRoadmap.findFirst({
            where: { ...currentScopeWhere, status: RoadmapStatus.ACTIVE },
            orderBy: { createdAt: 'desc' },
            include: {
              _count: { select: { items: true } },
            },
          }),
        ])
      : [null, null];

    return {
      completionPercent: Number(profile?.completionPercent ?? 0),
      matchPercent: Number(profile?.matchPercent ?? latestAnalysis?.matchPercent ?? 0),
      careerGoal: profile?.careerGoal ?? null,
      missingSkills:
        latestAnalysis?.details.map((detail) => ({
          skillId: detail.skillId,
          skill: detail.skill,
          currentLevel: detail.currentLevel,
          requiredLevel: detail.requiredLevel,
          gap: detail.gap,
          priorityScore: Number(detail.priorityScore),
          status: detail.status,
        })) ?? [],
      roadmapProgress: {
        roadmapId: activeRoadmap?.id ?? null,
        progressPercent: Number(activeRoadmap?.progressPercent ?? 0),
        status: activeRoadmap?.status ?? null,
        itemCount: activeRoadmap?._count.items ?? 0,
      },
    };
  }

  async getLecturerDashboard(userId: string) {
    const lecturer = await this.prisma.lecturer.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!lecturer) {
      throw new ForbiddenException('Current user is not a lecturer');
    }

    const assignedStudentWhere = {
      advisorAssignments: {
        some: {
          lecturerId: lecturer.id,
          status: AssignmentStatus.ACTIVE,
        },
      },
    };

    const [studentCount, weakStudents, pendingEvidence] = await Promise.all([
      this.prisma.student.count({ where: assignedStudentWhere }),
      this.prisma.student.count({
        where: {
          ...assignedStudentWhere,
          profile: {
            OR: [
              { completionPercent: { lt: 50 } },
              { matchPercent: { lt: 40 } },
              { riskScore: { gte: 60 } },
            ],
          },
        },
      }),
      this.prisma.evidence.count({
        where: {
          status: EvidenceStatus.PENDING,
          student: assignedStudentWhere,
        },
      }),
    ]);

    return {
      studentCount,
      weakStudents,
      pendingEvidence,
    };
  }

  async getAdminDashboard() {
    const [
      totalStudents,
      totalLecturers,
      latestMissingDetails,
      careerGoalGroups,
    ] = await Promise.all([
      this.prisma.student.count(),
      this.prisma.lecturer.count(),
      this.getTopMissingSkills(),
      this.prisma.studentProfile.groupBy({
        by: ['careerGoalId'],
        where: { careerGoalId: { not: null } },
        _count: { careerGoalId: true },
        orderBy: { _count: { careerGoalId: 'desc' } },
        take: 10,
      }),
    ]);

    const [skills, careerGoals] = await Promise.all([
      this.prisma.skill.findMany({
        where: { id: { in: latestMissingDetails.map((item) => item.skillId) } },
        include: { category: true },
      }),
      this.prisma.careerGoal.findMany({
        where: {
          id: {
            in: careerGoalGroups
              .map((item) => item.careerGoalId)
              .filter((id): id is string => Boolean(id)),
          },
        },
      }),
    ]);

    const skillMap = new Map(skills.map((skill) => [skill.id, skill]));
    const careerGoalMap = new Map(careerGoals.map((goal) => [goal.id, goal]));

    return {
      totalStudents,
      totalLecturers,
      topMissingSkills: latestMissingDetails.map((item) => ({
        skillId: item.skillId,
        skill: skillMap.get(item.skillId) ?? null,
        missingCount: item._count.skillId,
      })),
      topCareerGoals: careerGoalGroups.map((item) => ({
        careerGoalId: item.careerGoalId,
        careerGoal: item.careerGoalId ? careerGoalMap.get(item.careerGoalId) ?? null : null,
        studentCount: item._count.careerGoalId,
      })),
    };
  }

  private async getTopMissingSkills() {
    const latestAnalysisIds = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT DISTINCT ON (student_id) id
      FROM competency_analysis_results
      ORDER BY student_id, analyzed_at DESC
    `;

    if (!latestAnalysisIds.length) {
      return [];
    }

    return this.prisma.competencyAnalysisDetail.groupBy({
      by: ['skillId'],
      where: {
        analysisResultId: { in: latestAnalysisIds.map((item) => item.id) },
        status: { in: [AnalysisSkillStatus.MISSING, AnalysisSkillStatus.NEED_IMPROVEMENT] },
      },
      _count: { skillId: true },
      orderBy: { _count: { skillId: 'desc' } },
      take: 10,
    });
  }
}
