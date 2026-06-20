import { AnalysisSkillStatus, EvidenceStatus, MatchLevel } from '@prisma/client';

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
  totalWeight: number;
  totalSkillScore: number;
  details: AnalysisDetailOutput[];
  missingSkills: AnalysisDetailOutput[];
}

export interface CompletionPercentInput {
  hasBasicProfile: boolean;
  hasCareerGoal: boolean;
  skillCount: number;
  projectCount: number;
  certificateCount: number;
  activityCount: number;
  experienceCount: number;
  evidenceStatuses: EvidenceStatus[];
}

export interface OverallCompetencyScoreOutput {
  totalWeight: number;
  totalSkillScore: number;
  matchPercent: number;
  matchLevel: MatchLevel;
}
