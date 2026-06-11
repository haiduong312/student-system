import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CatalogStatus, SkillType } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateSkillDto {
  @ApiPropertyOptional({ description: 'Skill category id' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ example: 'TypeScript' })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({ example: 'Typed JavaScript language skill' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: SkillType, default: SkillType.CAREER_SPECIFIC })
  @IsOptional()
  @IsEnum(SkillType)
  type?: SkillType;

  @ApiPropertyOptional({ minimum: 0, maximum: 3, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  defaultRequiredLevel?: number;

  @ApiPropertyOptional({ minimum: 0, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultWeight?: number;

  @ApiPropertyOptional({ enum: CatalogStatus, default: CatalogStatus.ACTIVE })
  @IsOptional()
  @IsEnum(CatalogStatus)
  status?: CatalogStatus;
}
