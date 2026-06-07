import { AnalysisSkillStatus, MatchLevel } from '@prisma/client';

export interface RequiredSkillInput {
  skillId: string;
  skillName: string;
  requiredLevel: number;
  weight: number;
  learningOrder: number;
  isRequired: boolean;
}

export interface StudentSkillInput {
  skillId: string;
  currentLevel: number;
}

export interface AnalysisDetailOutput {
  skillId: string;
  skillName: string;
  currentLevel: number;
  requiredLevel: number;
  gap: number;
  weight: number;
  achievedScore: number;
  priorityScore: number;
  status: AnalysisSkillStatus;
  learningOrder: number;
}

export interface CompetencyAnalysisOutput {
  completionPercent: number;
  matchPercent: number;
  riskScore: number;
  matchLevel: MatchLevel;
  details: AnalysisDetailOutput[];
  missingSkills: AnalysisDetailOutput[];
}
