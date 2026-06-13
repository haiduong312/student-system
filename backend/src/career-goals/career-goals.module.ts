import { Module } from '@nestjs/common';
import { CareerGoalsController } from './career-goals.controller';
import { CareerGoalsService } from './career-goals.service';
import {
  AdminSpecializationsController,
  PublicCareerGoalSpecializationsController,
} from './specializations.controller';
import { SpecializationsService } from './specializations.service';

@Module({
  controllers: [
    CareerGoalsController,
    AdminSpecializationsController,
    PublicCareerGoalSpecializationsController,
  ],
  providers: [CareerGoalsService, SpecializationsService],
  exports: [CareerGoalsService, SpecializationsService],
})
export class CareerGoalsModule {}
