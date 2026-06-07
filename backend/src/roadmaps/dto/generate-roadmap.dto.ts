import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class GenerateRoadmapDto {
  @ApiPropertyOptional({
    default: true,
    description:
      'Archive the current active roadmap before creating a new version. If false and an active roadmap exists, generation is rejected.',
  })
  @IsOptional()
  @IsBoolean()
  archiveCurrentActiveRoadmap?: boolean = true;
}
