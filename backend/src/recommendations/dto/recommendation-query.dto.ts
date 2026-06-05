import { ApiPropertyOptional } from '@nestjs/swagger';
import { StudentRecommendationStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination.dto';

export class RecommendationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: StudentRecommendationStatus })
  @IsOptional()
  @IsEnum(StudentRecommendationStatus)
  status?: StudentRecommendationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  skillId?: string;
}
