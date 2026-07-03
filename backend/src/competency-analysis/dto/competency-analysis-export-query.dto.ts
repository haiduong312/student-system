import { ApiPropertyOptional } from '@nestjs/swagger';
import { AnalysisResultStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CompetencyAnalysisExportQueryDto {
  @ApiPropertyOptional({ description: 'Student id. Required only when narrowing scope.' })
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional({ description: 'Career goal context id' })
  @IsOptional()
  @IsString()
  careerGoalId?: string;

  @ApiPropertyOptional({ description: 'Specialization context id' })
  @IsOptional()
  @IsString()
  specializationId?: string;

  @ApiPropertyOptional({ enum: AnalysisResultStatus })
  @IsOptional()
  @IsEnum(AnalysisResultStatus)
  status?: AnalysisResultStatus;

  @ApiPropertyOptional({
    description: 'Inclusive lower bound for analyzedAt',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Inclusive upper bound for analyzedAt',
    example: '2026-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}
