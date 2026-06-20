import { Module } from '@nestjs/common';
import { RecommendationTemplatesController } from './recommendation-templates.controller';
import { RecommendationTemplatesService } from './recommendation-templates.service';

@Module({
  controllers: [RecommendationTemplatesController],
  providers: [RecommendationTemplatesService],
  exports: [RecommendationTemplatesService],
})
export class RecommendationTemplatesModule {}
