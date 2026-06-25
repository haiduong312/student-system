import { Injectable } from '@nestjs/common';
import {
  AnalysisResultStatus,
  AssessmentStatus,
  Prisma,
  RoadmapStatus,
  StudentRecommendationStatus,
  TemplateStatus,
} from '@prisma/client';

const RECOMMENDATION_STATUSES_TO_OBSOLETE = [
  StudentRecommendationStatus.NEW,
  StudentRecommendationStatus.SAVED,
  StudentRecommendationStatus.IN_PROGRESS,
  StudentRecommendationStatus.DONE,
];

interface CareerContextScope {
  careerGoalId: string;
  specializationId?: string | null;
  includeSpecializations?: boolean;
}

interface CareerContextWhere {
  careerGoalId: string;
  specializationId?: string | null;
}

interface CatalogInvalidationResult {
  analyses: number;
  recommendations: number;
  roadmaps: number;
  assessments: number;
  profiles: number;
}

@Injectable()
export class CatalogContextInvalidationService {
  async invalidateCareerContext(
    tx: Prisma.TransactionClient,
    scope: CareerContextScope,
  ): Promise<CatalogInvalidationResult> {
    const scopeWhere = this.buildScopeWhere(scope);
    const profileWhere = this.buildProfileScopeWhere(scope);
    const currentAnalyses = await tx.competencyAnalysisResult.findMany({
      where: {
        ...scopeWhere,
        status: AnalysisResultStatus.CURRENT,
      },
      select: { id: true },
    });
    const currentAnalysisIds = currentAnalyses.map((analysis) => analysis.id);

    const [
      analyses,
      analysisRecommendations,
      templateRecommendations,
      roadmaps,
      assessments,
      profiles,
    ] = await Promise.all([
      currentAnalysisIds.length
        ? tx.competencyAnalysisResult.updateMany({
            where: {
              id: { in: currentAnalysisIds },
              status: AnalysisResultStatus.CURRENT,
            },
            data: { status: AnalysisResultStatus.OBSOLETE },
          })
        : Promise.resolve({ count: 0 }),
      currentAnalysisIds.length
        ? tx.studentRecommendation.updateMany({
            where: {
              analysisResultId: { in: currentAnalysisIds },
              status: { in: RECOMMENDATION_STATUSES_TO_OBSOLETE },
            },
            data: { status: StudentRecommendationStatus.OBSOLETE },
          })
        : Promise.resolve({ count: 0 }),
      tx.studentRecommendation.updateMany({
        where: {
          analysisResultId: null,
          status: { in: RECOMMENDATION_STATUSES_TO_OBSOLETE },
          student: {
            profile: profileWhere,
          },
          recommendationTemplate: {
            ...this.buildTemplateScopeWhere(scope),
            status: TemplateStatus.ACTIVE,
          },
        },
        data: { status: StudentRecommendationStatus.OBSOLETE },
      }),
      tx.developmentRoadmap.updateMany({
        where: {
          ...scopeWhere,
          status: RoadmapStatus.ACTIVE,
        },
        data: { status: RoadmapStatus.ARCHIVED },
      }),
      tx.assessment.updateMany({
        where: {
          ...scopeWhere,
          status: AssessmentStatus.IN_PROGRESS,
        },
        data: { status: AssessmentStatus.CANCELLED },
      }),
      tx.studentProfile.updateMany({
        where: profileWhere,
        data: {
          matchPercent: 0,
          riskScore: 0,
          lastAnalyzedAt: null,
        },
      }),
    ]);

    return {
      analyses: analyses.count,
      recommendations:
        analysisRecommendations.count + templateRecommendations.count,
      roadmaps: roadmaps.count,
      assessments: assessments.count,
      profiles: profiles.count,
    };
  }

  async invalidateCareerRequiredSkillChange(
    tx: Prisma.TransactionClient,
    input: {
      careerGoalId: string;
      specializationId?: string | null;
    },
  ) {
    return this.invalidateCareerContext(tx, {
      careerGoalId: input.careerGoalId,
      specializationId: input.specializationId ?? null,
      includeSpecializations: !input.specializationId,
    });
  }

  async invalidateSkillCatalogChange(
    tx: Prisma.TransactionClient,
    skillId: string,
  ) {
    const requiredSkills = await tx.careerRequiredSkill.findMany({
      where: { skillId },
      select: {
        careerGoalId: true,
        specializationId: true,
      },
    });

    const scopes = this.dedupeScopes(
      requiredSkills.map((requiredSkill) => ({
        careerGoalId: requiredSkill.careerGoalId,
        specializationId: requiredSkill.specializationId,
        includeSpecializations: !requiredSkill.specializationId,
      })),
    );

    const results: CatalogInvalidationResult[] = [];
    for (const scope of scopes) {
      results.push(await this.invalidateCareerContext(tx, scope));
    }

    return this.sumResults(results);
  }

  cancelInProgressAssessmentsUsingQuestion(
    tx: Prisma.TransactionClient,
    questionId: string,
  ) {
    return tx.assessment.updateMany({
      where: {
        status: AssessmentStatus.IN_PROGRESS,
        items: { some: { questionId } },
      },
      data: { status: AssessmentStatus.CANCELLED },
    });
  }

  private buildScopeWhere(
    scope: CareerContextScope,
  ): CareerContextWhere {
    if (scope.includeSpecializations) {
      return { careerGoalId: scope.careerGoalId };
    }

    return {
      careerGoalId: scope.careerGoalId,
      specializationId: scope.specializationId ?? null,
    };
  }

  private buildProfileScopeWhere(
    scope: CareerContextScope,
  ): Prisma.StudentProfileWhereInput {
    if (scope.includeSpecializations) {
      return { careerGoalId: scope.careerGoalId };
    }

    return {
      careerGoalId: scope.careerGoalId,
      specializationId: scope.specializationId ?? null,
    };
  }

  private buildTemplateScopeWhere(
    scope: CareerContextScope,
  ): Prisma.RecommendationTemplateWhereInput {
    if (scope.includeSpecializations) {
      return { careerGoalId: scope.careerGoalId };
    }

    return {
      careerGoalId: scope.careerGoalId,
      OR: scope.specializationId
        ? [{ specializationId: scope.specializationId }, { specializationId: null }]
        : [{ specializationId: null }],
    };
  }

  private dedupeScopes(scopes: CareerContextScope[]) {
    const careerWideScopes = new Set(
      scopes
        .filter((scope) => scope.includeSpecializations)
        .map((scope) => scope.careerGoalId),
    );
    const byKey = new Map<string, CareerContextScope>();

    for (const scope of scopes) {
      if (!scope.includeSpecializations && careerWideScopes.has(scope.careerGoalId)) {
        continue;
      }

      const key = scope.includeSpecializations
        ? `${scope.careerGoalId}:*`
        : `${scope.careerGoalId}:${scope.specializationId ?? 'null'}`;
      byKey.set(key, scope);
    }

    return Array.from(byKey.values());
  }

  private sumResults(
    results: CatalogInvalidationResult[],
  ) {
    return results.reduce(
      (total, result) => ({
        analyses: total.analyses + result.analyses,
        recommendations: total.recommendations + result.recommendations,
        roadmaps: total.roadmaps + result.roadmaps,
        assessments: total.assessments + result.assessments,
        profiles: total.profiles + result.profiles,
      }),
      {
        analyses: 0,
        recommendations: 0,
        roadmaps: 0,
        assessments: 0,
        profiles: 0,
      },
    );
  }
}
