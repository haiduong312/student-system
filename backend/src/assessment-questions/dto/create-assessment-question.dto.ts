import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionStatus, QuestionType } from '@prisma/client';

export class CreateAssessmentOptionDto {
  @ApiProperty({ example: 'Tác vụ bất đồng bộ' })
  @IsString()
  @IsNotEmpty()
  optionText: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isCorrect: boolean;

  @ApiPropertyOptional({ minimum: 0, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  orderIndex?: number;
}

export class CreateAssessmentQuestionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  skillId: string;

  @ApiProperty({ example: 'Promise trong JavaScript dùng để xử lý vấn đề gì?' })
  @IsString()
  @IsNotEmpty()
  questionText: string;

  @ApiProperty({ enum: QuestionType, example: QuestionType.SINGLE_CHOICE })
  @IsEnum(QuestionType)
  questionType: QuestionType;

  @ApiProperty({ minimum: 1, example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  level: number;

  @ApiPropertyOptional({ example: 'Promise dùng để xử lý tác vụ bất đồng bộ.' })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional({ enum: QuestionStatus, default: QuestionStatus.ACTIVE })
  @IsOptional()
  @IsEnum(QuestionStatus)
  status?: QuestionStatus;

  @ApiProperty({ type: [CreateAssessmentOptionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateAssessmentOptionDto)
  options: CreateAssessmentOptionDto[];
}
