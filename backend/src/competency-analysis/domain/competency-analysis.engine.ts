import { Injectable } from '@nestjs/common';
import { AnalysisSkillStatus, MatchLevel } from '@prisma/client';
import {
  AnalysisDetailOutput,
  CompetencyAnalysisOutput,
  RequiredSkillInput,
  StudentSkillInput,
} from './competency-analysis.types';

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
    const totalWeight = requiredSkills.reduce((sum, item) => sum + item.weight, 0);

    const details = requiredSkills.map<AnalysisDetailOutput>((requiredSkill) => {
      const currentLevel = studentSkillMap.get(requiredSkill.skillId) ?? 0;
      const achievedScore =
        requiredSkill.requiredLevel <= 0
          ? this.round(requiredSkill.weight)
          : this.round(
              Math.min(currentLevel / requiredSkill.requiredLevel, 1) *
                requiredSkill.weight,
            );
      const rawGap = requiredSkill.requiredLevel - currentLevel;
      const gap = Math.max(rawGap, 0);
      const priorityScore = this.round(gap * requiredSkill.weight);

      return {
        skillId: requiredSkill.skillId,
        skillName: requiredSkill.skillName,
        currentLevel,
        requiredLevel: requiredSkill.requiredLevel,
        gap,
        weight: requiredSkill.weight,
        achievedScore,
        priorityScore,
        status: this.resolveDetailStatus(currentLevel, requiredSkill.requiredLevel),
        learningOrder: requiredSkill.learningOrder,
      };
    });

    const totalSkillScore = details.reduce((sum, item) => sum + item.achievedScore, 0);
    const matchPercent = totalWeight > 0 ? this.round((totalSkillScore / totalWeight) * 100) : 0;
    const missingSkills = details
      .filter((detail) => detail.gap > 0)
      .sort((a, b) => {
        if (b.priorityScore !== a.priorityScore) {
          return b.priorityScore - a.priorityScore;
        }

        return a.learningOrder - b.learningOrder;
      });

    return {
      completionPercent: this.round(completionPercent),
      matchPercent,
      riskScore: this.calculateRiskScore(completionPercent, matchPercent, details),
      matchLevel: this.resolveMatchLevel(matchPercent),
      details,
      missingSkills,
    };
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

  private round(value: number) {
    return Math.round(value * 100) / 100;
  }
}
