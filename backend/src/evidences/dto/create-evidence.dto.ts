import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EvidenceEntityType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateEvidenceDto {
  @ApiProperty({ enum: EvidenceEntityType })
  @IsEnum(EvidenceEntityType)
  relatedEntityType: EvidenceEntityType;

  @ApiProperty()
  @IsString()
  relatedEntityId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  evidenceUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
