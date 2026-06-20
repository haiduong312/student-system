import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class StartAssessmentDto {
  @ApiPropertyOptional({
    deprecated: true,
    description:
      'Deprecated. The assessment career goal is always resolved from the current student profile.',
  })
  @IsOptional()
  @IsString()
  careerGoalId?: string;
}
