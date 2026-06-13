import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AnalysisSkillStatus,
  AssignmentStatus,
  DifficultyLevel,
  Prisma,
  RecommendationType,
  RoadmapItemStatus,
  RoadmapItemType,
  RoadmapPhase,
  RoadmapStatus,
  SkillLevel,
  UserRole,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateRoadmapDto } from './dto/generate-roadmap.dto';
import {
  RoadmapHistoryItemDto,
  RoadmapItemResponseDto,
  RoadmapPhaseResponseDto,
  RoadmapResponseDto,
} from './dto/roadmap-response.dto';
import { UpdateRoadmapItemStatusDto } from './dto/update-roadmap-item-status.dto';

const PHASE_ORDER: Record<RoadmapPhase, number> = {
  [RoadmapPhase.CORE_FOUNDATION]: 1,
  [RoadmapPhase.CAREER_TRACK]: 2,
  [RoadmapPhase.SPECIALIZATION]: 3,
  [RoadmapPhase.PRACTICE_PROJECT]: 4,
  [RoadmapPhase.PORTFOLIO_PREPARATION]: 5,
};

type RoadmapDetail = Prisma.DevelopmentRoadmapGetPayload<{
  include: {
    careerGoal: true;
    specialization: true;
    items: {
      include: {
        skill: {
          include: {
            category: true;
          };
        };
        recommendation: {
          include: {
            recommendationTemplate: true;
          };
        };
      };
    };
  };
}>;

type LatestAnalysis = Prisma.CompetencyAnalysisResultGetPayload<{
  include: {
    careerGoal: true;
    specialization: true;
  };
}>;

type AnalysisDetailForRoadmap = Prisma.CompetencyAnalysisDetailGetPayload<{
  include: {
    skill: {
      include: {
        category: true;
      };
    };
  };
}>;

type RecommendationForRoadmap = Prisma.StudentRecommendationGetPayload<{
  include: {
    recommendationTemplate: true;
    skill: {
      include: {
        category: true;
      };
    };
  };
}>;

interface RequiredSkillContext {
  skillId: string;
  learningOrder: number;
  weight: number;
  roadmapPhase: RoadmapPhase;
  specializationId: string | null;
  specificityRank: number;
}

interface RoadmapItemDraft {
  skillId: string;
  recommendationId: string;
  title: string;
  description: string | null;
  itemType: RoadmapItemType;
  roadmapPhase: RoadmapPhase;
  orderIndex: number;
  weight: number;
  deadline: Date | null;
  status: RoadmapItemStatus;
  learningOrder: number;
  priorityScore: number;
  recommendationPriority: number;
  skillName: string;
}

@Injectable()
export class RoadmapsService {
  constructor(private readonly prisma: PrismaService) {}

  async generateMyRoadmap(userId: string, _dto: GenerateRoadmapDto = {}) {
    const studentId = await this.getStudentIdByUserId(userId);
    return this.generateRoadmapForStudent(
      studentId,
      _dto.archiveCurrentActiveRoadmap ?? true,
    );
  }

  async generateForCurrentStudent(userId: string) {
    return this.generateMyRoadmap(userId);
  }

  async generateForStudent(user: AuthenticatedUser, studentId: string) {
    await this.assertCanAccessStudent(user, studentId);
    return this.generateRoadmapForStudent(studentId);
  }

  async getMyActiveRoadmap(userId: string) {
    const studentId = await this.getStudentIdByUserId(userId);
    const roadmap = await this.prisma.developmentRoadmap.findFirst({
      where: { studentId, status: RoadmapStatus.ACTIVE },
      orderBy: { version: 'desc' },
      include: this.roadmapDetailInclude(),
    });

    return roadmap ? this.toRoadmapResponse(roadmap) : null;
  }

