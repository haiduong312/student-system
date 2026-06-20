import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateAdvisorReviewDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reviewContent: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  suggestion?: string | null;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number | null;
}
