import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  CatalogStatus,
  DifficultyLevel,
  LearningResourceType,
} from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination.dto';

export class LearningResourceQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CatalogStatus })
  @IsOptional()
  @IsEnum(CatalogStatus)
  status?: CatalogStatus;

  @ApiPropertyOptional({ enum: LearningResourceType })
  @IsOptional()
  @IsEnum(LearningResourceType)
  resourceType?: LearningResourceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  skillId?: string;

  @ApiPropertyOptional({ enum: DifficultyLevel })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficultyLevel?: DifficultyLevel;
}
