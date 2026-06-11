import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, ValidateNested } from 'class-validator';
import {
  CreateAssessmentOptionDto,
  CreateAssessmentQuestionDto,
} from './create-assessment-question.dto';

export class UpdateAssessmentQuestionDto extends PartialType(
  CreateAssessmentQuestionDto,
) {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateAssessmentOptionDto)
  options?: CreateAssessmentOptionDto[];
}
