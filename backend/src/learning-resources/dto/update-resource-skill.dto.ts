import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RoadmapPhase, SkillLevel } from '@prisma/client';

export class UpdateResourceSkillDto {
  @ApiPropertyOptional({
    enum: SkillLevel,
    description:
      'Use this when the resource has multiple links for the same skill.',
  })
  @IsOptional()
  @IsEnum(SkillLevel)
  currentTargetLevel?: SkillLevel | null;

  @ApiPropertyOptional({ enum: SkillLevel })
  @IsOptional()
  @IsEnum(SkillLevel)
  targetLevel?: SkillLevel | null;

  @ApiPropertyOptional({ enum: RoadmapPhase })
  @IsOptional()
  @IsEnum(RoadmapPhase)
  roadmapPhase?: RoadmapPhase | null;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  relevanceScore?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  orderIndex?: number;
}
