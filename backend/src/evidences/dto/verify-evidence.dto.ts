import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class VerifyEvidenceDto {
  @ApiPropertyOptional({
    minimum: 0,
    maximum: 3,
    description: 'Verified level to apply when the evidence belongs to a skill.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  currentLevel?: number;
}
