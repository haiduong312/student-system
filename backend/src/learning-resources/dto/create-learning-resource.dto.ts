import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CatalogStatus,
  DifficultyLevel,
  LearningResourceType,
} from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateLearningResourceDto {
  @ApiProperty({ example: 'JavaScript Fundamentals' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'A beginner-friendly course for JavaScript.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiProperty({ enum: LearningResourceType })
  @IsEnum(LearningResourceType)
  resourceType: LearningResourceType;

  @ApiPropertyOptional({ example: 'https://example.com/course/javascript' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  url?: string | null;

  @ApiPropertyOptional({ example: 'Coursera' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  provider?: string | null;

  @ApiPropertyOptional({ enum: DifficultyLevel })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficultyLevel?: DifficultyLevel | null;

  @ApiPropertyOptional({ example: '2-3 weeks' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  estimatedDuration?: string | null;

  @ApiPropertyOptional({ example: 'vi' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  language?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @ApiPropertyOptional({ enum: CatalogStatus, default: CatalogStatus.ACTIVE })
  @IsOptional()
  @IsEnum(CatalogStatus)
  status?: CatalogStatus;
}
