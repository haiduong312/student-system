import { Injectable } from '@nestjs/common';
import { AnalysisSkillStatus, EvidenceStatus, MatchLevel } from '@prisma/client';
import {
  AnalysisDetailOutput,
  CompletionPercentInput,
  CompetencyAnalysisOutput,
  OverallCompetencyScoreOutput,
  RequiredSkillInput,
  StudentSkillInput,
} from './competency-analysis.types';

const EVIDENCE_COMPLETION_POINTS = 15;
const VERIFIED_EVIDENCE_WEIGHT = 1;
const PENDING_EVIDENCE_WEIGHT = 0.3;
const REJECTED_EVIDENCE_WEIGHT = 0;

@Injectable()
export class CompetencyAnalysisEngine {
  analyze(
    requiredSkills: RequiredSkillInput[],
    studentSkills: StudentSkillInput[],
    completionPercent: number,
  ): CompetencyAnalysisOutput {
    const studentSkillMap = new Map(
      studentSkills.map((skill) => [skill.skillId, skill.currentLevel]),
    );
    const details = requiredSkills.map<AnalysisDetailOutput>((requiredSkill) =>
      this.analyzeSkillGap(
        requiredSkill,
        studentSkillMap.get(requiredSkill.skillId) ?? 0,
      ),
    );
    const roundedCompletionPercent = this.round(completionPercent);
    const overallScore = this.calculateOverallCompetencyScore(details);
    const missingSkills = details
      .filter((detail) => detail.gap > 0)
      .sort((a, b) => {
        if (b.priorityScore !== a.priorityScore) {
          return b.priorityScore - a.priorityScore;
        }

        return a.learningOrder - b.learningOrder;
      });

    return {
      completionPercent: roundedCompletionPercent,
      matchPercent: overallScore.matchPercent,
      riskScore: this.calculateRiskScore(
        roundedCompletionPercent,
        overallScore.matchPercent,
        details,
      ),
      matchLevel: overallScore.matchLevel,
      totalWeight: overallScore.totalWeight,
      totalSkillScore: overallScore.totalSkillScore,
      details,
      missingSkills,
    };
  }

  analyzeSkillGap(
    requiredSkill: RequiredSkillInput,
    currentLevel: number,
  ): AnalysisDetailOutput {
    const gap = this.calculateGapScore(currentLevel, requiredSkill.requiredLevel);

    return {
      skillId: requiredSkill.skillId,
      skillName: requiredSkill.skillName,
      currentLevel,
      requiredLevel: requiredSkill.requiredLevel,
      gap,
      weight: requiredSkill.weight,
      achievedScore: this.calculateAchievedScore(
        currentLevel,
        requiredSkill.requiredLevel,
        requiredSkill.weight,
      ),
      priorityScore: this.calculatePriorityScore(gap, requiredSkill.weight),
      status: this.resolveDetailStatus(currentLevel, requiredSkill.requiredLevel),
      learningOrder: requiredSkill.learningOrder,
    };
  }

  calculateGapScore(currentLevel: number, requiredLevel: number) {
    return Math.max(requiredLevel - currentLevel, 0);
  }

  calculatePriorityScore(gap: number, weight: number) {
    return this.round(gap * weight);
  }

  calculateOverallCompetencyScore(
    details: AnalysisDetailOutput[],
  ): OverallCompetencyScoreOutput {
    const totalWeight = this.round(
      details.reduce((sum, item) => sum + item.weight, 0),
    );
    const totalSkillScore = this.round(
      details.reduce((sum, item) => sum + item.achievedScore, 0),
    );
    const matchPercent =
      totalWeight > 0
        ? this.round((totalSkillScore / totalWeight) * 100)
        : 0;

    return {
      totalWeight,
      totalSkillScore,
      matchPercent,
      matchLevel: this.resolveMatchLevel(matchPercent),
    };
  }

  calculateCompletionPercent(input: CompletionPercentInput) {
    let percent = 0;
    if (input.hasBasicProfile) {
      percent += 10;
    }
    if (input.hasCareerGoal) {
      percent += 15;
    }
    if (input.skillCount > 0) {
      percent += 20;
    }
    if (input.projectCount > 0) {
      percent += 20;
    }
    if (input.certificateCount > 0) {
      percent += 10;
    }
    if (input.activityCount > 0 || input.experienceCount > 0) {
      percent += 10;
    }
    percent += this.calculateEvidenceCompletionScore(input.evidenceStatuses);

    return this.round(Math.min(percent, 100));
  }

  calculateEvidenceCompletionScore(evidenceStatuses: EvidenceStatus[]) {
    const weightedEvidenceScore = evidenceStatuses.reduce(
      (sum, status) => sum + this.getEvidenceStatusWeight(status),
      0,
    );

    return this.round(
      Math.min(weightedEvidenceScore, 1) * EVIDENCE_COMPLETION_POINTS,
    );
  }

  private calculateAchievedScore(
    currentLevel: number,
    requiredLevel: number,
    weight: number,
  ) {
    return requiredLevel <= 0
      ? this.round(weight)
      : this.round(Math.min(currentLevel / requiredLevel, 1) * weight);
  }

  private resolveDetailStatus(currentLevel: number, requiredLevel: number) {
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
    details: AnalysisDetailOutput[],
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

  private round(value: number) {
    return Math.round(value * 100) / 100;
  }
}
