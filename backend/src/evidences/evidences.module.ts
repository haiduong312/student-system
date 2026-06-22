import { Module } from '@nestjs/common';
import { EvidenceVerificationService } from '../common/evidence-verification/evidence-verification.service';
import { StudentAccessPolicyModule } from '../common/student-access/student-access-policy.module';
import { EvidencesController } from './evidences.controller';
import { EvidencesService } from './evidences.service';

@Module({
  imports: [StudentAccessPolicyModule],
  controllers: [EvidencesController],
  providers: [EvidencesService, EvidenceVerificationService],
  exports: [EvidencesService],
})
export class EvidencesModule {}
