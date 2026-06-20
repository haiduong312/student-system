import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DifficultyLevel,
  RecommendationType,
  RoadmapPhase,
  SkillLevel,
  TemplateStatus,
} from '@prisma/client';

export class CreateRecommendationTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  skillId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  skillCategoryId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  careerGoalId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specializationId?: string | null;

  @ApiPropertyOptional({ enum: SkillLevel })
  @IsOptional()
  @IsEnum(SkillLevel)
  level?: SkillLevel | null;

  @ApiProperty({ enum: RecommendationType })
  @IsEnum(RecommendationType)
  recommendationType: RecommendationType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ enum: DifficultyLevel })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficultyLevel?: DifficultyLevel | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  estimatedDuration?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  resourceUrl?: string | null;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({ enum: RoadmapPhase })
  @IsOptional()
  @IsEnum(RoadmapPhase)
  roadmapPhase?: RoadmapPhase | null;

  @ApiPropertyOptional({ enum: TemplateStatus, default: TemplateStatus.ACTIVE })
  @IsOptional()
  @IsEnum(TemplateStatus)
  status?: TemplateStatus;
}
