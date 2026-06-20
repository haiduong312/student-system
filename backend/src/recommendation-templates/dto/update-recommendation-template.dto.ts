import { PartialType } from '@nestjs/swagger';
import { CreateRecommendationTemplateDto } from './create-recommendation-template.dto';

export class UpdateRecommendationTemplateDto extends PartialType(
  CreateRecommendationTemplateDto,
) {}
