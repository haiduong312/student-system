import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import {
    AnalysisSkillStatus,
    CatalogStatus,
    EvidenceEntityType,
    EvidenceStatus,
    MatchLevel,
    Prisma,
    RecommendationTemplate,
    RecommendationType,
    RoadmapPhase,
    SkillLevel,
    StudentRecommendationStatus,
    TemplateStatus,
} from "@prisma/client";
import { ActivityLogsService } from "../activity-logs/activity-logs.service";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import {
    buildPaginatedResult,
    getPagination,
} from "../common/pagination/pagination.util";
import { StudentAccessPolicyService } from "../common/student-access/student-access-policy.service";
import { PrismaService } from "../prisma/prisma.service";
import { AnalysisHistoryQueryDto } from "./dto/analysis-query.dto";
import { AnalyzeCompetencyDto } from "./dto/analyze-competency.dto";
import {
    AnalyzedSkillResponseDto,
    CompetencyAnalysisResponseDto,
    RecommendationSummaryDto,
} from "./dto/competency-analysis-response.dto";

type RecommendationSource =
    | "SPECIALIZATION_CAREER_SKILL_TEMPLATE"
    | "CAREER_SKILL_TEMPLATE"
    | "CATEGORY_SKILL_TEMPLATE"
    | "SKILL_TEMPLATE"
    | "DEFAULT_GENERATED";

const EVIDENCE_COMPLETION_POINTS = 15;
const VERIFIED_EVIDENCE_WEIGHT = 1;
const PENDING_EVIDENCE_WEIGHT = 0.3;
const REJECTED_EVIDENCE_WEIGHT = 0;

interface StudentProfileContext {
    studentId: string;
    careerGoalId: string;
    careerGoalName: string;
    specializationId: string | null;
    specializationName: string | null;
}

interface RequiredSkillForAnalysis {
    skillId: string;
    skillName: string;
    categoryId: string | null;
    categoryName: string | null;
    requiredLevel: number;
    weight: number;
    learningOrder: number;
    isRequired: boolean;
    roadmapPhase: RoadmapPhase;
    specificityRank: number;
}

interface AnalyzedSkill extends RequiredSkillForAnalysis {
    currentLevel: number;
    gap: number;
    skillScore: number;
    priorityScore: number;
    status: AnalysisSkillStatus;
    recommendation?: RecommendationDecision;
}

interface RecommendationDecision {
    templateId: string | null;
    title: string;
    description: string | null;
    type: RecommendationType;
    roadmapPhase: RoadmapPhase;
    source: RecommendationSource;
}

