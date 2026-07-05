import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AnalysisSkillStatus,
  MatchLevel,
  RecommendationType,
  RoadmapPhase,
} from '@prisma/client';

export class RecommendationSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  skillId: string;

  @ApiProperty()
  skillName: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional({ nullable: true })
  description: string | null;

  @ApiProperty({ enum: RecommendationType })
  type: RecommendationType;

  @ApiProperty({ enum: RoadmapPhase })
  roadmapPhase: RoadmapPhase;

  @ApiProperty()
  priorityScore: number;

  @ApiProperty({
    enum: [
      'SPECIALIZATION_CAREER_SKILL_TEMPLATE',
      'CAREER_SKILL_TEMPLATE',
      'CATEGORY_SKILL_TEMPLATE',
      'SKILL_TEMPLATE',
      'DEFAULT_GENERATED',
    ],
  })
  source:
    | 'SPECIALIZATION_CAREER_SKILL_TEMPLATE'
    | 'CAREER_SKILL_TEMPLATE'
    | 'CATEGORY_SKILL_TEMPLATE'
    | 'SKILL_TEMPLATE'
    | 'DEFAULT_GENERATED';
}

export class AnalyzedSkillResponseDto {
  @ApiProperty()
  skillId: string;

  @ApiProperty()
  skillName: string;

  @ApiPropertyOptional({ nullable: true })
  categoryName: string | null;

  @ApiProperty()
  currentLevel: number;

  @ApiProperty()
  requiredLevel: number;

  @ApiProperty()
  gap: number;

  @ApiProperty()
  weight: number;

  @ApiProperty()
  skillScore: number;

  @ApiProperty()
  priorityScore: number;

  @ApiProperty({ enum: AnalysisSkillStatus })
  status: AnalysisSkillStatus;

  @ApiPropertyOptional({ type: RecommendationSummaryDto, nullable: true })
  recommendation: RecommendationSummaryDto | null;
}

export class CompetencyAnalysisResponseDto {
  @ApiProperty()
  analysisResultId: string;

  @ApiProperty()
  careerGoal: string;

  @ApiPropertyOptional({ nullable: true })
  specialization: string | null;

  @ApiProperty()
  matchPercent: number;

  @ApiProperty()
  completionPercent: number;

  @ApiProperty()
  riskScore: number;

  @ApiProperty({ enum: MatchLevel })
  matchLevel: MatchLevel;

  @ApiProperty()
  totalWeight: number;

  @ApiProperty()
  totalSkillScore: number;

  @ApiProperty({ type: [AnalyzedSkillResponseDto] })
  skills: AnalyzedSkillResponseDto[];

  @ApiProperty({ type: [RecommendationSummaryDto] })
  recommendations: RecommendationSummaryDto[];
}
