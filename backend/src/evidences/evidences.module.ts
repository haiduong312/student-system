import { Module } from '@nestjs/common';
import { StudentAccessPolicyModule } from '../common/student-access/student-access-policy.module';
import { EvidencesController } from './evidences.controller';
import { EvidencesService } from './evidences.service';

@Module({
  imports: [StudentAccessPolicyModule],
  controllers: [EvidencesController],
  providers: [EvidencesService],
  exports: [EvidencesService],
})
export class EvidencesModule {}
