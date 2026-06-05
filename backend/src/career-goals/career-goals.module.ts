import { Module } from '@nestjs/common';
import { CareerGoalsController } from './career-goals.controller';
import { CareerGoalsService } from './career-goals.service';

@Module({
  controllers: [CareerGoalsController],
  providers: [CareerGoalsService],
  exports: [CareerGoalsService],
})
export class CareerGoalsModule {}
