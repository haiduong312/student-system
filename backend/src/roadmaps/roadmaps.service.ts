import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AnalysisSkillStatus,
  CatalogStatus,
  DifficultyLevel,
  LearningResourceType,
  Prisma,
  RecommendationType,
  ResourceProgressStatus,
  RoadmapItemStatus,
  RoadmapItemType,
  RoadmapPhase,
  RoadmapStatus,
  SkillLevel,
  StudentRecommendationStatus,
  StudentResourceProgress,
  TemplateStatus,
} from '@prisma/client';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { StudentAccessPolicyService } from '../common/student-access/student-access-policy.service';
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

const ROADMAP_ITEM_STATUS_TRANSITIONS: Record<
  RoadmapItemStatus,
  RoadmapItemStatus[]
> = {
  [RoadmapItemStatus.TODO]: [
    RoadmapItemStatus.IN_PROGRESS,
    RoadmapItemStatus.CANCELLED,
  ],
  [RoadmapItemStatus.IN_PROGRESS]: [
    RoadmapItemStatus.TODO,
    RoadmapItemStatus.DONE,
    RoadmapItemStatus.CANCELLED,
  ],
  [RoadmapItemStatus.DONE]: [RoadmapItemStatus.IN_PROGRESS],
  [RoadmapItemStatus.CANCELLED]: [],
};

const ROADMAP_ACTIONABLE_RECOMMENDATION_STATUSES: StudentRecommendationStatus[] = [
  StudentRecommendationStatus.NEW,
  StudentRecommendationStatus.SAVED,
  StudentRecommendationStatus.IN_PROGRESS,
];

