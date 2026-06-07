import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class AnalyzeCompetencyDto {
  @ApiPropertyOptional({
    default: true,
    description:
      'Delete old NEW recommendations for the same missing skills before generating fresh recommendations.',
  })
  @IsOptional()
  @IsBoolean()
  deleteOldNewRecommendations?: boolean = true;
}