@Injectable()
export class CompetencyAnalysisService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly studentAccessPolicy: StudentAccessPolicyService,
        private readonly activityLogs: ActivityLogsService,
    ) {}

    analyzeForCurrentStudent(userId: string, dto?: AnalyzeCompetencyDto) {
        return this.analyzeMyCompetency(userId, dto);
    }

    async analyzeMyCompetency(
        userId: string,
        dto: AnalyzeCompetencyDto = {},
    ): Promise<CompetencyAnalysisResponseDto> {
        return this.analyzeCompetencyForStudentUser(userId, userId, dto);
    }

    private async analyzeCompetencyForStudentUser(
        studentUserId: string,
        actorUserId: string,
        dto: AnalyzeCompetencyDto = {},
    ): Promise<CompetencyAnalysisResponseDto> {
        const profile = await this.getStudentProfile(studentUserId);
        const requiredSkills = await this.getRequiredSkills(
            profile.careerGoalId,
            profile.specializationId,
        );

        if (!requiredSkills.length) {
            throw new BadRequestException(
                "Career goal has no required skills configured",
            );
        }

        const [studentSkills, completionPercent] = await Promise.all([
            this.prisma.studentSkill.findMany({
                where: { studentId: profile.studentId },
                select: { skillId: true, currentLevel: true },
            }),
            this.calculateCompletionPercent(
                profile.studentId,
                profile.careerGoalId,
                profile.specializationId,
                requiredSkills.map((skill) => skill.skillId),
            ),
        ]);

        const analyzedSkills = this.calculateSkillAnalysis(
            requiredSkills,
            studentSkills,
        );
        const totalWeight = this.round(
            analyzedSkills.reduce((sum, item) => sum + item.weight, 0),
        );
        const totalSkillScore = this.round(
            analyzedSkills.reduce((sum, item) => sum + item.skillScore, 0),
        );
        const matchPercent =
            totalWeight > 0
                ? this.round((totalSkillScore / totalWeight) * 100)
                : 0;
        const matchLevel = this.resolveMatchLevel(matchPercent);
        const riskScore = this.calculateRiskScore(
            completionPercent,
            matchPercent,
            analyzedSkills,
        );

        const result = await this.saveAnalysisWithRecommendations({
            profile,
            analyzedSkills,
            completionPercent,
            matchPercent,
            matchLevel,
            riskScore,
            totalWeight,
            totalSkillScore,
            deleteOldNewRecommendations:
                dto.deleteOldNewRecommendations ?? true,
        });
        await this.activityLogs.record({
            actorUserId,
            action: "COMPETENCY_ANALYSIS_RUN",
            entityType: "CompetencyAnalysisResult",
            entityId: result.analysisResultId,
            description: {
                studentId: profile.studentId,
                careerGoalId: profile.careerGoalId,
                specializationId: profile.specializationId,
                matchPercent: result.matchPercent,
                matchLevel: result.matchLevel,
            },
        });

        return result;
    }

    async analyzeForStudent(user: AuthenticatedUser, studentId: string) {
        await this.studentAccessPolicy.assertCanAccessStudent(user, studentId);
        const student = await this.prisma.student.findUnique({
            where: { id: studentId },
            select: { userId: true },
        });
        if (!student) {
            throw new NotFoundException("Student not found");
        }

        return this.analyzeCompetencyForStudentUser(student.userId, user.id);
    }

    analyzeStudentById(studentId: string) {
        return this.analyzeByStudentId(studentId);
    }

    async getHistoryForCurrentStudent(
        userId: string,
        query: AnalysisHistoryQueryDto,
    ) {
        const studentId = await this.getStudentIdByUserId(userId);
        const { page, limit, skip, take } = getPagination(query);
        const where: Prisma.CompetencyAnalysisResultWhereInput = { studentId };

        const [data, total] = await Promise.all([
            this.prisma.competencyAnalysisResult.findMany({
                where,
                skip,
                take,
                orderBy: { analyzedAt: query.sortOrder },
                include: { careerGoal: true, specialization: true },
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
                specialization: true,
                details: {
                    orderBy: [{ priorityScore: "desc" }],
                    include: { skill: { include: { category: true } } },
                },
                recommendations: {
                    orderBy: { priorityScore: "desc" },
                    include: { skill: true, recommendationTemplate: true },
                },
            },
        });
        if (!result) {
            throw new NotFoundException("Analysis result not found");
        }

        await this.studentAccessPolicy.assertCanAccessStudent(
            user,
            result.studentId,
        );
        return result;
    }

    async getStudentProfile(userId: string): Promise<StudentProfileContext> {
        const student = await this.prisma.student.findUnique({
            where: { userId },
            select: {
                id: true,
                profile: {
                    include: {
                        careerGoal: true,
                        specialization: true,
                    },
                },
            },
        });

        if (!student) {
            throw new ForbiddenException("Current user is not a student");
        }
        if (!student.profile) {
            throw new BadRequestException(
                "Student profile has not been created",
            );
        }
        if (!student.profile.careerGoalId || !student.profile.careerGoal) {
            throw new BadRequestException(
                "Student has not selected a career goal",
            );
        }
        if (student.profile.careerGoal.status !== CatalogStatus.ACTIVE) {
            throw new BadRequestException("Selected career goal is not active");
        }
        if (
            student.profile.specialization &&
            student.profile.specialization.careerGoalId !==
                student.profile.careerGoalId
        ) {
            throw new BadRequestException(
                "Selected specialization does not belong to the selected career goal",
            );
        }
        if (
            student.profile.specialization &&
            student.profile.specialization.status !== CatalogStatus.ACTIVE
        ) {
            throw new BadRequestException("Selected specialization is not active");
        }

        return {
            studentId: student.id,
            careerGoalId: student.profile.careerGoalId,
            careerGoalName: student.profile.careerGoal.name,
            specializationId: student.profile.specializationId,
            specializationName: student.profile.specialization?.name ?? null,
        };
    }

    async getRequiredSkills(
        careerGoalId: string,
        specializationId?: string | null,
    ): Promise<RequiredSkillForAnalysis[]> {
        const requiredSkills = await this.prisma.careerRequiredSkill.findMany({
            where: {
                careerGoalId,
                isRequired: true,
                skill: { status: CatalogStatus.ACTIVE },
                OR: specializationId
                    ? [{ specializationId: null }, { specializationId }]
                    : [{ specializationId: null }],
            },
            include: {
                skill: {
                    include: { category: true },
                },
            },
            orderBy: [{ learningOrder: "asc" }, { updatedAt: "asc" }],
        });

        const dedupedBySkill = new Map<string, RequiredSkillForAnalysis>();

        for (const item of requiredSkills) {
            const specificityRank =
                specializationId && item.specializationId === specializationId
                    ? 1
                    : 0;
            const candidate: RequiredSkillForAnalysis = {
                skillId: item.skillId,
                skillName: item.skill.name,
                categoryId: item.skill.categoryId,
                categoryName: item.skill.category?.name ?? null,
                requiredLevel: item.requiredLevel,
                weight: Number(item.weight),
                learningOrder: item.learningOrder,
                isRequired: item.isRequired,
                roadmapPhase: item.roadmapPhase,
                specificityRank,
            };
            const existing = dedupedBySkill.get(item.skillId);

            // Specialization-level requirements override career-level requirements.
            if (
                !existing ||
                candidate.specificityRank >= existing.specificityRank
            ) {
                dedupedBySkill.set(item.skillId, candidate);
            }
        }

        return Array.from(dedupedBySkill.values()).sort((a, b) => {
            if (a.learningOrder !== b.learningOrder) {
                return a.learningOrder - b.learningOrder;
            }

            return a.skillName.localeCompare(b.skillName);
        });
    }

    calculateSkillAnalysis(
        requiredSkills: RequiredSkillForAnalysis[],
        studentSkills: Array<{ skillId: string; currentLevel: number }>,
    ): AnalyzedSkill[] {
        const studentSkillMap = new Map(
            studentSkills.map((skill) => [skill.skillId, skill.currentLevel]),
        );

        return requiredSkills.map((requiredSkill) => {
            const currentLevel =
                studentSkillMap.get(requiredSkill.skillId) ?? 0;
            const skillScore =
                requiredSkill.requiredLevel <= 0
                    ? this.round(requiredSkill.weight)
                    : this.round(
                          Math.min(
                              currentLevel / requiredSkill.requiredLevel,
                              1,
                          ) * requiredSkill.weight,
                      );
            const gap = Math.max(requiredSkill.requiredLevel - currentLevel, 0);
            const priorityScore = this.round(gap * requiredSkill.weight);

            return {
                ...requiredSkill,
                currentLevel,
                gap,
                skillScore,
                priorityScore,
                status: this.resolveSkillStatus(
                    currentLevel,
                    requiredSkill.requiredLevel,
                ),
            };
        });
    }

    async findBestRecommendationTemplate(
        tx: Prisma.TransactionClient,
        input: {
            careerGoalId: string;
            specializationId: string | null;
            skillId: string;
            skillCategoryId: string | null;
            requiredLevel: number;
        },
    ): Promise<{
        template: RecommendationTemplate;
        source: RecommendationSource;
    } | null> {
        const level = this.toSkillLevel(input.requiredLevel);
        const fallbackScopes: Array<{
            source: RecommendationSource;
            where: Prisma.RecommendationTemplateWhereInput;
        }> = [];

        if (input.specializationId) {
            fallbackScopes.push({
                source: "SPECIALIZATION_CAREER_SKILL_TEMPLATE",
                where: {
                    specializationId: input.specializationId,
                    careerGoalId: input.careerGoalId,
                    skillId: input.skillId,
                },
            });
        }

        fallbackScopes.push({
            source: "CAREER_SKILL_TEMPLATE",
            where: {
                specializationId: null,
                careerGoalId: input.careerGoalId,
                skillId: input.skillId,
            },
        });

        if (input.skillCategoryId) {
            fallbackScopes.push({
                source: "CATEGORY_SKILL_TEMPLATE",
                where: {
                    specializationId: null,
                    careerGoalId: null,
                    skillCategoryId: input.skillCategoryId,
                    skillId: input.skillId,
                },
            });
        }

        fallbackScopes.push({
            source: "SKILL_TEMPLATE",
            where: {
                specializationId: null,
                careerGoalId: null,
                skillCategoryId: null,
                skillId: input.skillId,
            },
        });

        for (const scope of fallbackScopes) {
            const template = await this.findTemplateByScope(
                tx,
                scope.where,
                level,
            );
            if (template) {
                return { template, source: scope.source };
            }
        }

        return null;
    }

    generateDefaultRecommendation(
        skill: AnalyzedSkill,
    ): RecommendationDecision {
        return {
            templateId: null,
            title: `Improve ${skill.skillName}`,
            description: `Focus on ${skill.skillName} to close a ${skill.gap}-level gap for your selected career goal.`,
            type: RecommendationType.PRACTICE,
            roadmapPhase: skill.roadmapPhase,
            source: "DEFAULT_GENERATED",
        };
    }

    private async analyzeByStudentId(studentId: string) {
        const student = await this.prisma.student.findUnique({
            where: { id: studentId },
            select: { userId: true },
        });
        if (!student) {
            throw new NotFoundException("Student not found");
        }

        return this.analyzeCompetencyForStudentUser(student.userId, student.userId);
    }

    private async saveAnalysisWithRecommendations(input: {
        profile: StudentProfileContext;
        analyzedSkills: AnalyzedSkill[];
        completionPercent: number;
        matchPercent: number;
        matchLevel: MatchLevel;
        riskScore: number;
        totalWeight: number;
        totalSkillScore: number;
        deleteOldNewRecommendations: boolean;
    }): Promise<CompetencyAnalysisResponseDto> {
        return this.prisma.$transaction(async (tx) => {
            const analysisResult = await tx.competencyAnalysisResult.create({
                data: {
                    studentId: input.profile.studentId,
                    careerGoalId: input.profile.careerGoalId,
                    specializationId: input.profile.specializationId,
                    completionPercent: input.completionPercent,
                    matchPercent: input.matchPercent,
                    riskScore: input.riskScore,
                    matchLevel: input.matchLevel,
                    details: {
                        create: input.analyzedSkills.map((skill) => ({
                            skillId: skill.skillId,
                            currentLevel: skill.currentLevel,
                            requiredLevel: skill.requiredLevel,
                            gap: skill.gap,
                            weight: skill.weight,
                            achievedScore: skill.skillScore,
                            priorityScore: skill.priorityScore,
                            status: skill.status,
                        })),
                    },
                },
            });

            const skillsNeedingRecommendations = input.analyzedSkills.filter(
                (skill) =>
                    skill.status === AnalysisSkillStatus.MISSING ||
                    skill.status === AnalysisSkillStatus.NEED_IMPROVEMENT,
            );
            const targetSkillIds = skillsNeedingRecommendations.map(
                (skill) => skill.skillId,
            );

            if (input.deleteOldNewRecommendations && targetSkillIds.length) {
                await tx.studentRecommendation.deleteMany({
                    where: {
                        studentId: input.profile.studentId,
                        skillId: { in: targetSkillIds },
                        status: StudentRecommendationStatus.NEW,
                    },
                });
            }

            const createdRecommendations: RecommendationSummaryDto[] = [];
            const recommendationBySkillId = new Map<
                string,
                RecommendationSummaryDto
            >();

            for (const skill of skillsNeedingRecommendations) {
                const matchedTemplate =
                    await this.findBestRecommendationTemplate(tx, {
                        careerGoalId: input.profile.careerGoalId,
                        specializationId: input.profile.specializationId,
                        skillId: skill.skillId,
                        skillCategoryId: skill.categoryId,
                        requiredLevel: skill.requiredLevel,
                    });

                const decision = matchedTemplate
                    ? this.toRecommendationDecision(
                          matchedTemplate.template,
                          matchedTemplate.source,
                          skill,
                      )
                    : this.generateDefaultRecommendation(skill);
                skill.recommendation = decision;

                const recommendation = await tx.studentRecommendation.create({
                    data: {
                        studentId: input.profile.studentId,
                        analysisResultId: analysisResult.id,
                        skillId: skill.skillId,
                        recommendationTemplateId: decision.templateId,
                        roadmapPhase: decision.roadmapPhase,
                        title: decision.title,
                        description: decision.description,
                        reason: `Current level ${skill.currentLevel}/${skill.requiredLevel}; gap ${skill.gap}; priority score ${skill.priorityScore}.`,
                        priorityScore: skill.priorityScore,
                        status: StudentRecommendationStatus.NEW,
                    },
                });

                const recommendationSummary: RecommendationSummaryDto = {
                    id: recommendation.id,
                    skillId: skill.skillId,
                    skillName: skill.skillName,
                    title: decision.title,
                    description: decision.description,
                    type: decision.type,
                    roadmapPhase: decision.roadmapPhase,
                    priorityScore: skill.priorityScore,
                    source: decision.source,
                };
                createdRecommendations.push(recommendationSummary);
                recommendationBySkillId.set(
                    skill.skillId,
                    recommendationSummary,
                );
            }

            await tx.studentProfile.update({
                where: { studentId: input.profile.studentId },
                data: {
                    completionPercent: input.completionPercent,
                    matchPercent: input.matchPercent,
                    riskScore: input.riskScore,
                    lastAnalyzedAt: new Date(),
                },
            });

            return {
                analysisResultId: analysisResult.id,
                careerGoal: input.profile.careerGoalName,
                specialization: input.profile.specializationName,
                matchPercent: input.matchPercent,
                matchLevel: input.matchLevel,
                totalWeight: input.totalWeight,
                totalSkillScore: input.totalSkillScore,
                skills: input.analyzedSkills.map<AnalyzedSkillResponseDto>(
                    (skill) => ({
                        skillId: skill.skillId,
                        skillName: skill.skillName,
                        categoryName: skill.categoryName,
                        currentLevel: skill.currentLevel,
                        requiredLevel: skill.requiredLevel,
                        gap: skill.gap,
                        weight: skill.weight,
                        skillScore: skill.skillScore,
                        priorityScore: skill.priorityScore,
                        status: skill.status,
                        recommendation:
                            recommendationBySkillId.get(skill.skillId) ?? null,
                    }),
                ),
                recommendations: createdRecommendations.sort(
                    (a, b) => b.priorityScore - a.priorityScore,
                ),
            };
        });
    }

    private async findTemplateByScope(
        tx: Prisma.TransactionClient,
        scope: Prisma.RecommendationTemplateWhereInput,
        level: SkillLevel,
    ) {
        const templates = await tx.recommendationTemplate.findMany({
            where: {
                ...scope,
                status: TemplateStatus.ACTIVE,
            },
            orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
        });

        return (
            templates.find((template) => template.level === level) ??
            templates.find((template) => template.level === null) ??
            templates[0] ??
            null
        );
    }

    private toRecommendationDecision(
        template: RecommendationTemplate,
        source: RecommendationSource,
        skill: AnalyzedSkill,
    ): RecommendationDecision {
        return {
            templateId: template.id,
            title: template.title,
            description: template.description,
            type: template.recommendationType,
            roadmapPhase: template.roadmapPhase ?? skill.roadmapPhase,
            source,
        };
    }

    private resolveSkillStatus(currentLevel: number, requiredLevel: number) {
        if (currentLevel >= requiredLevel) {
            return AnalysisSkillStatus.ACHIEVED;
        }
        if (currentLevel > 0) {
            return AnalysisSkillStatus.NEED_IMPROVEMENT;
        }

        return AnalysisSkillStatus.MISSING;
    }

    private resolveMatchLevel(matchPercent: number) {
        if (matchPercent < 40) {
            return MatchLevel.NOT_MATCHED;
        }
        if (matchPercent < 70) {
            return MatchLevel.DEVELOPING;
        }
        if (matchPercent < 85) {
            return MatchLevel.GOOD_MATCH;
        }

        return MatchLevel.STRONG_MATCH;
    }

    private calculateRiskScore(
        completionPercent: number,
        matchPercent: number,
        details: AnalyzedSkill[],
    ) {
        let riskScore = 0;
        if (completionPercent < 50) {
            riskScore += 25;
        }
        if (matchPercent < 40) {
            riskScore += 25;
        }
        if (details.every((detail) => detail.currentLevel <= 0)) {
            riskScore += 20;
        }

        return Math.min(riskScore, 100);
    }

    private toSkillLevel(requiredLevel: number) {
        if (requiredLevel <= 0) {
            return SkillLevel.ZERO;
        }
        if (requiredLevel === 1) {
            return SkillLevel.BASIC;
        }
        if (requiredLevel === 2) {
            return SkillLevel.INTERMEDIATE;
        }

        return SkillLevel.GOOD;
    }

    private async calculateCompletionPercent(
        studentId: string,
        careerGoalId?: string | null,
        specializationId?: string | null,
        requiredSkillIds: string[] = [],
    ) {
        const [
            student,
            skills,
            projects,
            certificates,
            activities,
            experiences,
            evidenceCompletionScore,
        ] = await Promise.all([
            this.prisma.student.findUnique({ where: { id: studentId } }),
            this.prisma.studentSkill.count({ where: { studentId } }),
            this.prisma.studentProject.count({ where: { studentId } }),
            this.prisma.studentCertificate.count({ where: { studentId } }),
            this.prisma.studentActivity.count({ where: { studentId } }),
            this.prisma.studentExperience.count({ where: { studentId } }),
            this.calculateEvidenceCompletionScore({
                studentId,
                careerGoalId,
                specializationId,
                requiredSkillIds,
            }),
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
        percent += evidenceCompletionScore;

        return this.round(Math.min(percent, 100));
    }

    private async calculateEvidenceCompletionScore(input: {
        studentId: string;
        careerGoalId?: string | null;
        specializationId?: string | null;
        requiredSkillIds: string[];
    }) {
        const evidences = await this.prisma.evidence.findMany({
            where: { studentId: input.studentId },
            select: {
                status: true,
                relatedEntityType: true,
                relatedEntityId: true,
            },
        });

        if (!evidences.length) {
            return 0;
        }

        const scopedEvidences = await this.filterEvidencesByAnalysisScope(
            evidences,
            input,
        );
        const weightedEvidenceScore = scopedEvidences.reduce(
            (sum, evidence) => sum + this.getEvidenceStatusWeight(evidence.status),
            0,
        );

        return this.round(
            Math.min(weightedEvidenceScore, 1) * EVIDENCE_COMPLETION_POINTS,
        );
    }

    private async filterEvidencesByAnalysisScope(
        evidences: Array<{
            status: EvidenceStatus;
            relatedEntityType: EvidenceEntityType;
            relatedEntityId: string;
        }>,
        input: {
            studentId: string;
            careerGoalId?: string | null;
            specializationId?: string | null;
            requiredSkillIds: string[];
        },
    ) {
        const requiredSkillIds = Array.from(new Set(input.requiredSkillIds));
        const [scopedStudentSkills, scopedRoadmapItems] = await Promise.all([
            requiredSkillIds.length
                ? this.prisma.studentSkill.findMany({
                      where: {
                          studentId: input.studentId,
                          skillId: { in: requiredSkillIds },
                      },
                      select: { id: true },
                  })
                : Promise.resolve([]),
            input.careerGoalId
                ? this.prisma.roadmapItem.findMany({
                      where: {
                          roadmap: {
                              studentId: input.studentId,
                              careerGoalId: input.careerGoalId,
                              specializationId: input.specializationId ?? null,
                          },
                      },
                      select: { id: true },
                  })
                : Promise.resolve([]),
        ]);
        const scopedStudentSkillIds = new Set(
            scopedStudentSkills.map((skill) => skill.id),
        );
        const scopedRoadmapItemIds = new Set(
            scopedRoadmapItems.map((item) => item.id),
        );

        return evidences.filter((evidence) => {
            switch (evidence.relatedEntityType) {
                case EvidenceEntityType.SKILL:
                    return scopedStudentSkillIds.has(evidence.relatedEntityId);
                case EvidenceEntityType.ROADMAP_ITEM:
                    return scopedRoadmapItemIds.has(evidence.relatedEntityId);
                case EvidenceEntityType.PROJECT:
                case EvidenceEntityType.CERTIFICATE:
                case EvidenceEntityType.ACTIVITY:
                case EvidenceEntityType.EXPERIENCE:
                    return true;
                default:
                    return false;
            }
        });
    }

    private getEvidenceStatusWeight(status: EvidenceStatus) {
        switch (status) {
            case EvidenceStatus.VERIFIED:
                return VERIFIED_EVIDENCE_WEIGHT;
            case EvidenceStatus.PENDING:
                return PENDING_EVIDENCE_WEIGHT;
            case EvidenceStatus.REJECTED:
                return REJECTED_EVIDENCE_WEIGHT;
            default:
                return 0;
        }
    }

    private async getStudentIdByUserId(userId: string) {
        const student = await this.prisma.student.findUnique({
            where: { userId },
            select: { id: true },
        });
        if (!student) {
            throw new ForbiddenException("Current user is not a student");
        }

        return student.id;
    }

    private round(value: number) {
        return Math.round(value * 100) / 100;
    }
}