type RoadmapDetail = Prisma.DevelopmentRoadmapGetPayload<{
  include: {
    careerGoal: true;
    specialization: true;
    items: {
      include: {
        skill: {
          include: {
            category: true;
            learningResourceSkills: {
              include: {
                resource: true;
              };
            };
          };
        };
        recommendation: {
          include: {
            recommendationTemplate: true;
            resourceLinks: {
              include: {
                resource: true;
              };
            };
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

interface RoadmapItemResource {
  id: string;
  title: string;
  resourceType: LearningResourceType;
  url: string | null;
  provider: string | null;
  estimatedDuration: string | null;
  orderIndex: number;
}

@Injectable()
export class RoadmapsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentAccessPolicy: StudentAccessPolicyService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  async generateMyRoadmap(userId: string, _dto: GenerateRoadmapDto = {}) {
    const studentId = await this.getStudentIdByUserId(userId);
    return this.generateRoadmapForStudent(
      studentId,
      _dto.archiveCurrentActiveRoadmap ?? true,
      userId,
    );
  }

  async generateForCurrentStudent(userId: string) {
    return this.generateMyRoadmap(userId);
  }

  async generateForStudent(user: AuthenticatedUser, studentId: string) {
    await this.studentAccessPolicy.assertCanAccessStudent(user, studentId);
    return this.generateRoadmapForStudent(studentId, true, user.id);
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

    await this.studentAccessPolicy.assertCanAccessStudent(user, roadmap.studentId);
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
    if (item.status === dto.status) {
      const roadmap = await this.prisma.$transaction(async (tx) => {
        if (dto.status === RoadmapItemStatus.DONE && item.recommendationId) {
          await this.completeRecommendationForRoadmapItem(
            tx,
            studentId,
            item.recommendationId,
          );
        }

        return tx.developmentRoadmap.findUnique({
          where: { id: item.roadmapId },
          include: this.roadmapDetailInclude(),
        });
      });
      if (!roadmap) {
        throw new NotFoundException('Roadmap not found');
      }

      return this.toRoadmapResponse(roadmap);
    }

    this.assertValidRoadmapItemStatusTransition(item.status, dto.status, dto.note);

    const roadmap = await this.prisma.$transaction(async (tx) => {
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

      if (dto.status === RoadmapItemStatus.DONE && item.recommendationId) {
        await this.completeRecommendationForRoadmapItem(
          tx,
          studentId,
          item.recommendationId,
        );
      }

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

      return roadmap;
    });
    const response = await this.toRoadmapResponse(roadmap);
    await this.activityLogs.record({
      actorUserId: userId,
      action: 'ROADMAP_ITEM_STATUS_UPDATED',
      entityType: 'RoadmapItem',
      entityId: itemId,
      description: {
        roadmapId: item.roadmapId,
        fromStatus: item.status,
        toStatus: dto.status,
        note: dto.note,
      },
    });

    return response;
  }

  async updateItemStatus(
    userId: string,
    itemId: string,
    dto: UpdateRoadmapItemStatusDto,
  ) {
    return this.updateRoadmapItemStatus(userId, itemId, dto);
  }

  private completeRecommendationForRoadmapItem(
    tx: Prisma.TransactionClient,
    studentId: string,
    recommendationId: string,
  ) {
    return tx.studentRecommendation.updateMany({
      where: {
        id: recommendationId,
        studentId,
        status: { in: ROADMAP_ACTIONABLE_RECOMMENDATION_STATUSES },
      },
      data: { status: StudentRecommendationStatus.DONE },
    });
  }

  private assertValidRoadmapItemStatusTransition(
    currentStatus: RoadmapItemStatus,
    nextStatus: RoadmapItemStatus,
    note?: string,
  ) {
    const allowedNextStatuses = ROADMAP_ITEM_STATUS_TRANSITIONS[currentStatus];
    if (!allowedNextStatuses.includes(nextStatus)) {
      if (currentStatus === RoadmapItemStatus.CANCELLED) {
        throw new BadRequestException('Cancelled roadmap items cannot be changed');
      }

      throw new BadRequestException(
        `Invalid roadmap item status transition: ${currentStatus} -> ${nextStatus}`,
      );
    }

    if (
      currentStatus === RoadmapItemStatus.DONE &&
      nextStatus === RoadmapItemStatus.IN_PROGRESS &&
      !note?.trim()
    ) {
      throw new BadRequestException(
        'A note is required to move a DONE roadmap item back to IN_PROGRESS',
      );
    }
  }

  private async generateRoadmapForStudent(
    studentId: string,
    archiveCurrentActiveRoadmap = true,
    actorUserId?: string,
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

    const roadmap = await this.prisma.$transaction(async (tx) => {
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
        ? `${latestAnalysis.specialization.name} Roadmap`
        : `${latestAnalysis.careerGoal.name} Roadmap`;

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

      return roadmap;
    });
    const response = await this.toRoadmapResponse(roadmap);
    await this.activityLogs.record({
      actorUserId,
      action: 'ROADMAP_GENERATED',
      entityType: 'DevelopmentRoadmap',
      entityId: response.roadmapId,
      description: {
        studentId,
        careerGoalId,
        specializationId: profile.specializationId,
        version: response.version,
        itemCount: response.phases.reduce(
          (sum, phase) => sum + phase.items.length,
          0,
        ),
      },
    });

    return response;
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
    if (profile.careerGoal.status !== CatalogStatus.ACTIVE) {
      throw new BadRequestException('Selected career goal is not active');
    }
    if (profile.specialization && profile.specialization.careerGoalId !== profile.careerGoalId) {
      throw new BadRequestException(
        'Selected specialization does not belong to the selected career goal',
      );
    }
    if (profile.specialization && profile.specialization.status !== CatalogStatus.ACTIVE) {
      throw new BadRequestException('Selected specialization is not active');
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
        status: { in: ROADMAP_ACTIONABLE_RECOMMENDATION_STATUSES },
        skill: { status: CatalogStatus.ACTIVE },
        OR: [
          { recommendationTemplateId: null },
          { recommendationTemplate: { status: TemplateStatus.ACTIVE } },
        ],
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
        skill: { status: CatalogStatus.ACTIVE },
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

  private async toRoadmapResponse(roadmap: RoadmapDetail): Promise<RoadmapResponseDto> {
    const sortedItems = this.sortRoadmapResponseItems(roadmap.items);
    const resourcesByItemId = new Map<string, RoadmapItemResource[]>();
    const resourceIds = new Set<string>();

    for (const item of sortedItems) {
      const resources = this.getRoadmapItemResources(item);
      resourcesByItemId.set(item.id, resources);
      for (const resource of resources) {
        resourceIds.add(resource.id);
      }
    }

    const progressByResourceId = await this.getResourceProgressByResourceId(
      roadmap.studentId,
      Array.from(resourceIds),
    );
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
            resources: (resourcesByItemId.get(item.id) ?? []).map((resource) =>
              this.toRoadmapItemResourceResponse(
                resource,
                progressByResourceId.get(resource.id),
              ),
            ),
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

  private getRoadmapItemResources(
    item: RoadmapDetail['items'][number],
  ): RoadmapItemResource[] {
    const recommendationResources = item.recommendation?.resourceLinks
      .filter((link) => link.resource.status === CatalogStatus.ACTIVE)
      .map<RoadmapItemResource>((link) => ({
        id: link.resourceId,
        title: link.resourceTitle,
        resourceType: link.resourceType,
        url: link.resourceUrl,
        provider: link.provider,
        estimatedDuration: link.estimatedDuration,
        orderIndex: link.orderIndex,
      })) ?? [];

    if (recommendationResources.length > 0) {
      return recommendationResources;
    }

    return (
      item.skill?.learningResourceSkills
        .filter((link) => link.resource.status === CatalogStatus.ACTIVE)
        .map<RoadmapItemResource>((link) => ({
          id: link.resourceId,
          title: link.resource.title,
          resourceType: link.resource.resourceType,
          url: link.resource.url,
          provider: link.resource.provider,
          estimatedDuration: link.resource.estimatedDuration,
          orderIndex: link.orderIndex,
        })) ?? []
    );
  }

  private toRoadmapItemResourceResponse(
    resource: RoadmapItemResource,
    progress?: StudentResourceProgress,
  ) {
    return {
      ...resource,
      progressStatus: progress?.status ?? ResourceProgressStatus.NOT_STARTED,
    };
  }

  private async getResourceProgressByResourceId(
    studentId: string,
    resourceIds: string[],
  ) {
    const uniqueResourceIds = Array.from(new Set(resourceIds));
    if (!uniqueResourceIds.length) {
      return new Map<string, StudentResourceProgress>();
    }

    const progress = await this.prisma.studentResourceProgress.findMany({
      where: {
        studentId,
        resourceId: { in: uniqueResourceIds },
      },
    });

    return new Map(progress.map((item) => [item.resourceId, item]));
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
          skill: {
            include: {
              category: true,
              learningResourceSkills: {
                where: { resource: { status: CatalogStatus.ACTIVE } },
                orderBy: [
                  { orderIndex: 'asc' as const },
                  { relevanceScore: 'desc' as const },
                  { createdAt: 'asc' as const },
                ],
                include: { resource: true },
              },
            },
          },
          recommendation: {
            include: {
              recommendationTemplate: true,
              resourceLinks: {
                where: { resource: { status: CatalogStatus.ACTIVE } },
                orderBy: [
                  { orderIndex: 'asc' as const },
                  { createdAt: 'asc' as const },
                ],
                include: { resource: true },
              },
            },
          },
        },
      },
    };
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
