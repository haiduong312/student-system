import { Module } from '@nestjs/common';
import { StudentAccessPolicyModule } from '../common/student-access/student-access-policy.module';
import { CompetencyAnalysisController } from './competency-analysis.controller';
import { CompetencyAnalysisService } from './competency-analysis.service';
import { CompetencyAnalysisEngine } from './domain/competency-analysis.engine';

@Module({
  imports: [StudentAccessPolicyModule],
  controllers: [CompetencyAnalysisController],
  providers: [CompetencyAnalysisService, CompetencyAnalysisEngine],
  exports: [CompetencyAnalysisService],
})
export class CompetencyAnalysisModule {}
