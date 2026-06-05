import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoadmapItemStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateRoadmapItemStatusDto {
  @ApiProperty({ enum: RoadmapItemStatus })
  @IsEnum(RoadmapItemStatus)
  status: RoadmapItemStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
