import { Module } from '@nestjs/common';
import { CompetencyAnalysisModule } from '../competency-analysis/competency-analysis.module';
import { RoadmapBuilderService } from './domain/roadmap-builder.service';
import { RoadmapsController } from './roadmaps.controller';
import { RoadmapsService } from './roadmaps.service';

@Module({
  imports: [CompetencyAnalysisModule],
  controllers: [RoadmapsController],
  providers: [RoadmapsService, RoadmapBuilderService],
  exports: [RoadmapsService],
})
export class RoadmapsModule {}
