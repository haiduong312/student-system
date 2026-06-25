import { Module } from '@nestjs/common';
import { CatalogContextInvalidationModule } from '../common/catalog-invalidation/catalog-context-invalidation.module';
import { AssessmentQuestionsController } from './assessment-questions.controller';
import { AssessmentQuestionsService } from './assessment-questions.service';

@Module({
  imports: [CatalogContextInvalidationModule],
  controllers: [AssessmentQuestionsController],
  providers: [AssessmentQuestionsService],
  exports: [AssessmentQuestionsService],
})
export class AssessmentQuestionsModule {}
