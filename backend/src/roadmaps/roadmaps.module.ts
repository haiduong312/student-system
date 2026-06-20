import { Module } from '@nestjs/common';
import { StudentAccessPolicyModule } from '../common/student-access/student-access-policy.module';
import { RoadmapsController } from './roadmaps.controller';
import { RoadmapsService } from './roadmaps.service';

@Module({
  imports: [StudentAccessPolicyModule],
  controllers: [RoadmapsController],
  providers: [RoadmapsService],
  exports: [RoadmapsService],
})
export class RoadmapsModule {}
