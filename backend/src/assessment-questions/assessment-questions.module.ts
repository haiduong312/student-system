import { Module } from '@nestjs/common';
import { AssessmentQuestionsController } from './assessment-questions.controller';
import { AssessmentQuestionsService } from './assessment-questions.service';

@Module({
  controllers: [AssessmentQuestionsController],
  providers: [AssessmentQuestionsService],
  exports: [AssessmentQuestionsService],
})
export class AssessmentQuestionsModule {}
