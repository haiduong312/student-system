import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResourceProgressStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateResourceProgressDto {
  @ApiProperty({ enum: ResourceProgressStatus })
  @IsEnum(ResourceProgressStatus)
  status: ResourceProgressStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recommendationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string | null;
}
