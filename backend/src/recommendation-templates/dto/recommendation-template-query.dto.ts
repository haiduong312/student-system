import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  RecommendationType,
  RoadmapPhase,
  SkillLevel,
  TemplateStatus,
} from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination.dto';

export class RecommendationTemplateQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  skillId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  skillCategoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  careerGoalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specializationId?: string;

  @ApiPropertyOptional({ enum: SkillLevel })
  @IsOptional()
  @IsEnum(SkillLevel)
  level?: SkillLevel;

  @ApiPropertyOptional({ enum: RecommendationType })
  @IsOptional()
  @IsEnum(RecommendationType)
  recommendationType?: RecommendationType;

  @ApiPropertyOptional({ enum: RoadmapPhase })
  @IsOptional()
  @IsEnum(RoadmapPhase)
  roadmapPhase?: RoadmapPhase;

  @ApiPropertyOptional({ enum: TemplateStatus })
  @IsOptional()
  @IsEnum(TemplateStatus)
  status?: TemplateStatus;
}
