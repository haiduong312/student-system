import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateCareerRequiredSkillDto {
  @ApiProperty()
  @IsString()
  skillId: string;

  @ApiProperty({ minimum: 0, maximum: 3, example: 2 })
  @IsInt()
  @Min(0)
  @Max(3)
  requiredLevel: number;

  @ApiProperty({ minimum: 0, example: 20 })
  @IsNumber()
  @Min(0)
  weight: number;

  @ApiPropertyOptional({ minimum: 0, example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  learningOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}
