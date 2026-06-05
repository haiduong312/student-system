import { ApiProperty } from '@nestjs/swagger';
import { StudentRecommendationStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateRecommendationStatusDto {
  @ApiProperty({ enum: StudentRecommendationStatus })
  @IsEnum(StudentRecommendationStatus)
  status: StudentRecommendationStatus;
}