  async getMyRoadmapHistory(userId: string): Promise<RoadmapHistoryItemDto[]> {
    const studentId = await this.getStudentIdByUserId(userId);
    const roadmaps = await this.prisma.developmentRoadmap.findMany({
      where: { studentId },
      orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        version: true,
        title: true,
        progressPercent: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return roadmaps.map((roadmap) => ({
      roadmapId: roadmap.id,
      version: roadmap.version,
      title: roadmap.title,
      progressPercent: Number(roadmap.progressPercent),
      status: roadmap.status,
      createdAt: roadmap.createdAt,
      updatedAt: roadmap.updatedAt,
    }));
  }

  async getRoadmapDetailWithAuthorization(user: AuthenticatedUser, roadmapId: string) {
    const roadmap = await this.prisma.developmentRoadmap.findUnique({
      where: { id: roadmapId },
      include: this.roadmapDetailInclude(),
    });
    if (!roadmap) {
      throw new NotFoundException('Roadmap not found');
    }

    await this.assertCanAccessStudent(user, roadmap.studentId);
    return this.toRoadmapResponse(roadmap);
  }

  async findOne(user: AuthenticatedUser, roadmapId: string) {
    return this.getRoadmapDetailWithAuthorization(user, roadmapId);
  }

  async updateRoadmapItemStatus(
    userId: string,
    itemId: string,
    dto: UpdateRoadmapItemStatusDto,
  ) {
    const studentId = await this.getStudentIdByUserId(userId);
    const item = await this.prisma.roadmapItem.findFirst({
      where: { id: itemId, roadmap: { studentId } },
      include: { roadmap: true },
    });
    if (!item) {
      throw new NotFoundException('Roadmap item not found');
    }
    if (
      item.roadmap.status === RoadmapStatus.ARCHIVED ||
      item.roadmap.status === RoadmapStatus.CANCELLED
    ) {
      throw new BadRequestException('Archived or cancelled roadmap items cannot be updated');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.roadmapItem.update({
        where: { id: itemId },
        data: { status: dto.status },
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

      const progress = await this.calculateRoadmapProgress(tx, item.roadmapId);
      await tx.developmentRoadmap.update({
        where: { id: item.roadmapId },
        data: {
          progressPercent: progress.progressPercent,
          status: progress.status,
        },
      });

      const roadmap = await tx.developmentRoadmap.findUnique({
        where: { id: item.roadmapId },
        include: this.roadmapDetailInclude(),
      });
      if (!roadmap) {
        throw new NotFoundException('Roadmap not found');
      }

      return this.toRoadmapResponse(roadmap);
    });
  }

  async updateItemStatus(
    userId: string,
    itemId: string,
    dto: UpdateRoadmapItemStatusDto,
  ) {
    return this.updateRoadmapItemStatus(userId, itemId, dto);
  }

  private async generateRoadmapForStudent(
    studentId: string,
    archiveCurrentActiveRoadmap = true,
  ) {
    const profile = await this.getStudentProfile(studentId);
    const careerGoalId = profile.careerGoalId;
    if (!careerGoalId) {
      throw new BadRequestException('Student has not selected a career goal');
    }

    const latestAnalysis = await this.getLatestAnalysisResult(
      studentId,
      careerGoalId,
      profile.specializationId,
    );
    const missingDetails = await this.getMissingAnalysisDetails(latestAnalysis.id);

    if (!missingDetails.length) {
      throw new BadRequestException(
        'You have acquired the skills required for your current goal.',
      );
    }

    const recommendations = await this.getRecommendationsForAnalysis(
      studentId,
      latestAnalysis.id,
      missingDetails.map((detail) => detail.skillId),
    );
    if (!recommendations.length) {
      throw new BadRequestException(
        'No recommendations found for latest analysis. Please analyze competency again.',
      );
    }

    const requiredSkillMap = await this.getRequiredSkillContextMap(
      latestAnalysis.careerGoalId,
      latestAnalysis.specializationId,
      missingDetails.map((detail) => detail.skillId),
    );
    const itemDrafts = this.buildRoadmapItems(
      missingDetails,
      recommendations,
      requiredSkillMap,
    );

    if (!itemDrafts.length) {
      throw new BadRequestException('No roadmap items can be generated from recommendations');
    }

    return this.prisma.$transaction(async (tx) => {
      const version = await this.getNextRoadmapVersion(tx, studentId);
      if (archiveCurrentActiveRoadmap) {
        await this.archiveCurrentActiveRoadmap(tx, studentId);
      } else {
        const activeRoadmapCount = await tx.developmentRoadmap.count({
          where: { studentId, status: RoadmapStatus.ACTIVE },
        });
        if (activeRoadmapCount > 0) {
          throw new BadRequestException(
            'An active roadmap already exists. Archive it before generating a new version.',
          );
        }
      }

      const title = latestAnalysis.specialization
        ? `Personal Development Roadmap for ${latestAnalysis.careerGoal.name} - ${latestAnalysis.specialization.name}`
        : `Personal Development Roadmap for ${latestAnalysis.careerGoal.name}`;

      const roadmap = await tx.developmentRoadmap.create({
        data: {
          studentId,
          careerGoalId: latestAnalysis.careerGoalId,
          specializationId: latestAnalysis.specializationId,
          version,
          title,
          description: `Generated from competency analysis result ${latestAnalysis.id}.`,
          progressPercent: 0,
          status: RoadmapStatus.ACTIVE,
          items: {
            create: itemDrafts.map((item) => ({
              skillId: item.skillId,
              recommendationId: item.recommendationId,
              title: item.title,
              description: item.description,
              itemType: item.itemType,
              roadmapPhase: item.roadmapPhase,
              orderIndex: item.orderIndex,
              weight: item.weight,
              deadline: item.deadline,
              status: RoadmapItemStatus.TODO,
            })),
          },
        },
        include: this.roadmapDetailInclude(),
      });

      return this.toRoadmapResponse(roadmap);
    });
  }

  private async getStudentProfile(studentId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { studentId },
      include: { careerGoal: true, specialization: true },
    });

    if (!profile) {
      throw new BadRequestException('Student profile has not been created');
    }
    if (!profile.careerGoalId || !profile.careerGoal) {
      throw new BadRequestException('Student has not selected a career goal');
    }
    if (profile.specialization && profile.specialization.careerGoalId !== profile.careerGoalId) {
      throw new BadRequestException(
        'Selected specialization does not belong to the selected career goal',
      );
    }

    return profile;
  }

  private async getLatestAnalysisResult(
    studentId: string,
    careerGoalId: string,
    specializationId: string | null,
  ): Promise<LatestAnalysis> {
    const analysis = await this.prisma.competencyAnalysisResult.findFirst({
      where: { studentId, careerGoalId, specializationId },
      orderBy: { analyzedAt: 'desc' },
      include: {
        careerGoal: true,
        specialization: true,
      },
    });

    if (!analysis) {
      throw new BadRequestException('Please analyze competency before generating roadmap.');
    }

    return analysis;
  }

  private getMissingAnalysisDetails(analysisResultId: string) {
    return this.prisma.competencyAnalysisDetail.findMany({
      where: {
        analysisResultId,
        status: {
          in: [AnalysisSkillStatus.MISSING, AnalysisSkillStatus.NEED_IMPROVEMENT],
        },
      },
      include: {
        skill: {
          include: { category: true },
        },
      },
      orderBy: [{ priorityScore: 'desc' }],
    });
  }

  private getRecommendationsForAnalysis(
    studentId: string,
    analysisResultId: string,
    skillIds: string[],
  ) {
    return this.prisma.studentRecommendation.findMany({
      where: {
        studentId,
        analysisResultId,
        skillId: { in: skillIds },
      },
      include: {
        recommendationTemplate: true,
        skill: { include: { category: true } },
      },
      orderBy: [{ priorityScore: 'desc' }, { createdAt: 'asc' }],
    });
  }

  private async getRequiredSkillContextMap(
    careerGoalId: string,
    specializationId: string | null,
    skillIds: string[],
  ) {
    const requiredSkills = await this.prisma.careerRequiredSkill.findMany({
      where: {
        careerGoalId,
        skillId: { in: skillIds },
        OR: specializationId
          ? [{ specializationId: null }, { specializationId }]
          : [{ specializationId: null }],
      },
      orderBy: [{ learningOrder: 'asc' }, { updatedAt: 'asc' }],
    });
    const map = new Map<string, RequiredSkillContext>();

    for (const item of requiredSkills) {
      const specificityRank =
        specializationId && item.specializationId === specializationId ? 1 : 0;
      const candidate: RequiredSkillContext = {
        skillId: item.skillId,
        learningOrder: item.learningOrder,
        weight: Number(item.weight),
        roadmapPhase: item.roadmapPhase,
        specializationId: item.specializationId,
        specificityRank,
      };
      const existing = map.get(item.skillId);

      if (!existing || candidate.specificityRank >= existing.specificityRank) {
        map.set(item.skillId, candidate);
      }
    }

    return map;
  }

  private buildRoadmapItems(
    details: AnalysisDetailForRoadmap[],
    recommendations: RecommendationForRoadmap[],
    requiredSkillMap: Map<string, RequiredSkillContext>,
  ) {
    const recommendationsBySkill = this.getBestRecommendationBySkill(recommendations);
    const drafts = new Map<string, RoadmapItemDraft>();

    for (const detail of details) {
      const recommendation = recommendationsBySkill.get(detail.skillId);
      if (!recommendation) {
        continue;
      }

      const requiredSkill = requiredSkillMap.get(detail.skillId);
      const itemType = this.resolveItemType(recommendation.recommendationTemplate?.recommendationType);
      const roadmapPhase = this.resolveRoadmapPhase(detail, recommendation, requiredSkill);
      const priorityScore = Number(detail.priorityScore);
      const requiredWeight = requiredSkill?.weight ?? Number(detail.weight);
      const weight =
        priorityScore > 0 ? priorityScore : requiredWeight > 0 ? requiredWeight : 10;

      drafts.set(detail.skillId, {
        skillId: detail.skillId,
        recommendationId: recommendation.id,
        title: recommendation.title,
        description:
          recommendation.description ??
          `Close a ${detail.gap}-level gap in ${detail.skill.name}.`,
        itemType,
        roadmapPhase,
        orderIndex: 0,
        weight: this.round(weight),
        deadline: this.resolveDeadline(recommendation.recommendationTemplate),
        status: RoadmapItemStatus.TODO,
        learningOrder: requiredSkill?.learningOrder ?? 999,
        priorityScore,
        recommendationPriority: recommendation.recommendationTemplate?.priority ?? 0,
        skillName: detail.skill.name,
      });
    }

    return this.sortRoadmapItems(Array.from(drafts.values())).map((item, index) => ({
      ...item,
      orderIndex: index + 1,
    }));
  }

  private getBestRecommendationBySkill(recommendations: RecommendationForRoadmap[]) {
    const map = new Map<string, RecommendationForRoadmap>();

    for (const recommendation of recommendations) {
      const existing = map.get(recommendation.skillId);
      if (!existing || this.compareRecommendation(recommendation, existing) < 0) {
        map.set(recommendation.skillId, recommendation);
      }
    }

    return map;
  }

  private sortRoadmapItems(items: RoadmapItemDraft[]) {
    return items.slice().sort((a, b) => {
      if (PHASE_ORDER[a.roadmapPhase] !== PHASE_ORDER[b.roadmapPhase]) {
        return PHASE_ORDER[a.roadmapPhase] - PHASE_ORDER[b.roadmapPhase];
      }
      if (a.learningOrder !== b.learningOrder) {
        return a.learningOrder - b.learningOrder;
      }
      if (a.priorityScore !== b.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }
      if (a.recommendationPriority !== b.recommendationPriority) {
        return b.recommendationPriority - a.recommendationPriority;
      }

      return a.skillName.localeCompare(b.skillName);
    });
  }

  private compareRecommendation(
    a: RecommendationForRoadmap,
    b: RecommendationForRoadmap,
  ) {
    const aPriorityScore = Number(a.priorityScore);
    const bPriorityScore = Number(b.priorityScore);
    if (aPriorityScore !== bPriorityScore) {
      return bPriorityScore - aPriorityScore;
    }

    const aTemplatePriority = a.recommendationTemplate?.priority ?? 0;
    const bTemplatePriority = b.recommendationTemplate?.priority ?? 0;
    if (aTemplatePriority !== bTemplatePriority) {
      return bTemplatePriority - aTemplatePriority;
    }

    return a.createdAt.getTime() - b.createdAt.getTime();
  }

  private resolveItemType(type?: RecommendationType | null) {
    switch (type) {
      case RecommendationType.COURSE:
      case RecommendationType.DOCUMENT:
        return RoadmapItemType.LEARN;
      case RecommendationType.PRACTICE:
        return RoadmapItemType.PRACTICE;
      case RecommendationType.PROJECT:
        return RoadmapItemType.PROJECT;
      case RecommendationType.CERTIFICATE:
        return RoadmapItemType.CERTIFICATE;
      case RecommendationType.PORTFOLIO_TASK:
        return RoadmapItemType.PORTFOLIO;
      default:
        return RoadmapItemType.PRACTICE;
    }
  }

  private resolveRoadmapPhase(
    detail: AnalysisDetailForRoadmap,
    recommendation: RecommendationForRoadmap,
    requiredSkill?: RequiredSkillContext,
  ) {
    if (recommendation.recommendationTemplate?.roadmapPhase) {
      return recommendation.recommendationTemplate.roadmapPhase;
    }
    if (requiredSkill?.roadmapPhase) {
      return requiredSkill.roadmapPhase;
    }
    if (detail.skill.category?.roadmapPhase) {
      return detail.skill.category.roadmapPhase;
    }
    if (recommendation.roadmapPhase) {
      return recommendation.roadmapPhase;
    }
    if (requiredSkill?.specializationId) {
      return RoadmapPhase.SPECIALIZATION;
    }
    if (recommendation.recommendationTemplate?.recommendationType === RecommendationType.PROJECT) {
      return RoadmapPhase.PRACTICE_PROJECT;
    }
    if (
      recommendation.recommendationTemplate?.recommendationType ===
      RecommendationType.PORTFOLIO_TASK
    ) {
      return RoadmapPhase.PORTFOLIO_PREPARATION;
    }

    return RoadmapPhase.CAREER_TRACK;
  }

  private resolveDeadline(
    template: RecommendationForRoadmap['recommendationTemplate'],
  ) {
    if (!template) {
      return null;
    }

    const days = this.resolveDeadlineDays(
      template.recommendationType,
      template.difficultyLevel,
      template.level,
    );

    if (!days) {
      return null;
    }

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + days);
    return deadline;
  }

