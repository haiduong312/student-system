import { ApiPropertyOptional } from '@nestjs/swagger';
import { RoadmapStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination.dto';

export class RoadmapQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: RoadmapStatus })
  @IsOptional()
  @IsEnum(RoadmapStatus)
  status?: RoadmapStatus;
}
