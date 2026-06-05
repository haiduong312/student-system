import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateStudentSkillDto {
  @ApiProperty()
  @IsString()
  skillId: string;

  @ApiProperty({ minimum: 0, maximum: 3, example: 2 })
  @IsInt()
  @Min(0)
  @Max(3)
  currentLevel: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class UpdateStudentSkillDto extends PartialType(CreateStudentSkillDto) {}