  private resolveDeadlineDays(
    type: RecommendationType,
    difficulty?: DifficultyLevel | null,
    level?: SkillLevel | null,
  ) {
    if (type === RecommendationType.PROJECT) {
      return 30;
    }
    if (difficulty === DifficultyLevel.BEGINNER || level === SkillLevel.BASIC) {
      return 7;
    }
    if (difficulty === DifficultyLevel.INTERMEDIATE || level === SkillLevel.INTERMEDIATE) {
      return 14;
    }
    if (difficulty === DifficultyLevel.ADVANCED || level === SkillLevel.GOOD) {
      return 21;
    }

    return null;
  }

  private async getNextRoadmapVersion(tx: Prisma.TransactionClient, studentId: string) {
    const latest = await tx.developmentRoadmap.findFirst({
      where: { studentId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    return (latest?.version ?? 0) + 1;
  }

  private archiveCurrentActiveRoadmap(tx: Prisma.TransactionClient, studentId: string) {
    return tx.developmentRoadmap.updateMany({
      where: { studentId, status: RoadmapStatus.ACTIVE },
      data: { status: RoadmapStatus.ARCHIVED },
    });
  }

  private async calculateRoadmapProgress(
    tx: Prisma.TransactionClient,
    roadmapId: string,
  ) {
    const items = await tx.roadmapItem.findMany({
      where: { roadmapId },
      select: { status: true, weight: true },
    });
    const validItems = items.filter((item) => item.status !== RoadmapItemStatus.CANCELLED);
    const totalWeight = validItems.reduce((sum, item) => sum + Number(item.weight), 0);
    if (totalWeight <= 0) {
      return {
        progressPercent: 0,
        status: RoadmapStatus.ACTIVE,
      };
    }

    const completedWeight = validItems
      .filter((item) => item.status === RoadmapItemStatus.DONE)
      .reduce((sum, item) => sum + Number(item.weight), 0);

    const progressPercent = this.round((completedWeight / totalWeight) * 100);

    return {
      progressPercent,
      status: progressPercent >= 100 ? RoadmapStatus.COMPLETED : RoadmapStatus.ACTIVE,
    };
  }

  private toRoadmapResponse(roadmap: RoadmapDetail): RoadmapResponseDto {
    const sortedItems = this.sortRoadmapResponseItems(roadmap.items);
    const phases = Object.values(RoadmapPhase)
      .sort((a, b) => PHASE_ORDER[a] - PHASE_ORDER[b])
      .map<RoadmapPhaseResponseDto>((phase) => ({
        phase,
        items: sortedItems
          .filter((item) => item.roadmapPhase === phase)
          .map<RoadmapItemResponseDto>((item) => ({
            id: item.id,
            skillId: item.skillId,
            skillName: item.skill?.name ?? null,
            recommendationId: item.recommendationId,
            title: item.title,
            description: item.description,
            itemType: item.itemType,
            roadmapPhase: item.roadmapPhase,
            orderIndex: item.orderIndex,
            weight: Number(item.weight),
            status: item.status,
            deadline: item.deadline,
          })),
      }))
      .filter((phase) => phase.items.length > 0);

    return {
      roadmapId: roadmap.id,
      version: roadmap.version,
      title: roadmap.title,
      careerGoal: roadmap.careerGoal.name,
      specialization: roadmap.specialization?.name ?? null,
      progressPercent: Number(roadmap.progressPercent),
      status: roadmap.status,
      phases,
    };
  }

  private sortRoadmapResponseItems(roadmapItems: RoadmapDetail['items']) {
    return roadmapItems.slice().sort((a, b) => {
      if (PHASE_ORDER[a.roadmapPhase] !== PHASE_ORDER[b.roadmapPhase]) {
        return PHASE_ORDER[a.roadmapPhase] - PHASE_ORDER[b.roadmapPhase];
      }

      return a.orderIndex - b.orderIndex;
    });
  }

  private roadmapDetailInclude() {
    return {
      careerGoal: true,
      specialization: true,
      items: {
        orderBy: [{ orderIndex: 'asc' as const }],
        include: {
          skill: { include: { category: true } },
          recommendation: { include: { recommendationTemplate: true } },
        },
      },
    };
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

  private round(value: number) {
    return Math.round(value * 100) / 100;
  }
}
