import { ApiPropertyOptional } from '@nestjs/swagger';
import { EvidenceEntityType, EvidenceStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination.dto';

export class EvidenceQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: EvidenceStatus })
  @IsOptional()
  @IsEnum(EvidenceStatus)
  status?: EvidenceStatus;

  @ApiPropertyOptional({ enum: EvidenceEntityType })
  @IsOptional()
  @IsEnum(EvidenceEntityType)
  relatedEntityType?: EvidenceEntityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  studentId?: string;
}
