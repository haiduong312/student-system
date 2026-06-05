import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStudentExperienceDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  companyName: string;

  @ApiProperty()
  @IsString()
  @MaxLength(150)
  position: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UpdateStudentExperienceDto extends PartialType(
  CreateStudentExperienceDto,
) {}
