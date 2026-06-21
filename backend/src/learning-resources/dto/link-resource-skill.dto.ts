import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoadmapPhase, SkillLevel } from '@prisma/client';

export class LinkResourceSkillDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  skillId: string;

  @ApiPropertyOptional({ enum: SkillLevel })
  @IsOptional()
  @IsEnum(SkillLevel)
  targetLevel?: SkillLevel | null;

  @ApiPropertyOptional({ enum: RoadmapPhase })
  @IsOptional()
  @IsEnum(RoadmapPhase)
  roadmapPhase?: RoadmapPhase | null;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  relevanceScore?: number;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  orderIndex?: number;
}
