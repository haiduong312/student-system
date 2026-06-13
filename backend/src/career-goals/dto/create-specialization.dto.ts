import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CatalogStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSpecializationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  careerGoalId: string;

  @ApiProperty({ example: 'Frontend Web' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: CatalogStatus, default: CatalogStatus.ACTIVE })
  @IsOptional()
  @IsEnum(CatalogStatus)
  status?: CatalogStatus;
}
