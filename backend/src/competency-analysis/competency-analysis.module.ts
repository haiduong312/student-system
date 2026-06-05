import { Module } from '@nestjs/common';
import { CompetencyAnalysisController } from './competency-analysis.controller';
import { CompetencyAnalysisService } from './competency-analysis.service';
import { CompetencyAnalysisEngine } from './domain/competency-analysis.engine';

@Module({
  controllers: [CompetencyAnalysisController],
  providers: [CompetencyAnalysisService, CompetencyAnalysisEngine],
  exports: [CompetencyAnalysisService],
})
export class CompetencyAnalysisModule {}
