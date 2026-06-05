import { Module } from '@nestjs/common';
import { AdvisorAssignmentsController } from './advisor-assignments.controller';
import { AdvisorAssignmentsService } from './advisor-assignments.service';

@Module({
  controllers: [AdvisorAssignmentsController],
  providers: [AdvisorAssignmentsService],
  exports: [AdvisorAssignmentsService],
})
export class AdvisorAssignmentsModule {}
