import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
} from 'class-validator';

export class GenerateRoadmapDto {
  @ApiPropertyOptional({
    default: true,
    description:
      'Archive the current active roadmap before creating a new version. If false and an active roadmap exists, generation is rejected.',
  })
  @IsOptional()
  @IsBoolean()
  archiveCurrentActiveRoadmap?: boolean = true;

  @ApiPropertyOptional({
    type: [String],
    maxItems: 100,
    description:
      'Actionable recommendations to exclude atomically before generating the new roadmap version.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  excludedRecommendationIds?: string[];
}
